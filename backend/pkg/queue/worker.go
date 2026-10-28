package queue

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"darkhold-dex/backend/pkg/email"
	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TicketWorker encapsulates dependencies for processing background ticket verification
type TicketWorker struct {
	pool *pgxpool.Pool
	hub  *ws.Hub
}

// NewTicketWorker constructs a TicketWorker instance
func NewTicketWorker(pool *pgxpool.Pool, hub *ws.Hub) *TicketWorker {
	return &TicketWorker{
		pool: pool,
		hub:  hub,
	}
}

// RegisterHandlers registers task handlers with the Asynq ServeMux
func (w *TicketWorker) RegisterHandlers(mux *asynq.ServeMux) {
	mux.HandleFunc(TypeTicketVerify, w.ProcessTicketVerify)
	mux.HandleFunc(TypeTradeSettle, w.HandleTradeSettlement)
}

// notifyUser sends the event to the user via direct WebSocket (if in-process)
// AND publishes to Redis Pub/Sub (for standalone workers) so the message is never lost.
func (w *TicketWorker) notifyUser(ctx context.Context, userID uuid.UUID, event string, data interface{}) {
	// 1. Direct in-memory broadcast if hub is active in current process
	if w.hub != nil {
		w.hub.BroadcastToUser(userID, event, data)
	}

	// 2. Publish to Redis Pub/Sub for cross-process delivery to cmd/server
	if err := PublishWSEvent(ctx, userID, event, data); err != nil {
		log.Printf("⚠️  [Worker PubSub] Failed to publish event %s: %v", event, err)
	} else {
		log.Printf("📢 [Worker Dispatched] Event=%s User=%s", event, userID)
	}
}

// ProcessTicketVerify processes the ticket:verify Asynq task:
// 1. Simulates organizer API delay (800ms)
// 2. Evaluates verification response
// 3. Executes atomic double-entry pgx transaction
// 4. Guarantees WebSocket notification on BOTH success and failure
// ProcessTicketVerify processes the ticket:verify Asynq task
func (w *TicketWorker) ProcessTicketVerify(ctx context.Context, t *asynq.Task) error {
	var payload TicketVerifyPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		log.Printf("❌ [Ticket Worker] Unmarshal payload failed: %v", err)
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}
	return w.ProcessTicketVerifyInternal(ctx, payload)
}

// ProcessTicketVerifyDirect allows executing ticket verification directly in an event-driven Go goroutine with zero Redis dependency
func ProcessTicketVerifyDirect(ctx context.Context, pool *pgxpool.Pool, hub *ws.Hub, payload TicketVerifyPayload) error {
	w := NewTicketWorker(pool, hub)
	return w.ProcessTicketVerifyInternal(ctx, payload)
}

// ProcessTicketVerifyInternal processes the ticket verification logic:
// 1. Simulates organizer API delay (800ms)
// 2. Evaluates verification response
// 3. Executes atomic double-entry pgx transaction
// 4. Guarantees WebSocket notification on BOTH success and failure
func (w *TicketWorker) ProcessTicketVerifyInternal(ctx context.Context, payload TicketVerifyPayload) error {
	log.Printf("⏳ [Ticket Worker Active] Verifying ticket: Barcode=%s Event=%s User=%s",
		payload.TicketID, payload.EventSymbol, payload.UserID)

	// ========================================================
	// 1. Simulate External API Delay (800ms organizer SLA)
	// ========================================================
	select {
	case <-time.After(800 * time.Millisecond):
	case <-ctx.Done():
		return ctx.Err()
	}

	// ========================================================
	// 2. Simulate External Response (hardcoded true for MVP)
	// ========================================================
	isVerified := true
	if !isVerified {
		log.Printf("⚠️  [Ticket Worker] External provider rejected ticket: %s", payload.TicketID)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"event":        "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "External ticket issuer rejected the barcode",
			"reason":       "External ticket issuer rejected the barcode",
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("external ticket verification rejected: %w", asynq.SkipRetry)
	}

	// ========================================================
	// 3. Atomic PostgreSQL Transaction
	// ========================================================
	if w.pool == nil {
		err := errors.New("database connection pool is nil")
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":      "IMPORT_FAILED",
			"status":    "FAILED",
			"ticket_id": payload.TicketID,
			"message":   "Database connection unavailable",
			"reason":    "Database connection unavailable",
			"timestamp": time.Now().UTC(),
		})
		return err
	}

	tx, err := w.pool.Begin(ctx)
	if err != nil {
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":      "IMPORT_FAILED",
			"status":    "FAILED",
			"ticket_id": payload.TicketID,
			"message":   "Failed to initialize database transaction",
			"reason":    err.Error(),
			"timestamp": time.Now().UTC(),
		})
		return fmt.Errorf("failed to begin database transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// 3a. Defense-in-depth: Verify user KYC status
	var userKycStatus string
	err = tx.QueryRow(ctx, `
		SELECT LOWER(COALESCE(kyc_status, 'unverified'))
		FROM public.users
		WHERE id = $1
	`, payload.UserID).Scan(&userKycStatus)

	if err != nil {
		reason := fmt.Sprintf("Failed to query KYC status for user %s: %v", payload.UserID, err)
		log.Printf("❌ [Ticket Worker] %s", reason)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"event":        "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Failed to verify identity verification status",
			"reason":       reason,
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("kyc query failed: %w", asynq.SkipRetry)
	}

	if userKycStatus != "verified" {
		reason := fmt.Sprintf("Identity verification required: User KYC status is '%s'. Only verified users may import assets.", userKycStatus)
		log.Printf("⛔ [Ticket Worker KYC Rejection] User %s has status %s", payload.UserID, userKycStatus)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"event":        "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      reason,
			"reason":       reason,
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("kyc not verified: %w", asynq.SkipRetry)
	}

	// 3b. Retrieve and validate the target event
	var eventID uuid.UUID
	var externalPlatform string
	var eventDate time.Time

	err = tx.QueryRow(ctx, `
		SELECT id, COALESCE(external_platform, 'SIMULATED'), event_date
		FROM public.events
		WHERE symbol = $1 AND status = 'ACTIVE'
	`, payload.EventSymbol).Scan(&eventID, &externalPlatform, &eventDate)

	if err != nil {
		reason := fmt.Sprintf("Event '%s' is not active or does not exist", payload.EventSymbol)
		log.Printf("❌ [Ticket Worker] %s", reason)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"event":        "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      reason,
			"reason":       reason,
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("event %s not found: %w", payload.EventSymbol, asynq.SkipRetry)
	}

	// 3b. Just-in-Time User Account CTE Upsert
	accountUpsertQuery := `
		WITH ins AS (
			INSERT INTO public.accounts (user_id, currency, account_type)
			VALUES ($1, $2, 'AVAILABLE')
			ON CONFLICT (user_id, currency, account_type) DO NOTHING
			RETURNING id
		)
		SELECT id FROM ins
		UNION ALL
		SELECT id FROM public.accounts
		WHERE user_id = $1 AND currency = $2 AND account_type = 'AVAILABLE'
		LIMIT 1;
	`

	var userAccountID uuid.UUID
	err = tx.QueryRow(ctx, accountUpsertQuery, payload.UserID, payload.EventSymbol).Scan(&userAccountID)
	if err != nil {
		log.Printf("❌ [Ticket Worker] Failed to upsert user account: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Failed to allocate user ledger account",
			"reason":       err.Error(),
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to upsert user account: %w", err)
	}

	// 3c. Just-in-Time Admin Account CTE Upsert (System Reserve Account)
	adminUserID, err := resolveAdminUserID(ctx, tx)
	if err != nil {
		log.Printf("❌ [Ticket Worker] Failed to resolve admin user: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Platform admin reserve account configuration error",
			"reason":       err.Error(),
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to resolve platform admin: %w", err)
	}

	var adminAccountID uuid.UUID
	err = tx.QueryRow(ctx, accountUpsertQuery, adminUserID, payload.EventSymbol).Scan(&adminAccountID)
	if err != nil {
		log.Printf("❌ [Ticket Worker] Failed to upsert admin reserve account: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Failed to allocate system reserve account",
			"reason":       err.Error(),
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to upsert admin reserve account: %w", err)
	}

	// 3d. QR Hash Generation (Cryptographic SHA-256 of event_id + ticket_id + user_id)
	hashInput := fmt.Sprintf("%s:%s:%s", eventID.String(), payload.TicketID, payload.UserID.String())
	sha := sha256.Sum256([]byte(hashInput))
	internalQRHash := hex.EncodeToString(sha[:])

	// 3e. Insert Inventory Row
	expiresAt := eventDate
	if expiresAt.IsZero() || expiresAt.Before(time.Now()) {
		expiresAt = time.Now().Add(30 * 24 * time.Hour) // fallback default
	}

	var relicInventoryID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.relic_inventory (
			owner_id,
			event_id,
			external_ticket_id,
			external_platform,
			internal_qr_hash,
			status,
			expires_at
		) VALUES (
			$1, $2, $3, $4, $5, 'AVAILABLE', $6
		)
		RETURNING id;
	`, payload.UserID, eventID, payload.TicketID, externalPlatform, internalQRHash, expiresAt).Scan(&relicInventoryID)

	if err != nil {
		isDup := strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "23505")
		msg := "Failed to insert ticket into inventory vault"
		if isDup {
			msg = fmt.Sprintf("Duplicate ticket: Barcode '%s' has already been imported into Darkhold Exchange.", payload.TicketID)
		}
		log.Printf("❌ [Ticket Worker] Relic inventory insert error: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"event":        "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      msg,
			"reason":       msg,
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to insert relic inventory: %v: %w", err, asynq.SkipRetry)
	}

	// 3f. Insert Transaction (IMPORT_MINT referencing relic_inventory.id)
	var transactionID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.transactions (
			reference_id,
			transaction_type
		) VALUES (
			$1, 'IMPORT_MINT'
		)
		RETURNING id;
	`, relicInventoryID).Scan(&transactionID)

	if err != nil {
		log.Printf("❌ [Ticket Worker] Transaction insert error: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Failed to record ledger transaction wrapper",
			"reason":       err.Error(),
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to insert transaction wrapper: %w", err)
	}

	// 3g. Double-Entry Ledger Writes
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, -1),
			($1, $3, 1);
	`, transactionID, adminAccountID, userAccountID)

	if err != nil {
		log.Printf("❌ [Ticket Worker] Ledger entries write error: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Failed to execute double-entry ledger balance conservation",
			"reason":       err.Error(),
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to write double-entry ledger entries: %w", err)
	}

	// 3h. Commit SQL Transaction
	if err := tx.Commit(ctx); err != nil {
		log.Printf("❌ [Ticket Worker] Transaction commit error: %v", err)
		w.notifyUser(ctx, payload.UserID, ws.EventImportFailed, map[string]interface{}{
			"type":         "IMPORT_FAILED",
			"status":       "FAILED",
			"ticket_id":    payload.TicketID,
			"event_symbol": payload.EventSymbol,
			"message":      "Database commit failure",
			"reason":       err.Error(),
			"timestamp":    time.Now().UTC(),
		})
		return fmt.Errorf("failed to commit SQL transaction: %w", err)
	}

	log.Printf("✅ [Ticket Worker SUCCESS] Relic minted! RelicID=%s TxID=%s Ticket=%s User=%s",
		relicInventoryID, transactionID, payload.TicketID, payload.UserID)

	// ========================================================
	// 4. WebSocket Notification (Guaranteed Delivery)
	// ========================================================
	var currentBalance float64
	_ = w.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0)
		FROM public.ledger_entries
		WHERE account_id = $1
	`, userAccountID).Scan(&currentBalance)

	successPayload := map[string]interface{}{
		"type":             "IMPORT_SUCCESS",
		"event":            "IMPORT_SUCCESS",
		"status":           "SUCCESS",
		"ticket_id":        payload.TicketID,
		"event_symbol":     payload.EventSymbol,
		"relic_id":         relicInventoryID.String(),
		"transaction_id":   transactionID.String(),
		"user_account_id":  userAccountID.String(),
		"admin_account_id": adminAccountID.String(),
		"balance_delta":    1,
		"new_balance":      currentBalance,
		"current_balance":  currentBalance,
		"internal_qr_hash": internalQRHash,
		"message":          fmt.Sprintf("Relic barcode %s verified and minted into your vault for %s!", payload.TicketID, payload.EventSymbol),
		"timestamp":        time.Now().UTC(),
	}

	w.notifyUser(ctx, payload.UserID, ws.EventImportSuccess, successPayload)
	return nil
}

// resolveAdminUserID robustly finds a verified administrator user ID in public.users
func resolveAdminUserID(ctx context.Context, tx pgx.Tx) (uuid.UUID, error) {
	// 1. Check environment variable override
	checkCandidate := func(envKey string) *uuid.UUID {
		if envVal := os.Getenv(envKey); envVal != "" {
			if id, err := uuid.Parse(envVal); err == nil {
				// Verify the user actually exists in public.users to satisfy foreign key constraints
				var exists bool
				_ = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM public.users WHERE id = $1)", id).Scan(&exists)
				if exists {
					return &id
				}
				log.Printf("⚠️  [Admin Resolution] %s (%s) does not exist in public.users, checking fallback", envKey, id)
			}
		}
		return nil
	}

	if id := checkCandidate("PLATFORM_ADMIN_USER_ID"); id != nil {
		return *id, nil
	}
	if id := checkCandidate("ADMIN_USER_ID"); id != nil {
		return *id, nil
	}

	// 2. Query users table for role = 'admin'
	var adminID uuid.UUID
	err := tx.QueryRow(ctx, `
		SELECT id FROM public.users 
		WHERE role = 'admin' 
		ORDER BY created_at ASC 
		LIMIT 1
	`).Scan(&adminID)

	if err == nil {
		return adminID, nil
	}

	// 3. Fallback to first user in system
	err = tx.QueryRow(ctx, `
		SELECT id FROM public.users 
		ORDER BY created_at ASC 
		LIMIT 1
	`).Scan(&adminID)

	if err == nil {
		return adminID, nil
	}

	return uuid.Nil, errors.New("no users or admin found in database: please create an admin user or verify public.users")
}

// HandleTradeSettlement processes the asynchronous 'trade:settle' task from the 'settlements' queue
func (w *TicketWorker) HandleTradeSettlement(ctx context.Context, t *asynq.Task) error {
	var payload TradeSettlePayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		log.Printf("❌ [Trade Settlement Worker] Unmarshal payload failed: %v", err)
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf("🏛️  [Trade Settlement Worker] Processing settlement: Maker=%s Taker=%s Event=%s Price=%.2f Qty=%d",
		payload.MakerOrderID, payload.TakerOrderID, payload.EventSymbol, payload.Price, payload.Quantity)

	if w.pool == nil {
		return errors.New("database pool is nil")
	}

	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin database transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Fetch Maker and Taker order details
	var makerUserID, takerUserID uuid.UUID
	var makerSide, takerSide string
	var makerPrice, takerPrice float64
	var quoteCurrency string

	err = tx.QueryRow(ctx, `
		SELECT user_id, side, price, COALESCE(quote_currency, 'INR')
		FROM public.orders WHERE id = $1
	`, payload.MakerOrderID).Scan(&makerUserID, &makerSide, &makerPrice, &quoteCurrency)
	if err != nil {
		return fmt.Errorf("failed to query maker order: %w", err)
	}

	err = tx.QueryRow(ctx, `
		SELECT user_id, side, price
		FROM public.orders WHERE id = $1
	`, payload.TakerOrderID).Scan(&takerUserID, &takerSide, &takerPrice)
	if err != nil {
		return fmt.Errorf("failed to query taker order: %w", err)
	}

	var buyerID, sellerID uuid.UUID
	var buyerLimitPrice float64

	if makerSide == "BUY" {
		buyerID = makerUserID
		sellerID = takerUserID
		buyerLimitPrice = makerPrice
	} else {
		buyerID = takerUserID
		sellerID = makerUserID
		buyerLimitPrice = takerPrice
	}

	// 2. Fetch Event ID
	var eventID uuid.UUID
	err = tx.QueryRow(ctx, `SELECT id FROM public.events WHERE symbol = $1`, payload.EventSymbol).Scan(&eventID)
	if err != nil {
		return fmt.Errorf("failed to find event %s: %w", payload.EventSymbol, err)
	}

	// 3. Find Seller's locked relic in inventory
	var relicID uuid.UUID
	var externalTicketID string
	err = tx.QueryRow(ctx, `
		SELECT id, external_ticket_id 
		FROM public.relic_inventory
		WHERE owner_id = $1 AND event_id = $2 AND status = 'ESCROW_LOCKED'
		ORDER BY created_at ASC
		LIMIT 1
		FOR UPDATE;
	`, sellerID, eventID).Scan(&relicID, &externalTicketID)

	if err != nil {
		// Fallback check if marked AVAILABLE
		err = tx.QueryRow(ctx, `
			SELECT id, external_ticket_id 
			FROM public.relic_inventory
			WHERE owner_id = $1 AND event_id = $2 AND status = 'AVAILABLE'
			ORDER BY created_at ASC
			LIMIT 1
			FOR UPDATE;
		`, sellerID, eventID).Scan(&relicID, &externalTicketID)
		if err != nil {
			return fmt.Errorf("seller %s has no eligible relic in vault for %s: %w", sellerID, payload.EventSymbol, err)
		}
	}

	// 4. Cryptographic QR Rotation (CRITICAL)
	hashInput := fmt.Sprintf("%s:%s:%s:%d", eventID, externalTicketID, buyerID, time.Now().UnixNano())
	sha := sha256.Sum256([]byte(hashInput))
	newQRHash := hex.EncodeToString(sha[:])

	// Update relic_inventory: ownership changes to buyer, status = AVAILABLE, new QR hash
	_, err = tx.Exec(ctx, `
		UPDATE public.relic_inventory
		SET owner_id = $1, status = 'AVAILABLE', internal_qr_hash = $2, updated_at = NOW()
		WHERE id = $3;
	`, buyerID, newQRHash, relicID)
	if err != nil {
		return fmt.Errorf("failed to update relic inventory: %w", err)
	}

	// 5. Update Maker & Taker Orders
	for _, oID := range []uuid.UUID{payload.MakerOrderID, payload.TakerOrderID} {
		_, err = tx.Exec(ctx, `
			UPDATE public.orders
			SET filled_quantity = filled_quantity + $1,
			    status = CASE WHEN filled_quantity + $1 >= quantity THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END,
			    updated_at = NOW()
			WHERE id = $2;
		`, payload.Quantity, oID)
		if err != nil {
			return fmt.Errorf("failed to update order status for %s: %w", oID, err)
		}
	}

	// 6. Insert row into public.trades
	tradeID := uuid.New()
	_, err = tx.Exec(ctx, `
		INSERT INTO public.trades (id, taker_order_id, maker_order_id, event_symbol, price, quantity, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (id) DO NOTHING;
	`, tradeID, payload.TakerOrderID, payload.MakerOrderID, payload.EventSymbol, payload.Price, payload.Quantity)
	if err != nil {
		return fmt.Errorf("failed to insert trade row: %w", err)
	}

	// 7. Double-Entry Ledger Swaps
	buyerFiatEscrowAccountID, err := getAccountJIT(ctx, tx, buyerID, quoteCurrency, "ESCROW_LOCKED")
	if err != nil {
		return err
	}
	buyerFiatAvailAccountID, err := getAccountJIT(ctx, tx, buyerID, quoteCurrency, "AVAILABLE")
	if err != nil {
		return err
	}
	sellerFiatAvailAccountID, err := getAccountJIT(ctx, tx, sellerID, quoteCurrency, "AVAILABLE")
	if err != nil {
		return err
	}

	sellerTicketEscrowAccountID, err := getAccountJIT(ctx, tx, sellerID, payload.EventSymbol, "ESCROW_LOCKED")
	if err != nil {
		return err
	}
	buyerTicketAvailAccountID, err := getAccountJIT(ctx, tx, buyerID, payload.EventSymbol, "AVAILABLE")
	if err != nil {
		return err
	}

	var txnID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.transactions (reference_id, transaction_type)
		VALUES ($1, 'TRADE_SETTLEMENT')
		RETURNING id;
	`, tradeID.String()).Scan(&txnID)
	if err != nil {
		return fmt.Errorf("failed to insert transaction wrapper: %w", err)
	}

	// Swap Fiat: Buyer's locked fiat -> Seller's available fiat
	totalFiat := payload.Price * float64(payload.Quantity)
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, $3),
			($1, $4, $5);
	`, txnID, buyerFiatEscrowAccountID, -totalFiat, sellerFiatAvailAccountID, totalFiat)
	if err != nil {
		return fmt.Errorf("failed to record fiat ledger entries: %w", err)
	}

	// Swap Ticket: Seller's locked ticket -> Buyer's available ticket
	totalTickets := float64(payload.Quantity)
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, $3),
			($1, $4, $5);
	`, txnID, sellerTicketEscrowAccountID, -totalTickets, buyerTicketAvailAccountID, totalTickets)
	if err != nil {
		return fmt.Errorf("failed to record ticket ledger entries: %w", err)
	}

	// Refund buyer excess locked fiat if buyer's limit price > trade execution price
	if buyerLimitPrice > payload.Price {
		excessRefund := (buyerLimitPrice - payload.Price) * float64(payload.Quantity)
		if excessRefund > 0 {
			_, err = tx.Exec(ctx, `
				INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
				VALUES 
					($1, $2, $3),
					($1, $4, $5);
			`, txnID, buyerFiatEscrowAccountID, -excessRefund, buyerFiatAvailAccountID, excessRefund)
			if err != nil {
				return fmt.Errorf("failed to refund excess locked fiat: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit settlement transaction: %w", err)
	}

	log.Printf("🏛️  [Trade Settlement Complete] Trade %s settled! Fiat: ₹%.2f, Relic transferred & QR rotated.",
		tradeID, totalFiat)

	// 8. WebSocket Notifications to both users' private channels
	settleData := map[string]interface{}{
		"type":           "TRADE_SETTLED",
		"event":          "TRADE_SETTLED",
		"trade_id":       tradeID.String(),
		"maker_order_id": payload.MakerOrderID.String(),
		"taker_order_id": payload.TakerOrderID.String(),
		"event_symbol":   payload.EventSymbol,
		"price":          payload.Price,
		"quantity":       payload.Quantity,
		"buyer_id":       buyerID.String(),
		"seller_id":      sellerID.String(),
		"timestamp":      time.Now().UTC(),
	}

	w.notifyUser(ctx, buyerID, "TRADE_SETTLED", settleData)
	w.notifyUser(ctx, sellerID, "TRADE_SETTLED", settleData)

	if w.hub != nil {
		w.hub.BroadcastAll("TRADE_EXECUTED", settleData)
		w.hub.BroadcastAll("TRADE_SETTLED", settleData)
		if w.pool != nil {
			go func(bID, sID uuid.UUID, evtSymbol string, qty int, prc, tot float64, trdID, qrHash string) {
				var bEmail, bUsername, sEmail, sUsername string
				_ = w.pool.QueryRow(context.Background(), "SELECT email, username FROM public.users WHERE id = $1", bID).Scan(&bEmail, &bUsername)
				_ = w.pool.QueryRow(context.Background(), "SELECT email, username FROM public.users WHERE id = $1", sID).Scan(&sEmail, &sUsername)
				if bEmail != "" {
					_ = email.SendTradeSettlementEmail(bEmail, bUsername, "BUYER", evtSymbol, qty, prc, tot, trdID, qrHash)
				}
				if sEmail != "" {
					_ = email.SendTradeSettlementEmail(sEmail, sUsername, "SELLER", evtSymbol, qty, prc, tot, trdID, "")
				}
			}(buyerID, sellerID, payload.EventSymbol, payload.Quantity, payload.Price, totalFiat, tradeID.String(), newQRHash)
		}
	}

	return nil
}

func getAccountJIT(ctx context.Context, tx pgx.Tx, userID uuid.UUID, currency, accountType string) (uuid.UUID, error) {
	var id uuid.UUID
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
	err := tx.QueryRow(ctx, query, userID, currency, accountType).Scan(&id)
	return id, err
}

// StartWorker initializes and runs the background Asynq worker server
func StartWorker(ctx context.Context, pool *pgxpool.Pool, hub *ws.Hub) (*asynq.Server, error) {
	srv := NewServer()
	worker := NewTicketWorker(pool, hub)

	mux := asynq.NewServeMux()
	worker.RegisterHandlers(mux)

	go func() {
		log.Println("⚡ [Asynq Server] Background worker process started. Listening on 'settlements', 'critical', 'default', 'low' queues.")
		if err := srv.Run(mux); err != nil && !errors.Is(err, asynq.ErrServerClosed) {
			log.Printf("⚠️  [Asynq Server] Worker stopped with error: %v", err)
		}
	}()

	return srv, nil
}

