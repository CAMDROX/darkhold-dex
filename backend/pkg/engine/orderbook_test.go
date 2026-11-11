package engine

import (
	"testing"
	"time"

	"darkhold-dex/backend/pkg/models"

	"github.com/google/uuid"
)

// TestSelfTradePrevention verifies that orders placed by the same user NEVER match against each other
func TestSelfTradePrevention(t *testing.T) {
	ob := NewOrderBook("WEBSTER_26", 2000)
	userA := uuid.New()
	userB := uuid.New()

	// 1. User A places a Buy order @ ₹150 for 2 tickets
	buyOrderA := &models.Order{
		ID:             uuid.New(),
		UserID:         userA,
		EventSymbol:    "WEBSTER_26",
		Side:           models.SideBuy,
		OrderType:      models.OrderTypeLimit,
		Price:          150,
		Quantity:       2,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      time.Now().UTC(),
	}

	trades, err := ob.MatchOrder(buyOrderA)
	if err != nil {
		t.Fatalf("unexpected error placing buy order: %v", err)
	}
	if len(trades) != 0 {
		t.Fatalf("expected 0 trades for initial buy, got %d", len(trades))
	}

	// 2. User A places a Sell order @ ₹150 for 1 ticket (Crossing their own buy order)
	sellOrderA := &models.Order{
		ID:             uuid.New(),
		UserID:         userA,
		EventSymbol:    "WEBSTER_26",
		Side:           models.SideSell,
		OrderType:      models.OrderTypeLimit,
		Price:          150,
		Quantity:       1,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      time.Now().UTC(),
	}

	tradesSelf, err := ob.MatchOrder(sellOrderA)
	if err != nil {
		t.Fatalf("unexpected error placing sell order: %v", err)
	}

	// VERIFY: Wash-trading guard prevented match between identical user IDs
	if len(tradesSelf) != 0 {
		t.Fatalf("CRITICAL SECURITY FLAW: Self-trade was matched! Expected 0 trades between User A and User A, got %d", len(tradesSelf))
	}

	if buyOrderA.FilledQuantity != 0 || sellOrderA.FilledQuantity != 0 {
		t.Fatalf("expected 0 filled quantity on self-orders, got buy=%d, sell=%d",
			buyOrderA.FilledQuantity, sellOrderA.FilledQuantity)
	}

	// 3. User B places a Sell order @ ₹150 for 1 ticket
	sellOrderB := &models.Order{
		ID:             uuid.New(),
		UserID:         userB,
		EventSymbol:    "WEBSTER_26",
		Side:           models.SideSell,
		OrderType:      models.OrderTypeLimit,
		Price:          150,
		Quantity:       1,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      time.Now().UTC(),
	}

	tradesValid, err := ob.MatchOrder(sellOrderB)
	if err != nil {
		t.Fatalf("unexpected error placing user B sell order: %v", err)
	}

	if len(tradesValid) != 1 {
		t.Fatalf("expected 1 valid trade between User B and User A, got %d", len(tradesValid))
	}

	trade := tradesValid[0]
	if trade.Price != 150 {
		t.Errorf("expected trade price 150, got %d", trade.Price)
	}
	if trade.Quantity != 1 {
		t.Errorf("expected trade quantity 1, got %d", trade.Quantity)
	}
	if buyOrderA.FilledQuantity != 1 {
		t.Errorf("expected buyer filled quantity 1, got %d", buyOrderA.FilledQuantity)
	}
}

// TestPriceTimeFIFO verifies strict FIFO queuing where older orders at the same price execute first
func TestPriceTimeFIFO(t *testing.T) {
	ob := NewOrderBook("COLDPLAY_26", 5000)
	userA := uuid.New()
	userB := uuid.New()
	buyerC := uuid.New()

	// Seller A posts 1 ticket @ ₹500
	sellA := &models.Order{
		ID:             uuid.New(),
		UserID:         userA,
		EventSymbol:    "COLDPLAY_26",
		Side:           models.SideSell,
		OrderType:      models.OrderTypeLimit,
		Price:          500,
		Quantity:       1,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      time.Now().UTC().Add(-10 * time.Minute), // Earlier
	}
	_, _ = ob.MatchOrder(sellA)

	// Seller B posts 1 ticket @ ₹500 later
	sellB := &models.Order{
		ID:             uuid.New(),
		UserID:         userB,
		EventSymbol:    "COLDPLAY_26",
		Side:           models.SideSell,
		OrderType:      models.OrderTypeLimit,
		Price:          500,
		Quantity:       1,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      time.Now().UTC(), // Later
	}
	_, _ = ob.MatchOrder(sellB)

	// Buyer C buys 1 ticket @ ₹500
	buyC := &models.Order{
		ID:             uuid.New(),
		UserID:         buyerC,
		EventSymbol:    "COLDPLAY_26",
		Side:           models.SideBuy,
		OrderType:      models.OrderTypeLimit,
		Price:          500,
		Quantity:       1,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
		CreatedAt:      time.Now().UTC(),
	}

	trades, err := ob.MatchOrder(buyC)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(trades) != 1 {
		t.Fatalf("expected 1 trade, got %d", len(trades))
	}

	// Verify Seller A (FIFO head) was matched first, Seller B remains in book
	if trades[0].MakerOrderID != sellA.ID {
		t.Fatalf("FIFO violation: expected MakerOrderID %s (Seller A), got %s", sellA.ID, trades[0].MakerOrderID)
	}
	if sellA.Status != models.OrderStatusFilled {
		t.Errorf("expected Seller A filled, got %s", sellA.Status)
	}
	if sellB.Status != models.OrderStatusOpen {
		t.Errorf("expected Seller B still OPEN, got %s", sellB.Status)
	}
}

// TestDynamicCollarCeiling verifies that orders breaching the anti-scalping ceiling are rejected
func TestDynamicCollarCeiling(t *testing.T) {
	ob := NewOrderBook("WEBSTER_26", 1500) // Collar cap = ₹1500

	predatoryOrder := &models.Order{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		EventSymbol:    "WEBSTER_26",
		Side:           models.SideSell,
		OrderType:      models.OrderTypeLimit,
		Price:          1501, // Exceeds collar cap by ₹1
		Quantity:       1,
		FilledQuantity: 0,
		Status:         models.OrderStatusOpen,
	}

	_, err := ob.MatchOrder(predatoryOrder)
	if err == nil {
		t.Fatal("expected ErrCollarBreach for limit price exceeding collar cap, got nil")
	}
}

// TestO1Cancellation verifies that cancelling arbitrary orders works in O(1) without error
func TestO1Cancellation(t *testing.T) {
	ob := NewOrderBook("ED_SHEERAN", 3000)
	user := uuid.New()

	orders := make([]*models.Order, 100)
	for i := 0; i < 100; i++ {
		orders[i] = &models.Order{
			ID:             uuid.New(),
			UserID:         user,
			EventSymbol:    "ED_SHEERAN",
			Side:           models.SideBuy,
			OrderType:      models.OrderTypeLimit,
			Price:          100 + int64(i%10),
			Quantity:       1,
			FilledQuantity: 0,
			Status:         models.OrderStatusOpen,
			CreatedAt:      time.Now().UTC(),
		}
		_, _ = ob.MatchOrder(orders[i])
	}

	if len(ob.OrdersMap) != 100 {
		t.Fatalf("expected 100 orders in map, got %d", len(ob.OrdersMap))
	}

	// Cancel 20 arbitrary orders
	for i := 0; i < 20; i++ {
		cancelled, err := ob.CancelOrder(orders[i].ID)
		if err != nil {
			t.Fatalf("failed to cancel order %s: %v", orders[i].ID, err)
		}
		if cancelled.Status != models.OrderStatusCancelled {
			t.Errorf("expected status CANCELLED, got %s", cancelled.Status)
		}
	}

	if len(ob.OrdersMap) != 80 {
		t.Fatalf("expected 80 orders remaining, got %d", len(ob.OrdersMap))
	}
}

// BenchmarkOrderBook_Match measures throughput and nanoseconds per match
func BenchmarkOrderBook_Match(b *testing.B) {
	ob := NewOrderBook("BENCH_EVENT", 10000)
	userA := uuid.New()
	userB := uuid.New()

	// Pre-seed resting sell orders
	for i := 0; i < 5000; i++ {
		sell := &models.Order{
			ID:             uuid.New(),
			UserID:         userA,
			EventSymbol:    "BENCH_EVENT",
			Side:           models.SideSell,
			OrderType:      models.OrderTypeLimit,
			Price:          100 + int64(i%50),
			Quantity:       10000,
			FilledQuantity: 0,
			Status:         models.OrderStatusOpen,
			CreatedAt:      time.Now().UTC(),
		}
		_, _ = ob.MatchOrder(sell)
	}

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		buy := &models.Order{
			ID:             uuid.New(),
			UserID:         userB,
			EventSymbol:    "BENCH_EVENT",
			Side:           models.SideBuy,
			OrderType:      models.OrderTypeLimit,
			Price:          140,
			Quantity:       1,
			FilledQuantity: 0,
			Status:         models.OrderStatusOpen,
			CreatedAt:      time.Now().UTC(),
		}
		_, _ = ob.MatchOrder(buy)
	}
}
