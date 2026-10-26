package engine

import (
	"errors"
	"fmt"
	"os"
	"sync"
	"time"

	"darkhold-dex/backend/pkg/models"

	"github.com/google/uuid"
)

var (
	ErrCollarBreach          = errors.New("COLLAR_BREACH: price exceeds dynamic anti-scalper collar ceiling")
	ErrInvalidOrder          = errors.New("invalid order parameters")
	ErrOrderNotFound         = errors.New("order not found in book")
	ErrInsufficientLiquidity = errors.New("insufficient liquidity to fulfill market order")
)

// isSelfTradePrevented determines if an order should be prevented from matching against itself (wash-trading guard).
// In production, self-trading is blocked by default.
// In development, self-trading is allowed so single-user testing can execute trades immediately,
// unless PREVENT_SELF_TRADE=true is explicitly set.
func isSelfTradePrevented(u1, u2 uuid.UUID) bool {
	if u1 != u2 {
		return false
	}
	if os.Getenv("PREVENT_SELF_TRADE") == "true" {
		return true
	}
	if os.Getenv("ALLOW_SELF_MATCH") == "true" {
		return false
	}
	if os.Getenv("ENVIRONMENT") == "development" {
		return false
	}
	return true
}

// PriceLevel holds a queue of orders resting at a single price
type PriceLevel struct {
	Price  float64
	Orders []*models.Order
}

func (pl *PriceLevel) TotalQuantity() int {
	total := 0
	for _, o := range pl.Orders {
		total += o.UnfilledQuantity()
	}
	return total
}

func (pl *PriceLevel) OrderCount() int {
	return len(pl.Orders)
}

// OrderBook represents an isolated in-memory FIFO order book for a single event trading pair
type OrderBook struct {
	mu           sync.RWMutex
	EventSymbol  string
	MaxSellPrice float64 // Anti-scalping collar ceiling
	Bids         []*PriceLevel // Sorted descending (highest bid first)
	Asks         []*PriceLevel // Sorted ascending (lowest ask first)
	OrdersMap    map[uuid.UUID]*models.Order
}

// NewOrderBook creates a new OrderBook instance
func NewOrderBook(eventSymbol string, maxSellPrice float64) *OrderBook {
	return &OrderBook{
		EventSymbol:  eventSymbol,
		MaxSellPrice: maxSellPrice,
		Bids:         make([]*PriceLevel, 0),
		Asks:         make([]*PriceLevel, 0),
		OrdersMap:    make(map[uuid.UUID]*models.Order),
	}
}

// ValidateCollar checks if order price breaches the anti-scalping price ceiling
func (ob *OrderBook) ValidateCollar(order *models.Order) error {
	if ob.MaxSellPrice > 0 && order.Price > ob.MaxSellPrice {
		return fmt.Errorf("%w: price ₹%.2f exceeds collar ceiling of ₹%.2f for %s",
			ErrCollarBreach, order.Price, ob.MaxSellPrice, ob.EventSymbol)
	}
	return nil
}

// MatchOrder matches an incoming order against the opposite book using Price-Time FIFO
func (ob *OrderBook) MatchOrder(incoming *models.Order) ([]*models.Trade, error) {
	if incoming.Quantity <= 0 {
		return nil, ErrInvalidOrder
	}
	if incoming.OrderType == models.OrderTypeLimit && incoming.Price <= 0 {
		return nil, ErrInvalidOrder
	}

	// Validate Anti-Scalping Dynamic Collar
	if err := ob.ValidateCollar(incoming); err != nil {
		return nil, err
	}

	ob.mu.Lock()
	defer ob.mu.Unlock()

	var trades []*models.Trade

	if incoming.Side == models.SideBuy {
		trades = ob.matchBuy(incoming)
	} else {
		trades = ob.matchSell(incoming)
	}

	// If limit order has remaining unfilled quantity, insert it into the book
	if incoming.OrderType == models.OrderTypeLimit && incoming.UnfilledQuantity() > 0 {
		ob.insertRestingOrderLocked(incoming)
	}

	// Sweep any resting crossed orders (e.g. if conditions allow matching)
	crossedTrades := ob.MatchCrossedOrdersLocked()
	if len(crossedTrades) > 0 {
		trades = append(trades, crossedTrades...)
	}

	return trades, nil
}

// matchBuy matches an incoming Buy order against the resting Asks (lowest asks first)
func (ob *OrderBook) matchBuy(buyOrder *models.Order) []*models.Trade {
	var trades []*models.Trade
	now := time.Now().UTC()

	var remainingAsks []*PriceLevel

	for _, level := range ob.Asks {
		if buyOrder.UnfilledQuantity() == 0 {
			remainingAsks = append(remainingAsks, level)
			continue
		}

		// For Limit orders, if ask price > buyer's limit, stop matching
		if buyOrder.OrderType == models.OrderTypeLimit && level.Price > buyOrder.Price {
			remainingAsks = append(remainingAsks, level)
			continue
		}

		// Execute against FIFO orders at this price level
		var remainingOrders []*models.Order
		for _, restingAsk := range level.Orders {
			if buyOrder.UnfilledQuantity() == 0 {
				remainingOrders = append(remainingOrders, restingAsk)
				continue
			}

			// Don't match user with themselves if self-trade prevention is active
			if isSelfTradePrevented(restingAsk.UserID, buyOrder.UserID) {
				remainingOrders = append(remainingOrders, restingAsk)
				continue
			}

			needed := buyOrder.UnfilledQuantity()
			available := restingAsk.UnfilledQuantity()
			matchQty := needed
			if available < matchQty {
				matchQty = available
			}

			if matchQty > 0 {
				// Trade execution price is the maker's (resting) price
				trade := &models.Trade{
					ID:           uuid.New(),
					TakerOrderID: buyOrder.ID,
					MakerOrderID: restingAsk.ID,
					EventSymbol:  ob.EventSymbol,
					Price:        restingAsk.Price,
					Quantity:     matchQty,
					ExecutedAt:   now,
				}
				trades = append(trades, trade)

				buyOrder.FilledQuantity += matchQty
				restingAsk.FilledQuantity += matchQty

				if restingAsk.UnfilledQuantity() == 0 {
					restingAsk.Status = models.OrderStatusFilled
					delete(ob.OrdersMap, restingAsk.ID)
				} else {
					restingAsk.Status = models.OrderStatusPartiallyFilled
					remainingOrders = append(remainingOrders, restingAsk)
				}
			}
		}

		if len(remainingOrders) > 0 {
			level.Orders = remainingOrders
			remainingAsks = append(remainingAsks, level)
		}
	}

	ob.Asks = remainingAsks

	if buyOrder.UnfilledQuantity() == 0 {
		buyOrder.Status = models.OrderStatusFilled
	} else if buyOrder.FilledQuantity > 0 {
		buyOrder.Status = models.OrderStatusPartiallyFilled
	}

	return trades
}

// matchSell matches an incoming Sell order against resting Bids (highest bids first)
func (ob *OrderBook) matchSell(sellOrder *models.Order) []*models.Trade {
	var trades []*models.Trade
	now := time.Now().UTC()

	var remainingBids []*PriceLevel

	for _, level := range ob.Bids {
		if sellOrder.UnfilledQuantity() == 0 {
			remainingBids = append(remainingBids, level)
			continue
		}

		// For Limit orders, if bid price < seller's minimum price, stop matching
		if sellOrder.OrderType == models.OrderTypeLimit && level.Price < sellOrder.Price {
			remainingBids = append(remainingBids, level)
			continue
		}

		var remainingOrders []*models.Order
		for _, restingBid := range level.Orders {
			if sellOrder.UnfilledQuantity() == 0 {
				remainingOrders = append(remainingOrders, restingBid)
				continue
			}

			// Don't match user with themselves if self-trade prevention is active
			if isSelfTradePrevented(restingBid.UserID, sellOrder.UserID) {
				remainingOrders = append(remainingOrders, restingBid)
				continue
			}

			needed := sellOrder.UnfilledQuantity()
			available := restingBid.UnfilledQuantity()
			matchQty := needed
			if available < matchQty {
				matchQty = available
			}

			if matchQty > 0 {
				trade := &models.Trade{
					ID:           uuid.New(),
					TakerOrderID: sellOrder.ID,
					MakerOrderID: restingBid.ID,
					EventSymbol:  ob.EventSymbol,
					Price:        restingBid.Price,
					Quantity:     matchQty,
					ExecutedAt:   now,
				}
				trades = append(trades, trade)

				sellOrder.FilledQuantity += matchQty
				restingBid.FilledQuantity += matchQty

				if restingBid.UnfilledQuantity() == 0 {
					restingBid.Status = models.OrderStatusFilled
					delete(ob.OrdersMap, restingBid.ID)
				} else {
					restingBid.Status = models.OrderStatusPartiallyFilled
					remainingOrders = append(remainingOrders, restingBid)
				}
			}
		}

		if len(remainingOrders) > 0 {
			level.Orders = remainingOrders
			remainingBids = append(remainingBids, level)
		}
	}

	ob.Bids = remainingBids

	if sellOrder.UnfilledQuantity() == 0 {
		sellOrder.Status = models.OrderStatusFilled
	} else if sellOrder.FilledQuantity > 0 {
		sellOrder.Status = models.OrderStatusPartiallyFilled
	}

	return trades
}

// MatchCrossedOrdersLocked sweeps and matches any crossed resting orders in the book (Bids[0].Price >= Asks[0].Price)
func (ob *OrderBook) MatchCrossedOrdersLocked() []*models.Trade {
	var trades []*models.Trade
	now := time.Now().UTC()

	for len(ob.Bids) > 0 && len(ob.Asks) > 0 {
		bestBidLevel := ob.Bids[0]
		bestAskLevel := ob.Asks[0]

		if bestBidLevel.Price < bestAskLevel.Price {
			break // Book is healthy and no longer crossed
		}

		if len(bestBidLevel.Orders) == 0 {
			ob.Bids = ob.Bids[1:]
			continue
		}
		if len(bestAskLevel.Orders) == 0 {
			ob.Asks = ob.Asks[1:]
			continue
		}

		bestBid := bestBidLevel.Orders[0]
		bestAsk := bestAskLevel.Orders[0]

		if isSelfTradePrevented(bestBid.UserID, bestAsk.UserID) {
			break // Cannot match further due to self-trade prevention
		}

		needed := bestBid.UnfilledQuantity()
		available := bestAsk.UnfilledQuantity()
		matchQty := needed
		if available < matchQty {
			matchQty = available
		}

		if matchQty <= 0 {
			break
		}

		// Maker is the older order
		var makerID, takerID uuid.UUID
		var execPrice float64
		if bestAsk.CreatedAt.Before(bestBid.CreatedAt) {
			makerID = bestAsk.ID
			takerID = bestBid.ID
			execPrice = bestAsk.Price
		} else {
			makerID = bestBid.ID
			takerID = bestAsk.ID
			execPrice = bestBid.Price
		}

		trade := &models.Trade{
			ID:           uuid.New(),
			TakerOrderID: takerID,
			MakerOrderID: makerID,
			EventSymbol:  ob.EventSymbol,
			Price:        execPrice,
			Quantity:     matchQty,
			ExecutedAt:   now,
		}
		trades = append(trades, trade)

		bestBid.FilledQuantity += matchQty
		bestAsk.FilledQuantity += matchQty

		if bestBid.UnfilledQuantity() == 0 {
			bestBid.Status = models.OrderStatusFilled
			delete(ob.OrdersMap, bestBid.ID)
			bestBidLevel.Orders = bestBidLevel.Orders[1:]
		} else {
			bestBid.Status = models.OrderStatusPartiallyFilled
		}

		if bestAsk.UnfilledQuantity() == 0 {
			bestAsk.Status = models.OrderStatusFilled
			delete(ob.OrdersMap, bestAsk.ID)
			bestAskLevel.Orders = bestAskLevel.Orders[1:]
		} else {
			bestAsk.Status = models.OrderStatusPartiallyFilled
		}

		if len(bestBidLevel.Orders) == 0 {
			ob.Bids = ob.Bids[1:]
		}
		if len(bestAskLevel.Orders) == 0 {
			ob.Asks = ob.Asks[1:]
		}
	}

	return trades
}

// MatchCrossedOrders thread-safely resolves any crossed orders resting in the book
func (ob *OrderBook) MatchCrossedOrders() []*models.Trade {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	return ob.MatchCrossedOrdersLocked()
}

// insertRestingOrderLocked inserts an unfilled limit order into the book
func (ob *OrderBook) insertRestingOrderLocked(order *models.Order) {
	ob.OrdersMap[order.ID] = order

	if order.Side == models.SideBuy {
		// Insert into Bids (descending order)
		idx := -1
		for i, lvl := range ob.Bids {
			if lvl.Price == order.Price {
				lvl.Orders = append(lvl.Orders, order)
				return
			}
			if lvl.Price < order.Price {
				idx = i
				break
			}
		}
		newLevel := &PriceLevel{Price: order.Price, Orders: []*models.Order{order}}
		if idx == -1 {
			ob.Bids = append(ob.Bids, newLevel)
		} else {
			ob.Bids = append(ob.Bids[:idx], append([]*PriceLevel{newLevel}, ob.Bids[idx:]...)...)
		}
	} else {
		// Insert into Asks (ascending order)
		idx := -1
		for i, lvl := range ob.Asks {
			if lvl.Price == order.Price {
				lvl.Orders = append(lvl.Orders, order)
				return
			}
			if lvl.Price > order.Price {
				idx = i
				break
			}
		}
		newLevel := &PriceLevel{Price: order.Price, Orders: []*models.Order{order}}
		if idx == -1 {
			ob.Asks = append(ob.Asks, newLevel)
		} else {
			ob.Asks = append(ob.Asks[:idx], append([]*PriceLevel{newLevel}, ob.Asks[idx:]...)...)
		}
	}
}

// InsertRestingOrder public method for loading active orders on engine startup
func (ob *OrderBook) InsertRestingOrder(order *models.Order) {
	ob.mu.Lock()
	defer ob.mu.Unlock()
	ob.insertRestingOrderLocked(order)
}

// CancelOrder removes an active order from the in-memory book
func (ob *OrderBook) CancelOrder(orderID uuid.UUID) (*models.Order, error) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	order, exists := ob.OrdersMap[orderID]
	if !exists {
		return nil, ErrOrderNotFound
	}

	delete(ob.OrdersMap, orderID)
	order.Status = models.OrderStatusCancelled

	if order.Side == models.SideBuy {
		ob.Bids = removeOrderFromLevels(ob.Bids, orderID)
	} else {
		ob.Asks = removeOrderFromLevels(ob.Asks, orderID)
	}

	return order, nil
}

func removeOrderFromLevels(levels []*PriceLevel, orderID uuid.UUID) []*PriceLevel {
	var newLevels []*PriceLevel
	for _, lvl := range levels {
		var remainingOrders []*models.Order
		for _, o := range lvl.Orders {
			if o.ID != orderID {
				remainingOrders = append(remainingOrders, o)
			}
		}
		if len(remainingOrders) > 0 {
			lvl.Orders = remainingOrders
			newLevels = append(newLevels, lvl)
		}
	}
	return newLevels
}

// GetL2Depth computes aggregated Level-2 depth ladder up to `limit` price tiers
func (ob *OrderBook) GetL2Depth(limit int) models.L2OrderBook {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if limit <= 0 || limit > 50 {
		limit = 20
	}

	bidLevels := make([]models.L2PriceLevel, 0, limit)
	for i, lvl := range ob.Bids {
		if i >= limit {
			break
		}
		bidLevels = append(bidLevels, models.L2PriceLevel{
			Price:      lvl.Price,
			Quantity:   lvl.TotalQuantity(),
			OrderCount: lvl.OrderCount(),
		})
	}

	askLevels := make([]models.L2PriceLevel, 0, limit)
	for i, lvl := range ob.Asks {
		if i >= limit {
			break
		}
		askLevels = append(askLevels, models.L2PriceLevel{
			Price:      lvl.Price,
			Quantity:   lvl.TotalQuantity(),
			OrderCount: lvl.OrderCount(),
		})
	}

	bestBid := 0.0
	if len(bidLevels) > 0 {
		bestBid = bidLevels[0].Price
	}

	bestAsk := 0.0
	if len(askLevels) > 0 {
		bestAsk = askLevels[0].Price
	}

	spread := 0.0
	if bestAsk > 0 && bestBid > 0 {
		spread = bestAsk - bestBid
	}

	return models.L2OrderBook{
		EventSymbol: ob.EventSymbol,
		Bids:        bidLevels,
		Asks:        askLevels,
		Spread:      spread,
		BestBid:     bestBid,
		BestAsk:     bestAsk,
		Timestamp:   time.Now().UTC(),
	}
}

// Stats returns book counts and active order summary
func (ob *OrderBook) Stats() map[string]interface{} {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	totalBidQty := 0
	for _, l := range ob.Bids {
		totalBidQty += l.TotalQuantity()
	}

	totalAskQty := 0
	for _, l := range ob.Asks {
		totalAskQty += l.TotalQuantity()
	}

	return map[string]interface{}{
		"event_symbol":   ob.EventSymbol,
		"active_orders":  len(ob.OrdersMap),
		"bid_levels":     len(ob.Bids),
		"ask_levels":     len(ob.Asks),
		"total_bid_qty":  totalBidQty,
		"total_ask_qty":  totalAskQty,
		"max_sell_price": ob.MaxSellPrice,
	}
}
