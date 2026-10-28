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

	"darkhold-dex/backend/pkg/auction"
	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/email"
	"darkhold-dex/backend/pkg/middleware"
	"darkhold-dex/backend/pkg/models"
	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// CreateDutchAuction handles POST /api/auctions
func CreateDutchAuction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeOrderError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	var req models.CreateAuctionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeOrderError(w, http.StatusBadRequest, "Invalid request payload: "+err.Error(), "INVALID_PAYLOAD")
		return
	}

	req.EventSymbol = strings.ToUpper(strings.TrimSpace(req.EventSymbol))

	if req.RelicID == uuid.Nil {
		writeOrderError(w, http.StatusBadRequest, "relic_id is required", "MISSING_RELIC_ID")
		return
	}
	if req.EventSymbol == "" {
		writeOrderError(w, http.StatusBadRequest, "event_symbol is required", "MISSING_EVENT_SYMBOL")
		return
	}
	if req.StartPrice <= 0 || req.ReservePrice <= 0 {
		writeOrderError(w, http.StatusBadRequest, "start_price and reserve_price must be positive", "INVALID_PRICE")
		return
	}
	if req.StartPrice <= req.ReservePrice {
		writeOrderError(w, http.StatusBadRequest, "start_price must be strictly greater than reserve_price", "INVALID_DECAY_RANGE")
		return
	}
	if req.DurationSeconds < 60 || req.DurationSeconds > 86400 {
		writeOrderError(w, http.StatusBadRequest, "duration_seconds must be between 60 (1 min) and 86400 (24 hrs)", "INVALID_DURATION")
		return
	}

	ctx := r.Context()

	// 1. Enforce KYC Gate
	var kycStatus string
	err := db.GlobalDB.Pool.QueryRow(ctx,
		"SELECT LOWER(COALESCE(kyc_status, 'unverified')) FROM public.users WHERE id = $1",
		claims.UserID,
	).Scan(&kycStatus)
	if err != nil || kycStatus != "verified" {
		writeOrderError(w, http.StatusForbidden, "Identity verification required: Only KYC-verified users may launch Dutch auctions.", "KYC_VERIFICATION_REQUIRED")
		return
	}

	// 2. Validate Dynamic Price Collar ($P_start <= max_sell_price)
	var eventID uuid.UUID
	var eventName string
	var faceValue, maxSellPrice float64
	err = db.GlobalDB.Pool.QueryRow(ctx, `
		SELECT id, name, face_value, max_sell_price
		FROM public.events
		WHERE symbol = $1 AND status = 'ACTIVE'
	`, req.EventSymbol).Scan(&eventID, &eventName, &faceValue, &maxSellPrice)
	if err != nil {
		writeOrderError(w, http.StatusBadRequest, fmt.Sprintf("Event '%s' is not active or does not exist", req.EventSymbol), "EVENT_NOT_FOUND")
		return
	}

	if maxSellPrice > 0 && req.StartPrice > maxSellPrice {
		writeOrderError(w, http.StatusUnprocessableEntity,
			fmt.Sprintf("COLLAR_BREACH: Starting price ₹%.2f exceeds the anti-scalping ceiling of ₹%.2f for %s (Face value ₹%.2f)",
				req.StartPrice, maxSellPrice, req.EventSymbol, faceValue),
			"422_COLLAR_BREACH")
		return
	}

	// 3. Begin Escrow Transaction: Lock Relic in Vault & Ledger
	tx, err := db.GlobalDB.Pool.Begin(ctx)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to start database transaction", "DB_TX_ERROR")
		return
	}
	defer tx.Rollback(ctx)

	// Check relic ownership and available status
	var relicOwnerID uuid.UUID
	var relicStatus string
	err = tx.QueryRow(ctx, `
		SELECT owner_id, status 
		FROM public.relic_inventory 
		WHERE id = $1 AND event_id = $2
		FOR UPDATE;
	`, req.RelicID, eventID).Scan(&relicOwnerID, &relicStatus)
	if err != nil {
		writeOrderError(w, http.StatusNotFound, "Specified relic not found for this event", "RELIC_NOT_FOUND")
		return
	}

	if relicOwnerID != claims.UserID {
		writeOrderError(w, http.StatusForbidden, "You do not own this relic", "NOT_RELIC_OWNER")
		return
	}
	if relicStatus != "AVAILABLE" {
		writeOrderError(w, http.StatusConflict, fmt.Sprintf("Relic is currently in status '%s' and cannot be auctioned", relicStatus), "RELIC_NOT_AVAILABLE")
		return
	}

	// Lock relic in inventory
	_, err = tx.Exec(ctx, `
		UPDATE public.relic_inventory 
		SET status = 'ESCROW_LOCKED', updated_at = NOW() 
		WHERE id = $1;
	`, req.RelicID)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to lock relic in escrow", "INVENTORY_ERROR")
		return
	}

	// Resolve or upsert double-entry accounts for seller
	sellerAvailTicketAccountID, err := getAccountJITHandler(ctx, tx, claims.UserID, req.EventSymbol, "AVAILABLE")
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to resolve seller account", "ACCOUNT_ERROR")
		return
	}
	sellerLockedTicketAccountID, err := getAccountJITHandler(ctx, tx, claims.UserID, req.EventSymbol, "ESCROW_LOCKED")
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to resolve seller escrow account", "ACCOUNT_ERROR")
		return
	}

	auctionID := uuid.New()
	now := time.Now().UTC()

	var txnID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.transactions (reference_id, transaction_type)
		VALUES ($1, 'AUCTION_ESCROW_LOCK')
		RETURNING id;
	`, auctionID.String()).Scan(&txnID)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to record escrow transaction", "DB_ERROR")
		return
	}

	// Debit available ticket, credit locked ticket
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, -1.0),
			($1, $3, 1.0);
	`, txnID, sellerAvailTicketAccountID, sellerLockedTicketAccountID)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to update ledger balances", "LEDGER_ERROR")
		return
	}

	// Insert into public.dutch_auctions
	_, err = tx.Exec(ctx, `
		INSERT INTO public.dutch_auctions (
			id, seller_id, relic_id, event_symbol, start_price, reserve_price, current_price, duration_seconds, status, started_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $5, $7, 'ACTIVE', $8, $8
		);
	`, auctionID, claims.UserID, req.RelicID, req.EventSymbol, req.StartPrice, req.ReservePrice, req.DurationSeconds, now)
	if err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to persist Dutch auction", "DB_INSERT_FAILED")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeOrderError(w, http.StatusInternalServerError, "Failed to commit auction creation", "DB_COMMIT_FAILED")
		return
	}

	// 4. Register in in-memory Dutch Auction Engine
	auctionModel := &models.DutchAuction{
		ID:              auctionID,
		SellerID:        claims.UserID,
		SellerUsername:  claims.Username,
		RelicID:         req.RelicID,
		EventSymbol:     req.EventSymbol,
		EventName:       eventName,
		StartPrice:      req.StartPrice,
		ReservePrice:    req.ReservePrice,
		CurrentPrice:    req.StartPrice,
		DurationSeconds: req.DurationSeconds,
		Status:          models.AuctionStatusActive,
		StartedAt:       now,
		UpdatedAt:       now,
	}

	if auction.GlobalAuctionEngine != nil {
		auction.GlobalAuctionEngine.RegisterAuction(auctionModel)
	}

	// 5. Broadcast to WebSocket clients
	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastAll("DUTCH_AUCTION_CREATED", auctionModel)
	}

	// 6. REQUIREMENT 1: Email all users who currently have active BUY orders for this event
	go dispatchAuctionEmailsToBuyers(req.EventSymbol, eventName, req.StartPrice, req.ReservePrice, req.DurationSeconds/60, claims.UserID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Dutch auction launched successfully with real-time price decay active.",
		"auction": auctionModel,
	})
}

// dispatchAuctionEmailsToBuyers queries all active buyers for this symbol and alerts them
func dispatchAuctionEmailsToBuyers(eventSymbol, eventName string, startPrice, reservePrice float64, durationMinutes int, sellerID uuid.UUID) {
	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rows, err := db.GlobalDB.Pool.Query(ctx, `
		SELECT DISTINCT u.email, u.username
		FROM public.orders o
		JOIN public.users u ON o.user_id = u.id
		WHERE o.event_symbol = $1
		  AND o.side = 'BUY'
		  AND o.status IN ('OPEN', 'PARTIALLY_FILLED')
		  AND u.is_email_verified = true
		  AND u.id != $2;
	`, eventSymbol, sellerID)
	if err != nil {
		log.Printf("⚠️  [Auction Email Alert Error] Failed to query buyers for %s: %v", eventSymbol, err)
		return
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var buyerEmail, buyerUsername string
		if err := rows.Scan(&buyerEmail, &buyerUsername); err == nil && buyerEmail != "" {
			count++
			go func(e, u string) {
				_ = email.SendDutchAuctionNotificationEmail(e, u, eventName, eventSymbol, startPrice, reservePrice, durationMinutes)
			}(buyerEmail, buyerUsername)
		}
	}

	log.Printf("📧 [Dutch Auction Email Notifications] Dispatched alerts to %d active buyer(s) in %s market.", count, eventSymbol)
}

// ListDutchAuctions handles GET /api/auctions
func ListDutchAuctions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	symbol := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("symbol")))

	var auctions []*models.DutchAuction
	if auction.GlobalAuctionEngine != nil {
		auctions = auction.GlobalAuctionEngine.GetActiveAuctions(symbol)
	}

	if auctions == nil {
		auctions = make([]*models.DutchAuction, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"count":    len(auctions),
		"auctions": auctions,
	})
}

// SnipeDutchAuction handles POST /api/auctions/{id}/buy
func SnipeDutchAuction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeOrderError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		writeOrderError(w, http.StatusBadRequest, "Auction ID required in URL path", "MISSING_AUCTION_ID")
		return
	}

	auctionID, err := uuid.Parse(parts[2])
	if err != nil {
		writeOrderError(w, http.StatusBadRequest, "Invalid auction UUID", "INVALID_AUCTION_ID")
		return
	}

	if auction.GlobalAuctionEngine == nil {
		writeOrderError(w, http.StatusServiceUnavailable, "Auction engine unavailable", "ENGINE_UNAVAILABLE")
		return
	}

	// Execute atomic in-memory snipe & settlement handoff
	auc, clearingPrice, err := auction.GlobalAuctionEngine.SnipeAuction(r.Context(), auctionID, claims.UserID)
	if err != nil {
		if errors.Is(err, auction.ErrAuctionClaimed) {
			writeOrderError(w, http.StatusConflict, "This auction has already been sniped by another buyer!", "AUCTION_ALREADY_CLAIMED")
			return
		}
		if errors.Is(err, auction.ErrAuctionExpired) {
			writeOrderError(w, http.StatusGone, "This auction has expired without a bidder.", "AUCTION_EXPIRED")
			return
		}
		if errors.Is(err, auction.ErrSelfAuction) {
			writeOrderError(w, http.StatusBadRequest, "You cannot buy an auction you created yourself.", "CANNOT_BUY_OWN_AUCTION")
			return
		}
		if errors.Is(err, auction.ErrInsufficientFiat) {
			writeOrderError(w, http.StatusBadRequest, "Insufficient available fiat funds in your wallet to snipe at this clearing price.", "INSUFFICIENT_FUNDS")
			return
		}
		writeOrderError(w, http.StatusInternalServerError, "Auction execution failed: "+err.Error(), "SNIPE_ERROR")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(models.SnipeAuctionResponse{
		Status:        "SUCCESS",
		AuctionID:     auc.ID,
		EventSymbol:   auc.EventSymbol,
		ClearingPrice: clearingPrice,
		RelicID:       auc.RelicID,
		BuyerID:       claims.UserID,
		SettledAt:     time.Now().UTC(),
		Message:       fmt.Sprintf("Congratulations! You sniped the ticket at ₹%.2f. The QR code has been rotated and delivered to your Vault.", clearingPrice),
	})
}

// getAccountJITHandler is a local helper to resolve accounts inside active tx
func getAccountJITHandler(ctx context.Context, tx pgx.Tx, userID uuid.UUID, currency, accountType string) (uuid.UUID, error) {
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
	var accountID uuid.UUID
	err := tx.QueryRow(ctx, query, userID, currency, accountType).Scan(&accountID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to resolve account bucket for user %s (%s %s): %w", userID, currency, accountType, err)
	}
	return accountID, nil
}
