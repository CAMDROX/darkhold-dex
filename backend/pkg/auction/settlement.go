package auction

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrInsufficientFiat = errors.New("INSUFFICIENT_FIAT_BALANCE")
	ErrTicketNotLocked  = errors.New("TICKET_NOT_LOCKED_IN_ESCROW")
)

// settleAuctionInDB executes the direct atomic double-entry ledger swap and cryptographic QR rotation
func (e *AuctionEngine) settleAuctionInDB(ctx context.Context, auc *LiveAuction, buyerID uuid.UUID, clearingPrice float64, now time.Time) error {
	if e.pool == nil {
		return errors.New("database pool unavailable")
	}

	tx, err := e.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	const quoteCurrency = "INR"

	// 1. Verify and lock Buyer's available fiat balance
	var buyerAvailAccountID uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT id FROM public.accounts 
		WHERE user_id = $1 AND currency = $2 AND account_type = 'AVAILABLE'
	`, buyerID, quoteCurrency).Scan(&buyerAvailAccountID)
	if err != nil {
		return fmt.Errorf("%w: user has no active %s account", ErrInsufficientFiat, quoteCurrency)
	}

	var buyerAvailableBalance float64
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0) FROM public.ledger_entries WHERE account_id = $1
	`, buyerAvailAccountID).Scan(&buyerAvailableBalance)
	if err != nil {
		return fmt.Errorf("failed to calculate buyer balance: %w", err)
	}

	if buyerAvailableBalance < clearingPrice {
		return fmt.Errorf("%w: required ₹%.2f, available ₹%.2f", ErrInsufficientFiat, clearingPrice, buyerAvailableBalance)
	}

	// 2. Fetch Event ID and external ticket ID from relic_inventory (with row lock)
	var eventID uuid.UUID
	var externalTicketID string
	var relicOwnerID uuid.UUID
	var relicStatus string

	err = tx.QueryRow(ctx, `
		SELECT event_id, external_ticket_id, owner_id, status
		FROM public.relic_inventory
		WHERE id = $1
		FOR UPDATE;
	`, auc.RelicID).Scan(&eventID, &externalTicketID, &relicOwnerID, &relicStatus)
	if err != nil {
		return fmt.Errorf("failed to find relic %s: %w", auc.RelicID, err)
	}

	if relicOwnerID != auc.SellerID || relicStatus != "ESCROW_LOCKED" {
		return ErrTicketNotLocked
	}

	// 3. Cryptographic QR Rotation: Overwrite with new unhackable hash bound to buyer
	hashInput := fmt.Sprintf("%s:%s:%s:%d", eventID, externalTicketID, buyerID, now.UnixNano())
	sha := sha256.Sum256([]byte(hashInput))
	newQRHash := hex.EncodeToString(sha[:])

	// Update relic_inventory: transfer ownership to buyer, set status to AVAILABLE, new QR
	_, err = tx.Exec(ctx, `
		UPDATE public.relic_inventory
		SET owner_id = $1, status = 'AVAILABLE', internal_qr_hash = $2, updated_at = $3
		WHERE id = $4;
	`, buyerID, newQRHash, now, auc.RelicID)
	if err != nil {
		return fmt.Errorf("failed to transfer relic custody: %w", err)
	}

	// 4. Update dutch_auctions record
	_, err = tx.Exec(ctx, `
		UPDATE public.dutch_auctions
		SET status = 'SETTLED', buyer_id = $1, clearing_price = $2, current_price = $2, settled_at = $3, updated_at = $3
		WHERE id = $4;
	`, buyerID, clearingPrice, now, auc.ID)
	if err != nil {
		return fmt.Errorf("failed to update auction record: %w", err)
	}

	// 5. JIT Account Resolution for Seller Fiat and Ticket Buckets
	sellerFiatAvailAccountID, err := getAccountJIT(ctx, tx, auc.SellerID, quoteCurrency, "AVAILABLE")
	if err != nil {
		return err
	}
	sellerTicketEscrowAccountID, err := getAccountJIT(ctx, tx, auc.SellerID, auc.EventSymbol, "ESCROW_LOCKED")
	if err != nil {
		return err
	}
	buyerTicketAvailAccountID, err := getAccountJIT(ctx, tx, buyerID, auc.EventSymbol, "AVAILABLE")
	if err != nil {
		return err
	}

	// 6. Record master Transaction wrapper
	var txnID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.transactions (reference_id, transaction_type)
		VALUES ($1, 'DUTCH_AUCTION_SETTLEMENT')
		RETURNING id;
	`, auc.ID.String()).Scan(&txnID)
	if err != nil {
		return fmt.Errorf("failed to record transaction wrapper: %w", err)
	}

	// 7. Double-Entry Ledger Writes (Balanced 4-way swap)
	// Swap Fiat: Buyer Available -> Seller Available
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, $3),
			($1, $4, $5);
	`, txnID, buyerAvailAccountID, -clearingPrice, sellerFiatAvailAccountID, clearingPrice)
	if err != nil {
		return fmt.Errorf("failed to write fiat ledger entries: %w", err)
	}

	// Swap Ticket: Seller Locked -> Buyer Available
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, -1.0),
			($1, $3, 1.0);
	`, txnID, sellerTicketEscrowAccountID, buyerTicketAvailAccountID)
	if err != nil {
		return fmt.Errorf("failed to write ticket ledger entries: %w", err)
	}

	// 8. Commit ACID transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit settlement: %w", err)
	}

	log.Printf("🎉 [Dutch Auction Settled] Auction %s settled at ₹%.2f! Buyer: %s -> Seller: %s. QR rotated successfully.",
		auc.ID, clearingPrice, buyerID, auc.SellerID)

	return nil
}

// getAccountJIT safely fetches or creates an account bucket inside the active transaction
func getAccountJIT(ctx context.Context, tx pgx.Tx, userID uuid.UUID, currency, accountType string) (uuid.UUID, error) {
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

