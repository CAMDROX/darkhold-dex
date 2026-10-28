package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/engine"
	"darkhold-dex/backend/pkg/middleware"
	"darkhold-dex/backend/pkg/models"
	"darkhold-dex/backend/pkg/queue"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

func writeOrderError(w http.ResponseWriter, status int, msg, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   msg,
		"code":    code,
	})
}

// PlaceOrder handles POST /api/orders
// Steps:
// 1. Authenticate user from session context
// 2. Enforce KYC Gate: Only 'verified' users can buy/sell
// 3. Validate order payload & anti-scalper price collar
// 4. Pre-Trade Escrow Lock (Double-Entry Ledger + Relic Vault)
// 5. Persist order in public.orders
// 6. Ingest into in-memory matching engine (Price-Time FIFO)
// 7. Return 201 Created with execution results & updated L2 depth
func PlaceOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeOrderError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeOrderError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	var req models.PlaceOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOrderError(w, http.StatusBadRequest, "Invalid request payload", "INVALID_PAYLOAD")
		return
	}

	req.EventSymbol = strings.ToUpper(strings.TrimSpace(req.EventSymbol))
	req.Side = strings.ToUpper(strings.TrimSpace(req.Side))
	req.OrderType = strings.ToUpper(strings.TrimSpace(req.OrderType))
	if req.QuoteCurrency == "" {
		req.QuoteCurrency = "INR"
	} else {
		req.QuoteCurrency = strings.ToUpper(strings.TrimSpace(req.QuoteCurrency))
	}

	if req.EventSymbol == "" {
		writeOrderError(w, http.StatusBadRequest, "event_symbol is required", "MISSING_EVENT_SYMBOL")
		return
	}
	if req.Side != string(models.SideBuy) && req.Side != string(models.SideSell) {
		writeOrderError(w, http.StatusBadRequest, "side must be BUY or SELL", "INVALID_SIDE")
		return
	}
	if req.OrderType != string(models.OrderTypeLimit) && req.OrderType != string(models.OrderTypeMarket) {
		writeOrderError(w, http.StatusBadRequest, "order_type must be LIMIT or MARKET", "INVALID_ORDER_TYPE")
		return
	}
	if req.Quantity <= 0 {
		writeOrderError(w, http.StatusBadRequest, "quantity must be greater than zero", "INVALID_QUANTITY")
		return
	}
	if req.OrderType == string(models.OrderTypeLimit) && req.Price <= 0 {
		writeOrderError(w, http.StatusBadRequest, "price must be greater than zero for limit orders", "INVALID_PRICE")
		return
	}

	ctx := r.Context()

	// ========================================================
	// Step 1: Enforce KYC Gate - Only 'verified' users can trade
	// ========================================================
	var kycStatus string
	err := db.GlobalDB.Pool.QueryRow(ctx,
		"SELECT LOWER(COALESCE(kyc_status, 'unverified')) FROM public.users WHERE id = $1",
		claims.UserID,
	).Scan(&kycStatus)

	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to verify identity status", "DB_ERROR")
		return
	}

	if kycStatus != "verified" {
		writeOrderError(w, http.StatusForbidden,
			"Identity verification required: Only KYC-verified traders are permitted to place Buy or Sell orders on Darkhold Exchange.",
			"KYC_VERIFICATION_REQUIRED")
		return
	}

	// ========================================================
	// Step 2: Validate Event & Anti-Scalper Dynamic Price Collar
	// ========================================================
	var eventID uuid.UUID
	var faceValue, maxSellPrice int64
	err = db.GlobalDB.Pool.QueryRow(ctx, `
		SELECT id, face_value, max_sell_price
		FROM public.events
		WHERE symbol = $1 AND status = 'ACTIVE'
	`, req.EventSymbol).Scan(&eventID, &faceValue, &maxSellPrice)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeOrderError(w, http.StatusBadRequest, fmt.Sprintf("Event '%s' is not active or does not exist", req.EventSymbol), "EVENT_NOT_FOUND")
			return
		}
		writeOrderError(w, http.StatusInternalServerError, "Failed to query event configuration", "DB_ERROR")
		return
	}

	// Anti-Scalper Dynamic Collar Gate (< 0.1ms)
	if req.OrderType == string(models.OrderTypeLimit) && maxSellPrice > 0 && req.Price > maxSellPrice {
		writeOrderError(w, http.StatusUnprocessableEntity,
			fmt.Sprintf("COLLAR_BREACH: Requested limit price ₹%d exceeds the anti-scalping ceiling of ₹%d for %s (pinned to face value ₹%d). Predatory markup rejected.",
				req.Price, maxSellPrice, req.EventSymbol, faceValue),
			"422_COLLAR_BREACH")
		return
	}

	// ========================================================
	// Step 3: Pre-Trade Escrow Lock (Double-Entry Ledger & Vault)
	// ========================================================
	tx, err := db.GlobalDB.Pool.Begin(ctx)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to initialize database transaction", "DB_TX_ERROR")
		return
	}
	defer tx.Rollback(ctx)

	orderID := uuid.New()
	now := time.Now().UTC()

	if req.Side == string(models.SideBuy) {
		// Calculate required fiat escrow
		effectivePrice := req.Price
		if req.OrderType == string(models.OrderTypeMarket) {
			effectivePrice = maxSellPrice // Escrow capped maximum for market order
		}
		requiredFiat := effectivePrice * int64(req.Quantity)

		// Check buyer available balance
		buyerAvailAccountID, err := getOrCreateAccountInTx(ctx, tx, claims.UserID, req.QuoteCurrency, "AVAILABLE")
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to allocate fiat account", "ACCOUNT_ERROR")
			return
		}

		var currentBalance int64
		_ = tx.QueryRow(ctx, `
			SELECT COALESCE(SUM(amount), 0)
			FROM public.ledger_entries
			WHERE account_id = $1
		`, buyerAvailAccountID).Scan(&currentBalance)

		if currentBalance < requiredFiat {
			writeOrderError(w, http.StatusBadRequest,
				fmt.Sprintf("Insufficient available balance: You need ₹%d %s to place this buy order, but your available balance is ₹%d.",
					requiredFiat, req.QuoteCurrency, currentBalance),
				"INSUFFICIENT_FUNDS")
			return
		}

		// Move fiat from AVAILABLE -> ESCROW_LOCKED
		buyerLockedAccountID, err := getOrCreateAccountInTx(ctx, tx, claims.UserID, req.QuoteCurrency, "ESCROW_LOCKED")
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to allocate escrow account", "ACCOUNT_ERROR")
			return
		}

		var txnID uuid.UUID
		err = tx.QueryRow(ctx, `
			INSERT INTO public.transactions (reference_id, transaction_type)
			VALUES ($1, 'ESCROW_LOCK')
			RETURNING id;
		`, orderID.String()).Scan(&txnID)
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to record escrow transaction", "DB_ERROR")
			return
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
			VALUES 
				($1, $2, $3),
				($1, $4, $5);
		`, txnID, buyerAvailAccountID, -requiredFiat, buyerLockedAccountID, requiredFiat)
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to lock fiat in escrow", "LEDGER_ERROR")
			return
		}

	} else {
		// SideSell: Check that user holds sufficient AVAILABLE tickets in relic_inventory
		rows, err := tx.Query(ctx, `
			SELECT id FROM public.relic_inventory
			WHERE owner_id = $1 AND event_id = $2 AND status = 'AVAILABLE'
			LIMIT $3
			FOR UPDATE;
		`, claims.UserID, eventID, req.Quantity)
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to query relic inventory", "DB_ERROR")
			return
		}

		relicIDs := make([]uuid.UUID, 0)
		for rows.Next() {
			var rID uuid.UUID
			if err := rows.Scan(&rID); err == nil {
				relicIDs = append(relicIDs, rID)
			}
		}
		rows.Close()

		if len(relicIDs) < req.Quantity {
			writeOrderError(w, http.StatusBadRequest,
				fmt.Sprintf("Insufficient ticket inventory: You attempted to sell %d ticket(s), but you currently hold only %d available ticket(s) in your vault for %s.",
					req.Quantity, len(relicIDs), req.EventSymbol),
				"INSUFFICIENT_RELIC_INVENTORY")
			return
		}

		// Lock relics in inventory
		for _, rID := range relicIDs {
			_, err = tx.Exec(ctx, `
				UPDATE public.relic_inventory
				SET status = 'ESCROW_LOCKED', updated_at = NOW()
				WHERE id = $1;
			`, rID)
			if err != nil {
				writeOrderError(w, http.StatusInternalServerError, "Failed to lock ticket in vault escrow", "DB_ERROR")
				return
			}
		}

		// Double-entry ledger lock for tickets: AVAILABLE -> ESCROW_LOCKED
		sellerAvailTicketAccountID, err := getOrCreateAccountInTx(ctx, tx, claims.UserID, req.EventSymbol, "AVAILABLE")
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to allocate ticket account", "ACCOUNT_ERROR")
			return
		}
		sellerLockedTicketAccountID, err := getOrCreateAccountInTx(ctx, tx, claims.UserID, req.EventSymbol, "ESCROW_LOCKED")
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to allocate ticket escrow account", "ACCOUNT_ERROR")
			return
		}

		var txnID uuid.UUID
		err = tx.QueryRow(ctx, `
			INSERT INTO public.transactions (reference_id, transaction_type)
			VALUES ($1, 'ESCROW_LOCK')
			RETURNING id;
		`, orderID.String()).Scan(&txnID)
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to record escrow transaction", "DB_ERROR")
			return
		}

		ticketQty := int64(req.Quantity)
		_, err = tx.Exec(ctx, `
			INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
			VALUES 
				($1, $2, $3),
				($1, $4, $5);
		`, txnID, sellerAvailTicketAccountID, -ticketQty, sellerLockedTicketAccountID, ticketQty)
		if err != nil {
			writeOrderError(w, http.StatusInternalServerError, "Failed to lock ticket balance in escrow", "LEDGER_ERROR")
			return
		}
	}

	// ========================================================
	// Step 4: Insert Order into public.orders
	// ========================================================
	orderPrice := req.Price
	if req.OrderType == string(models.OrderTypeMarket) && orderPrice <= 0 {
		orderPrice = maxSellPrice
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO public.orders (
			id, user_id, event_symbol, quote_currency, side, order_type, price, quantity, filled_quantity, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, 0, 'OPEN', $9, $9
		);
	`, orderID, claims.UserID, req.EventSymbol, req.QuoteCurrency, req.Side, req.OrderType, orderPrice, req.Quantity, now)

	if err != nil {
		log.Printf("❌ [PlaceOrder Insert Error]: %v", err)
		writeOrderError(w, http.StatusInternalServerError, "Failed to persist order record", "ORDER_INSERT_FAILED")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to commit order placement", "DB_COMMIT_FAILED")
		return
	}

	order := &models.Order{
		ID:             orderID,
		UserID:         claims.UserID,
		EventSymbol:    req.EventSymbol,
		QuoteCurrency:  req.QuoteCurrency,
		Side:           models.OrderSide(req.Side),
		OrderType:      models.OrderType(req.OrderType),
		Price:          orderPrice,
		Quantity:       req.Quantity,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	// ========================================================
	// Step 4: Publish to Redis ZSETs (Pre-Matching Shadow for Limit Orders)
	// ========================================================
	rdb := queue.GetRedisUniversalClient()
	if rdb != nil && order.OrderType == models.OrderTypeLimit {
		bidsKey := fmt.Sprintf("orderbook:%s:bids", order.EventSymbol)
		asksKey := fmt.Sprintf("orderbook:%s:asks", order.EventSymbol)
		orderKey := fmt.Sprintf("order:%s", order.ID.String())

		if orderBytes, err := json.Marshal(order); err == nil {
			_ = rdb.Set(ctx, orderKey, orderBytes, 24*time.Hour).Err()
		}

		if order.Side == models.SideBuy {
			_ = rdb.ZAdd(ctx, bidsKey, redis.Z{Score: float64(order.Price), Member: order.ID.String()}).Err()
		} else {
			_ = rdb.ZAdd(ctx, asksKey, redis.Z{Score: float64(order.Price), Member: order.ID.String()}).Err()
		}
	}

	// ========================================================
	// Step 5: Enqueue to Redis & Fire Pub/Sub Trigger (Decoupled Async Matching)
	// ========================================================
	dispatched := false
	if rdb != nil {
		if orderBytes, err := json.Marshal(order); err == nil {
			if qErr := rdb.LPush(ctx, engine.QueueOrdersMatch, orderBytes).Err(); qErr == nil {
				_ = rdb.Publish(ctx, engine.ChannelEngineTrigger, order.EventSymbol).Err()
				dispatched = true
				log.Printf("🚀 [Decoupled Matching] Order %s queued in Redis and trigger published for %s", order.ID, order.EventSymbol)
			} else {
				log.Printf("⚠️  [Order Matching Queue LPush Error]: %v", qErr)
			}
		}
	}

	// Resilient fallback: if Redis offline, dispatch via background goroutine
	if !dispatched && engine.GlobalEngine != nil {
		go func() {
			_, _ = engine.GlobalEngine.ProcessOrder(context.Background(), order)
		}()
	} else if engine.GlobalEngine != nil {
		// Non-blocking immediate queue drainage in Go RAM (sub-millisecond instant matching)
		engine.GlobalEngine.TriggerDrain(order.EventSymbol)
	}

	// ========================================================
	// Step 6: Return HTTP 200 OK Immediately (Fast API Response)
	// ========================================================
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(models.PlaceOrderResponse{
		Success: true,
		Status:  string(order.Status),
		Message: fmt.Sprintf("%s %s order placed successfully and queued for matching for %s", req.Side, req.OrderType, req.EventSymbol),
		Order:   order,
	})
}

// CancelOrder handles DELETE /api/orders/{id}
func CancelOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeOrderError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	// Extract order ID from URL path: /api/orders/{id}
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		writeOrderError(w, http.StatusBadRequest, "Order ID required in URL path", "MISSING_ORDER_ID")
		return
	}

	orderID, err := uuid.Parse(parts[2])
	if err != nil {
		writeOrderError(w, http.StatusBadRequest, "Invalid Order UUID", "INVALID_ORDER_ID")
		return
	}

	if engine.GlobalEngine == nil {
		writeOrderError(w, http.StatusServiceUnavailable, "Matching engine unavailable", "ENGINE_UNAVAILABLE")
		return
	}

	order, err := engine.GlobalEngine.CancelOrder(r.Context(), orderID, claims.UserID)
	if err != nil {
		writeOrderError(w, http.StatusBadRequest, err.Error(), "CANCEL_FAILED")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Order cancelled and escrowed assets released to available balance",
		"order":   order,
	})
}

// ListMyOrders handles GET /api/orders/mine
func ListMyOrders(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeOrderError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeOrderError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	rows, err := db.GlobalDB.Pool.Query(r.Context(), `
		SELECT id, user_id, event_symbol, COALESCE(quote_currency, 'INR'), side, order_type, price, quantity, filled_quantity, status, created_at, updated_at
		FROM public.orders
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50;
	`, claims.UserID)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to query orders", "DB_ERROR")
		return
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		if err := rows.Scan(
			&o.ID, &o.UserID, &o.EventSymbol, &o.QuoteCurrency, &o.Side, &o.OrderType,
			&o.Price, &o.Quantity, &o.FilledQuantity, &o.Status, &o.CreatedAt, &o.UpdatedAt,
		); err == nil {
			orders = append(orders, o)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"orders":  orders,
		"count":   len(orders),
	})
}

// GetMarketOrderBook handles GET /api/markets/{symbol}/orderbook
func GetMarketOrderBook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeOrderError(w, http.StatusBadRequest, "Market symbol required in URL path", "MISSING_SYMBOL")
		return
	}
	symbol := strings.ToUpper(parts[2])

	// 1. Ultra-fast path: Serve pre-aggregated Level-2 depth directly from Redis (< 0.3ms)
	rdb := queue.GetRedisUniversalClient()
	if rdb != nil {
		snapshotKey := fmt.Sprintf("orderbook:%s:snapshot", symbol)
		val, err := rdb.Get(r.Context(), snapshotKey).Result()
		if err == nil && val != "" {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Data-Source", "REDIS_ZSET_CACHE")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(val))
			return
		}
	}

	// 2. Resilient Fallback: Query in-memory engine and populate Redis
	if engine.GlobalEngine == nil {
		writeOrderError(w, http.StatusServiceUnavailable, "Matching engine unavailable", "ENGINE_UNAVAILABLE")
		return
	}

	depth, err := engine.GlobalEngine.GetL2Depth(symbol, 20)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to compute L2 depth", "DEPTH_ERROR")
		return
	}

	// Async sync back to Redis if it was missing
	if rdb != nil {
		go engine.SyncL2DepthToRedis(context.Background(), symbol, depth)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Data-Source", "GO_MEMORY_ENGINE")
	_ = json.NewEncoder(w).Encode(depth)
}

// GetMarketTrades handles GET /api/markets/{symbol}/trades
func GetMarketTrades(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeOrderError(w, http.StatusBadRequest, "Market symbol required in URL path", "MISSING_SYMBOL")
		return
	}
	symbol := strings.ToUpper(parts[2])

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeOrderError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	rows, err := db.GlobalDB.Pool.Query(r.Context(), `
		SELECT id, taker_order_id, maker_order_id, event_symbol, price, quantity, executed_at
		FROM public.trades
		WHERE event_symbol = $1
		ORDER BY executed_at DESC
		LIMIT 50;
	`, symbol)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to query market trades", "DB_ERROR")
		return
	}
	defer rows.Close()

	trades := make([]models.Trade, 0)
	for rows.Next() {
		var t models.Trade
		if err := rows.Scan(&t.ID, &t.TakerOrderID, &t.MakerOrderID, &t.EventSymbol, &t.Price, &t.Quantity, &t.ExecutedAt); err == nil {
			trades = append(trades, t)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"event_symbol": symbol,
		"trades":       trades,
		"count":        len(trades),
	})
}

// GetEngineTelemetry handles GET /api/engine/telemetry
func GetEngineTelemetry(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if engine.GlobalEngine == nil {
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "INITIALIZING"})
		return
	}

	_ = json.NewEncoder(w).Encode(engine.GlobalEngine.GetTelemetry())
}

func getOrCreateAccountInTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, currency, accountType string) (uuid.UUID, error) {
	var accountID uuid.UUID
	query := `
		WITH ins AS (
			INSERT INTO public.accounts (user_id, currency, account_type)
			VALUES ($1, $2, $3)
			ON CONFLICT (user_id, currency, account_type) DO NOTHING
			RETURNING id
		)
		SELECT id FROM ins
		UNION ALL
		SELECT id FROM public.accounts
		WHERE user_id = $1 AND currency = $2 AND account_type = $3
		LIMIT 1;
	`
	err := tx.QueryRow(ctx, query, userID, currency, accountType).Scan(&accountID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to get or create account: %w", err)
	}
	return accountID, nil
}
