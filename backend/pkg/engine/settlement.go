package engine

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"darkhold-dex/backend/pkg/email"
	"darkhold-dex/backend/pkg/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TradeEmailMeta stores parameters for non-blocking email notifications
type TradeEmailMeta struct {
	BuyerID     uuid.UUID
	SellerID    uuid.UUID
	EventSymbol string
	Quantity    int
	Price       float64
	TotalAmount float64
	TradeID     string
	NewQRHash   string
}

// SettleTrades executes atomic double-entry settlement, relic inventory transfer, and QR rotation for matched trades
func SettleTrades(ctx context.Context, pool *pgxpool.Pool, trades []*models.Trade) error {
	if len(trades) == 0 {
		return nil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin settlement transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	emailMetas := make([]TradeEmailMeta, 0, len(trades))

	for _, trade := range trades {
		meta, err := settleSingleTrade(ctx, tx, trade)
		if err != nil {
			return fmt.Errorf("failed to settle trade %s: %w", trade.ID, err)
		}
		if meta != nil {
			emailMetas = append(emailMetas, *meta)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit settlement transaction: %w", err)
	}

	log.Printf("🏛️  [Trade Settlement Committed] %d trade(s) settled with zero-sum ledger invariants and rotated QR hashes.", len(trades))

	// Dispatch asynchronous email notifications via Resend (Non-blocking background goroutine)
	if len(emailMetas) > 0 && pool != nil {
		go dispatchTradeEmails(pool, emailMetas)
	}

	return nil
}

func dispatchTradeEmails(pool *pgxpool.Pool, metas []TradeEmailMeta) {
	for _, m := range metas {
		var bEmail, bUsername, sEmail, sUsername string
		_ = pool.QueryRow(context.Background(), "SELECT email, username FROM public.users WHERE id = $1", m.BuyerID).Scan(&bEmail, &bUsername)
		_ = pool.QueryRow(context.Background(), "SELECT email, username FROM public.users WHERE id = $1", m.SellerID).Scan(&sEmail, &sUsername)

		if bEmail != "" {
			_ = email.SendTradeSettlementEmail(bEmail, bUsername, "BUYER", m.EventSymbol, m.Quantity, m.Price, m.TotalAmount, m.TradeID, m.NewQRHash)
		}
		if sEmail != "" {
			_ = email.SendTradeSettlementEmail(sEmail, sUsername, "SELLER", m.EventSymbol, m.Quantity, m.Price, m.TotalAmount, m.TradeID, "")
		}
	}
}

func settleSingleTrade(ctx context.Context, tx pgx.Tx, trade *models.Trade) (*TradeEmailMeta, error) {
	// 1. Fetch Taker & Maker Order details
	var takerUserID, makerUserID uuid.UUID
	var takerSide, makerSide string
	var takerPrice, makerPrice float64
	var eventSymbol, quoteCurrency string

	err := tx.QueryRow(ctx, `
		SELECT user_id, side, price, event_symbol, quote_currency
		FROM public.orders WHERE id = $1
	`, trade.TakerOrderID).Scan(&takerUserID, &takerSide, &takerPrice, &eventSymbol, &quoteCurrency)
	if err != nil {
		return nil, fmt.Errorf("failed to query taker order %s: %w", trade.TakerOrderID, err)
	}

	err = tx.QueryRow(ctx, `
		SELECT user_id, side, price, event_symbol, quote_currency
		FROM public.orders WHERE id = $1
	`, trade.MakerOrderID).Scan(&makerUserID, &makerSide, &makerPrice, &eventSymbol, &quoteCurrency)
	if err != nil {
		return nil, fmt.Errorf("failed to query maker order %s: %w", trade.MakerOrderID, err)
	}

	var buyerID, sellerID uuid.UUID
	var buyerLimitPrice float64

	if takerSide == "BUY" {
		buyerID = takerUserID
		sellerID = makerUserID
		buyerLimitPrice = takerPrice
	} else {
		buyerID = makerUserID
		sellerID = takerUserID
		buyerLimitPrice = makerPrice
	}

	// 2. Fetch Event ID for Relic Inventory lookup
	var eventID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT id FROM public.events WHERE symbol = $1", eventSymbol).Scan(&eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to find event %s: %w", eventSymbol, err)
	}

	// 3. Find seller's locked ticket in relic_inventory
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
		// Fallback check if it's still marked AVAILABLE (e.g. if lock was pending)
		err = tx.QueryRow(ctx, `
			SELECT id, external_ticket_id 
			FROM public.relic_inventory
			WHERE owner_id = $1 AND event_id = $2 AND status = 'AVAILABLE'
			ORDER BY created_at ASC
			LIMIT 1
			FOR UPDATE;
		`, sellerID, eventID).Scan(&relicID, &externalTicketID)
		if err != nil {
			return nil, fmt.Errorf("seller %s has no available relic in inventory for event %s: %w", sellerID, eventSymbol, err)
		}
	}

	// 4. Cryptographic QR Rotation: Generate new unhackable QR hash for the buyer
	hashInput := fmt.Sprintf("%s:%s:%s:%d", eventID, externalTicketID, buyerID, time.Now().UnixNano())
	sha := sha256.Sum256([]byte(hashInput))
	newQRHash := hex.EncodeToString(sha[:])

	// Update relic_inventory: transfer ownership to buyer, set status to AVAILABLE, rotate QR hash
	_, err = tx.Exec(ctx, `
		UPDATE public.relic_inventory
		SET owner_id = $1, status = 'AVAILABLE', internal_qr_hash = $2, updated_at = NOW()
		WHERE id = $3;
	`, buyerID, newQRHash, relicID)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer relic inventory to buyer: %w", err)
	}

	// 5. Insert trade audit record
	_, err = tx.Exec(ctx, `
		INSERT INTO public.trades (id, taker_order_id, maker_order_id, event_symbol, price, quantity, executed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (id) DO NOTHING;
	`, trade.ID, trade.TakerOrderID, trade.MakerOrderID, trade.EventSymbol, trade.Price, trade.Quantity, trade.ExecutedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert trade audit log: %w", err)
	}

	// 6. Double-Entry Account Resolution (Get or Create JIT Accounts)
	buyerFiatAccountID, err := getOrCreateAccount(ctx, tx, buyerID, quoteCurrency, "ESCROW_LOCKED")
	if err != nil {
		return nil, err
	}
	buyerFiatAvailAccountID, err := getOrCreateAccount(ctx, tx, buyerID, quoteCurrency, "AVAILABLE")
	if err != nil {
		return nil, err
	}
	sellerFiatAvailAccountID, err := getOrCreateAccount(ctx, tx, sellerID, quoteCurrency, "AVAILABLE")
	if err != nil {
		return nil, err
	}

	sellerTicketEscrowAccountID, err := getOrCreateAccount(ctx, tx, sellerID, eventSymbol, "ESCROW_LOCKED")
	if err != nil {
		return nil, err
	}
	buyerTicketAvailAccountID, err := getOrCreateAccount(ctx, tx, buyerID, eventSymbol, "AVAILABLE")
	if err != nil {
		return nil, err
	}

	// 7. Insert Transaction Wrapper
	var transactionID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.transactions (reference_id, transaction_type)
		VALUES ($1, 'TRADE_SETTLEMENT')
		RETURNING id;
	`, trade.ID.String()).Scan(&transactionID)
	if err != nil {
		return nil, fmt.Errorf("failed to insert settlement transaction: %w", err)
	}

	// 8. Double-Entry Ledger Writes
	// A: Swap Fiat (Buyer's locked fiat -> Seller's available fiat)
	fiatTradeAmount := trade.Price * float64(trade.Quantity)
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, $3),
			($1, $4, $5);
	`, transactionID, buyerFiatAccountID, -fiatTradeAmount, sellerFiatAvailAccountID, fiatTradeAmount)
	if err != nil {
		return nil, fmt.Errorf("failed to record fiat trade ledger entries: %w", err)
	}

	// B: Swap Ticket Tokens (Seller's locked ticket -> Buyer's available ticket)
	ticketQty := float64(trade.Quantity)
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, $3),
			($1, $4, $5);
	`, transactionID, sellerTicketEscrowAccountID, -ticketQty, buyerTicketAvailAccountID, ticketQty)
	if err != nil {
		return nil, fmt.Errorf("failed to record ticket trade ledger entries: %w", err)
	}

	// C: Refund Buyer Excess Locked Fiat (if limit price > trade execution price)
	if buyerLimitPrice > trade.Price {
		excessRefund := (buyerLimitPrice - trade.Price) * float64(trade.Quantity)
		if excessRefund > 0 {
			_, err = tx.Exec(ctx, `
				INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
				VALUES 
					($1, $2, $3),
					($1, $4, $5);
			`, transactionID, buyerFiatAccountID, -excessRefund, buyerFiatAvailAccountID, excessRefund)
			if err != nil {
				return nil, fmt.Errorf("failed to record excess fiat refund ledger entries: %w", err)
			}
		}
	}

	// 9. Update Orders filled quantity and status
	for _, orderID := range []uuid.UUID{trade.TakerOrderID, trade.MakerOrderID} {
		_, err = tx.Exec(ctx, `
			UPDATE public.orders
			SET filled_quantity = filled_quantity + $1,
			    status = CASE WHEN filled_quantity + $1 >= quantity THEN 'FILLED' ELSE 'PARTIALLY_FILLED' END,
			    updated_at = NOW()
			WHERE id = $2;
		`, trade.Quantity, orderID)
		if err != nil {
			return nil, fmt.Errorf("failed to update order fill status for %s: %w", orderID, err)
		}
	}

	return &TradeEmailMeta{
		BuyerID:     buyerID,
		SellerID:    sellerID,
		EventSymbol: eventSymbol,
		Quantity:    trade.Quantity,
		Price:       trade.Price,
		TotalAmount: fiatTradeAmount,
		TradeID:     trade.ID.String(),
		NewQRHash:   newQRHash,
	}, nil
}

func getOrCreateAccount(ctx context.Context, tx pgx.Tx, userID uuid.UUID, currency, accountType string) (uuid.UUID, error) {
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
		return uuid.Nil, fmt.Errorf("account lookup failed for user=%s curr=%s type=%s: %w", userID, currency, accountType, err)
	}
	return accountID, nil
}
