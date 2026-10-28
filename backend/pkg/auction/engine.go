package auction

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"sync"
	"time"

	"darkhold-dex/backend/pkg/models"
	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	GlobalAuctionEngine *AuctionEngine
	ErrAuctionNotFound  = errors.New("AUCTION_NOT_FOUND")
	ErrAuctionClaimed   = errors.New("AUCTION_ALREADY_CLAIMED")
	ErrAuctionExpired   = errors.New("AUCTION_EXPIRED")
	ErrSelfAuction      = errors.New("CANNOT_BUY_OWN_AUCTION")
)

// LiveAuction maintains volatile in-memory state of an active decaying auction
type LiveAuction struct {
	mu              sync.RWMutex
	ID              uuid.UUID
	SellerID        uuid.UUID
	SellerUsername  string
	RelicID         uuid.UUID
	EventSymbol     string
	EventName       string
	StartPrice      int64
	ReservePrice    int64
	CurrentPrice    int64
	DurationSeconds int
	StartedAt       time.Time
	Status          models.AuctionStatus
}

// CalculatePrice applies the linear decay formula:
// P(t) = max(P_reserve, P_start - ((P_start - P_reserve) / T_total) * t)
func CalculatePrice(startPrice, reservePrice int64, durationSec int, elapsedSec float64) int64 {
	if elapsedSec <= 0 {
		return startPrice
	}
	if elapsedSec >= float64(durationSec) {
		return reservePrice
	}

	decayRate := float64(startPrice-reservePrice) / float64(durationSec)
	decayed := float64(startPrice) - (decayRate * elapsedSec)

	res := int64(math.Round(decayed))
	if res < reservePrice {
		return reservePrice
	}
	return res
}

// AuctionEngine manages real-time Dutch auction price decay, in-memory atomic snipes, and settlement handoffs
type AuctionEngine struct {
	mu       sync.RWMutex
	auctions map[uuid.UUID]*LiveAuction
	pool     *pgxpool.Pool
	hub      *ws.Hub
}

func NewAuctionEngine(pool *pgxpool.Pool, hub *ws.Hub) *AuctionEngine {
	return &AuctionEngine{
		auctions: make(map[uuid.UUID]*LiveAuction),
		pool:     pool,
		hub:      hub,
	}
}

// RegisterAuction inserts an active auction into the in-memory decay engine
func (e *AuctionEngine) RegisterAuction(auc *models.DutchAuction) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.auctions[auc.ID] = &LiveAuction{
		ID:              auc.ID,
		SellerID:        auc.SellerID,
		SellerUsername:  auc.SellerUsername,
		RelicID:         auc.RelicID,
		EventSymbol:     auc.EventSymbol,
		EventName:       auc.EventName,
		StartPrice:      auc.StartPrice,
		ReservePrice:    auc.ReservePrice,
		CurrentPrice:    auc.StartPrice,
		DurationSeconds: auc.DurationSeconds,
		StartedAt:       auc.StartedAt,
		Status:          models.AuctionStatusActive,
	}

	log.Printf("⏳ [Dutch Auction Engine] Registered auction %s for %s (Start: ₹%d -> Floor: ₹%d, Duration: %ds)",
		auc.ID, auc.EventSymbol, auc.StartPrice, auc.ReservePrice, auc.DurationSeconds)
}

// Start begins the 1-second decay tick runner
func (e *AuctionEngine) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				e.tick(ctx, now.UTC())
			}
		}
	}()
	log.Println("⚡ [Dutch Auction Engine] Real-time 1-second price decay ticker started.")
}

func (e *AuctionEngine) tick(ctx context.Context, now time.Time) {
	e.mu.Lock()
	var toExpire []*LiveAuction
	var tickUpdates []map[string]interface{}

	for _, auc := range e.auctions {
		auc.mu.Lock()
		if auc.Status != models.AuctionStatusActive {
			auc.mu.Unlock()
			continue
		}

		elapsed := now.Sub(auc.StartedAt).Seconds()
		if elapsed >= float64(auc.DurationSeconds) {
			auc.Status = models.AuctionStatusExpired
			auc.CurrentPrice = auc.ReservePrice
			toExpire = append(toExpire, auc)
			auc.mu.Unlock()
			continue
		}

		newPrice := CalculatePrice(auc.StartPrice, auc.ReservePrice, auc.DurationSeconds, elapsed)
		auc.CurrentPrice = newPrice
		timeRem := int(float64(auc.DurationSeconds) - elapsed)
		if timeRem < 0 {
			timeRem = 0
		}
		progressPct := (elapsed / float64(auc.DurationSeconds)) * 100.0

		tickUpdates = append(tickUpdates, map[string]interface{}{
			"auction_id":             auc.ID.String(),
			"event_symbol":           auc.EventSymbol,
			"current_price":          newPrice,
			"time_remaining_seconds": timeRem,
			"progress_percentage":    math.Round(progressPct*10.0) / 10.0,
		})
		auc.mu.Unlock()
	}

	// Remove expired from memory map
	for _, exp := range toExpire {
		delete(e.auctions, exp.ID)
	}
	e.mu.Unlock()

	// Broadcast tick updates over WebSocket Hub
	if len(tickUpdates) > 0 && e.hub != nil {
		e.hub.BroadcastAll("DUTCH_AUCTION_TICK", map[string]interface{}{
			"type":    "DUTCH_AUCTION_TICK",
			"event":   "DUTCH_AUCTION_TICK",
			"updates": tickUpdates,
		})
	}

	// Process expired auctions asynchronously in database
	for _, exp := range toExpire {
		go e.handleAuctionExpiry(context.Background(), exp)
	}
}

// handleAuctionExpiry unlocks ticket back to seller and reverses escrow
func (e *AuctionEngine) handleAuctionExpiry(ctx context.Context, auc *LiveAuction) {
	log.Printf("⌛ [Dutch Auction Expired] Auction %s for %s timed out. Releasing escrow...", auc.ID, auc.EventSymbol)

	if e.pool == nil {
		return
	}

	tx, err := e.pool.Begin(ctx)
	if err != nil {
		log.Printf("❌ [Auction Expiry Error] DB transaction begin failed: %v", err)
		return
	}
	defer tx.Rollback(ctx)

	// Update auction status
	_, err = tx.Exec(ctx, `
		UPDATE public.dutch_auctions
		SET status = 'EXPIRED', current_price = reserve_price, updated_at = NOW()
		WHERE id = $1;
	`, auc.ID)
	if err != nil {
		log.Printf("❌ [Auction Expiry Error] Update status failed: %v", err)
		return
	}

	// Unlock relic back to AVAILABLE
	_, err = tx.Exec(ctx, `
		UPDATE public.relic_inventory
		SET status = 'AVAILABLE', updated_at = NOW()
		WHERE id = $1;
	`, auc.RelicID)
	if err != nil {
		log.Printf("❌ [Auction Expiry Error] Unlock relic failed: %v", err)
		return
	}

	// Reverse double-entry escrow ledger
	var sellerLockedTicketAccountID, sellerAvailTicketAccountID uuid.UUID
	err = tx.QueryRow(ctx, `
		SELECT id FROM public.accounts 
		WHERE user_id = $1 AND currency = $2 AND account_type = 'ESCROW_LOCKED'
	`, auc.SellerID, auc.EventSymbol).Scan(&sellerLockedTicketAccountID)
	if err == nil {
		err = tx.QueryRow(ctx, `
			SELECT id FROM public.accounts 
			WHERE user_id = $1 AND currency = $2 AND account_type = 'AVAILABLE'
		`, auc.SellerID, auc.EventSymbol).Scan(&sellerAvailTicketAccountID)
	}

	if err == nil {
		var txnID uuid.UUID
		err = tx.QueryRow(ctx, `
			INSERT INTO public.transactions (reference_id, transaction_type)
			VALUES ($1, 'AUCTION_EXPIRED_UNLOCK')
			RETURNING id;
		`, auc.ID.String()).Scan(&txnID)

		if err == nil {
			_, _ = tx.Exec(ctx, `
				INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
				VALUES 
					($1, $2, -1.0),
					($1, $3, 1.0);
			`, txnID, sellerLockedTicketAccountID, sellerAvailTicketAccountID)
		}
	}

	_ = tx.Commit(ctx)

	if e.hub != nil {
		e.hub.BroadcastAll("DUTCH_AUCTION_EXPIRED", map[string]interface{}{
			"type":         "DUTCH_AUCTION_EXPIRED",
			"auction_id":   auc.ID.String(),
			"event_symbol": auc.EventSymbol,
		})
	}
}

// SnipeAuction executes an atomic in-memory claim and routes directly to double-entry settlement
func (e *AuctionEngine) SnipeAuction(ctx context.Context, auctionID, buyerID uuid.UUID) (*models.DutchAuction, int64, error) {
	e.mu.Lock()
	auc, exists := e.auctions[auctionID]
	if !exists {
		e.mu.Unlock()
		return nil, 0, ErrAuctionNotFound
	}

	auc.mu.Lock()
	defer auc.mu.Unlock()

	// 1. Strict FCFS Check
	if auc.Status != models.AuctionStatusActive {
		e.mu.Unlock()
		return nil, 0, ErrAuctionClaimed
	}

	// 2. Prevent self-bidding
	if auc.SellerID == buyerID {
		e.mu.Unlock()
		return nil, 0, ErrSelfAuction
	}

	// 3. Atomically claim and freeze current clearing price
	now := time.Now().UTC()
	elapsed := now.Sub(auc.StartedAt).Seconds()
	if elapsed >= float64(auc.DurationSeconds) {
		auc.Status = models.AuctionStatusExpired
		delete(e.auctions, auctionID)
		e.mu.Unlock()
		return nil, 0, ErrAuctionExpired
	}

	clearingPrice := CalculatePrice(auc.StartPrice, auc.ReservePrice, auc.DurationSeconds, elapsed)
	auc.Status = models.AuctionStatusSettled
	auc.CurrentPrice = clearingPrice

	// Remove from active in-memory auctions
	delete(e.auctions, auctionID)
	e.mu.Unlock()

	// 4. Execute atomic double-entry settlement & cryptographic QR rotation
	err := e.settleAuctionInDB(ctx, auc, buyerID, clearingPrice, now)
	if err != nil {
		// Restore to active on settlement failure
		auc.Status = models.AuctionStatusActive
		e.mu.Lock()
		e.auctions[auctionID] = auc
		e.mu.Unlock()
		return nil, 0, fmt.Errorf("settlement failed: %w", err)
	}

	result := &models.DutchAuction{
		ID:              auc.ID,
		SellerID:        auc.SellerID,
		RelicID:         auc.RelicID,
		EventSymbol:     auc.EventSymbol,
		StartPrice:      auc.StartPrice,
		ReservePrice:    auc.ReservePrice,
		CurrentPrice:    clearingPrice,
		ClearingPrice:   &clearingPrice,
		DurationSeconds: auc.DurationSeconds,
		BuyerID:         &buyerID,
		Status:          models.AuctionStatusSettled,
		StartedAt:       auc.StartedAt,
		SettledAt:       &now,
		UpdatedAt:       now,
	}

	// Broadcast settlement notification over WebSocket
	if e.hub != nil {
		e.hub.BroadcastAll("DUTCH_AUCTION_SETTLED", map[string]interface{}{
			"type":           "DUTCH_AUCTION_SETTLED",
			"auction_id":     auc.ID.String(),
			"event_symbol":   auc.EventSymbol,
			"clearing_price": clearingPrice,
			"buyer_id":       buyerID.String(),
			"settled_at":     now,
		})
	}

	return result, clearingPrice, nil
}

// GetActiveAuctions returns all currently active auctions with live calculated prices
func (e *AuctionEngine) GetActiveAuctions(symbol string) []*models.DutchAuction {
	e.mu.RLock()
	defer e.mu.RUnlock()

	now := time.Now().UTC()
	var result []*models.DutchAuction

	for _, auc := range e.auctions {
		auc.mu.RLock()
		if auc.Status != models.AuctionStatusActive {
			auc.mu.RUnlock()
			continue
		}
		if symbol != "" && auc.EventSymbol != symbol {
			auc.mu.RUnlock()
			continue
		}

		elapsed := now.Sub(auc.StartedAt).Seconds()
		timeRem := int(float64(auc.DurationSeconds) - elapsed)
		if timeRem < 0 {
			timeRem = 0
		}
		curPrice := CalculatePrice(auc.StartPrice, auc.ReservePrice, auc.DurationSeconds, elapsed)
		progressPct := (elapsed / float64(auc.DurationSeconds)) * 100.0

		result = append(result, &models.DutchAuction{
			ID:                   auc.ID,
			SellerID:             auc.SellerID,
			SellerUsername:       auc.SellerUsername,
			RelicID:              auc.RelicID,
			EventSymbol:          auc.EventSymbol,
			EventName:            auc.EventName,
			StartPrice:           auc.StartPrice,
			ReservePrice:         auc.ReservePrice,
			CurrentPrice:         curPrice,
			DurationSeconds:      auc.DurationSeconds,
			Status:               models.AuctionStatusActive,
			StartedAt:            auc.StartedAt,
			TimeRemainingSeconds: timeRem,
			ProgressPercentage:   math.Round(progressPct*10.0) / 10.0,
		})
		auc.mu.RUnlock()
	}

	return result
}

// HydrateFromDB loads active auctions from PostgreSQL upon server startup
func (e *AuctionEngine) HydrateFromDB(ctx context.Context) error {
	if e.pool == nil {
		return nil
	}

	rows, err := e.pool.Query(ctx, `
		SELECT da.id, da.seller_id, da.relic_id, da.event_symbol, 
		       da.start_price, da.reserve_price, da.duration_seconds, da.started_at,
		       COALESCE(u.username, 'seller'), COALESCE(ev.name, da.event_symbol)
		FROM public.dutch_auctions da
		LEFT JOIN public.users u ON da.seller_id = u.id
		LEFT JOIN public.events ev ON da.event_symbol = ev.symbol
		WHERE da.status = 'ACTIVE';
	`)
	if err != nil {
		return fmt.Errorf("failed to query active auctions: %w", err)
	}
	defer rows.Close()

	now := time.Now().UTC()
	loadedCount := 0

	for rows.Next() {
		var id, sellerID, relicID uuid.UUID
		var symbol, username, eventName string
		var startPrice, reservePrice int64
		var durationSec int
		var startedAt time.Time

		err := rows.Scan(&id, &sellerID, &relicID, &symbol, &startPrice, &reservePrice, &durationSec, &startedAt, &username, &eventName)
		if err == nil {
			elapsed := now.Sub(startedAt).Seconds()
			if elapsed < float64(durationSec) {
				auc := &models.DutchAuction{
					ID:              id,
					SellerID:        sellerID,
					SellerUsername:  username,
					RelicID:         relicID,
					EventSymbol:     symbol,
					EventName:       eventName,
					StartPrice:      startPrice,
					ReservePrice:    reservePrice,
					DurationSeconds: durationSec,
					StartedAt:       startedAt,
					Status:          models.AuctionStatusActive,
				}
				e.RegisterAuction(auc)
				loadedCount++
			}
		}
	}

	log.Printf("⚡ [Dutch Auction Engine] Hydrated %d active Dutch auction(s) from PostgreSQL.", loadedCount)
	return nil
}

