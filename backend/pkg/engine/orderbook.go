package engine

import (
	"errors"
	"fmt"
	"math"
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

// ToPriceCents converts float64 price to int64 cents to eliminate floating-point drift
func ToPriceCents(price float64) int64 {
	return int64(math.Round(price * 100.0))
}

// FromPriceCents converts int64 cents back to float64
func FromPriceCents(cents int64) float64 {
	return float64(cents) / 100.0
}

// isSelfTradePrevented determines if an order should be prevented from matching against itself (wash-trading guard).
// Strict enforcement: A user can NEVER match against their own resting order under any environment.
func isSelfTradePrevented(u1, u2 uuid.UUID) bool {
	return u1 == u2
}

// OrderNode represents an intrusive doubly-linked list node wrapping an Order.
// Enables O(1) insertion, O(1) deletion from anywhere in the list, and O(1) queue popping.
type OrderNode struct {
	Order      *models.Order
	PriceCents int64
	Level      *PriceLevel
	Prev       *OrderNode
	Next       *OrderNode
}

// OrderQueue manages a strict FIFO queue of orders at a specific price level.
type OrderQueue struct {
	Head          *OrderNode
	Tail          *OrderNode
	TotalQuantity int
	Len           int
}

// Append inserts an order at the tail of the queue in O(1)
func (q *OrderQueue) Append(node *OrderNode) {
	node.Prev = q.Tail
	node.Next = nil
	if q.Tail != nil {
		q.Tail.Next = node
	} else {
		q.Head = node
	}
	q.Tail = node
	q.TotalQuantity += node.Order.UnfilledQuantity()
	q.Len++
}

// Remove unlinks an arbitrary node from the queue in O(1)
func (q *OrderQueue) Remove(node *OrderNode) {
	if node.Prev != nil {
		node.Prev.Next = node.Next
	} else {
		q.Head = node.Next
	}
	if node.Next != nil {
		node.Next.Prev = node.Prev
	} else {
		q.Tail = node.Prev
	}
	q.TotalQuantity -= node.Order.UnfilledQuantity()
	q.Len--
	node.Prev = nil
	node.Next = nil
}

// PopHead removes and returns the head node (oldest FIFO order) in O(1)
func (q *OrderQueue) PopHead() *OrderNode {
	if q.Head == nil {
		return nil
	}
	node := q.Head
	q.Remove(node)
	return node
}

// PriceLevel holds an O(1) intrusive FIFO queue of resting orders at an exact price tier
type PriceLevel struct {
	PriceCents int64
	Price      float64
	Queue      *OrderQueue
}

func (pl *PriceLevel) TotalQuantity() int {
	if pl.Queue == nil {
		return 0
	}
	return pl.Queue.TotalQuantity
}

func (pl *PriceLevel) OrderCount() int {
	if pl.Queue == nil {
		return 0
	}
	return pl.Queue.Len
}

// Memory Pools for Zero-Allocation Steady-State Execution
var orderNodePool = sync.Pool{
	New: func() any {
		return new(OrderNode)
	},
}

var tradePool = sync.Pool{
	New: func() any {
		return new(models.Trade)
	},
}

func acquireOrderNode(order *models.Order, cents int64, level *PriceLevel) *OrderNode {
	node := orderNodePool.Get().(*OrderNode)
	node.Order = order
	node.PriceCents = cents
	node.Level = level
	node.Prev = nil
	node.Next = nil
	return node
}

func releaseOrderNode(node *OrderNode) {
	node.Order = nil
	node.Level = nil
	node.Prev = nil
	node.Next = nil
	orderNodePool.Put(node)
}

func acquireTrade() *models.Trade {
	return tradePool.Get().(*models.Trade)
}

// OrderBook represents a high-frequency in-memory FIFO order book.
// Uses an intrusive Doubly-Linked List + Hash Map + Red-Black Tree architecture:
// - Order Queues: O(1) enqueue, O(1) dequeue, O(1) arbitrary order cancellation
// - Price Levels: O(1) direct map lookup + O(1) Best Bid/Ask access via Red-Black Tree
// - Anti-Scalper Dynamic Collars & Strict Self-Trade Prevention (Wash Trading Guard)
type OrderBook struct {
	mu           sync.RWMutex
	EventSymbol  string
	MaxSellPrice float64 // Anti-scalping collar ceiling

	// Red-Black Trees for O(1) min/max and O(log L) price level operations
	bidsTree *RBTree // Highest price at Max()
	asksTree *RBTree // Lowest price at Min()

	// Direct O(1) maps from price cents -> PriceLevel
	priceMapBids map[int64]*PriceLevel
	priceMapAsks map[int64]*PriceLevel

	// Direct O(1) map from OrderID -> OrderNode for O(1) cancellation unlinking
	OrdersMap map[uuid.UUID]*OrderNode
}

// NewOrderBook creates a new high-frequency OrderBook instance
func NewOrderBook(eventSymbol string, maxSellPrice float64) *OrderBook {
	return &OrderBook{
		EventSymbol:  eventSymbol,
		MaxSellPrice: maxSellPrice,
		bidsTree:     NewRBTree(),
		asksTree:     NewRBTree(),
		priceMapBids: make(map[int64]*PriceLevel),
		priceMapAsks: make(map[int64]*PriceLevel),
		OrdersMap:    make(map[uuid.UUID]*OrderNode),
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

	// If limit order has remaining unfilled quantity, insert it into the book in O(1) / O(log L)
	if incoming.OrderType == models.OrderTypeLimit && incoming.UnfilledQuantity() > 0 {
		ob.insertRestingOrderLocked(incoming)
	}

	// Sweep any resting crossed orders (e.g. from non-self crosses)
	crossedTrades := ob.MatchCrossedOrdersLocked()
	if len(crossedTrades) > 0 {
		trades = append(trades, crossedTrades...)
	}

	return trades, nil
}

// matchBuy matches an incoming Buy order against resting Asks (lowest asks first)
func (ob *OrderBook) matchBuy(buyOrder *models.Order) []*models.Trade {
	var trades []*models.Trade
	now := time.Now().UTC()
	buyCents := ToPriceCents(buyOrder.Price)

	// Sweep through asks starting with the lowest ask (asksTree.Min())
	for ob.asksTree.Len() > 0 && buyOrder.UnfilledQuantity() > 0 {
		minNode := ob.asksTree.Min()
		if minNode == nil {
			break
		}
		bestAskLevel := minNode.Value

		// For Limit orders, if the cheapest ask price > buyer's limit, stop matching
		if buyOrder.OrderType == models.OrderTypeLimit && bestAskLevel.PriceCents > buyCents {
			break
		}

		// Execute against FIFO orders at this price level using the Doubly-Linked List
		curr := bestAskLevel.Queue.Head
		for curr != nil && buyOrder.UnfilledQuantity() > 0 {
			restingAsk := curr.Order
			next := curr.Next

			// Wash-Trading Guard: NEVER match user with themselves
			if isSelfTradePrevented(restingAsk.UserID, buyOrder.UserID) {
				curr = next
				continue // Skip own resting order; keep it in book for other buyers
			}

			needed := buyOrder.UnfilledQuantity()
			available := restingAsk.UnfilledQuantity()
			matchQty := needed
			if available < matchQty {
				matchQty = available
			}

			if matchQty > 0 {
				trade := acquireTrade()
				trade.ID = uuid.New()
				trade.TakerOrderID = buyOrder.ID
				trade.MakerOrderID = restingAsk.ID
				trade.EventSymbol = ob.EventSymbol
				trade.Price = restingAsk.Price // Maker's price
				trade.Quantity = matchQty
				trade.ExecutedAt = now
				trades = append(trades, trade)

				buyOrder.FilledQuantity += matchQty
				restingAsk.FilledQuantity += matchQty
				bestAskLevel.Queue.TotalQuantity -= matchQty

				if restingAsk.UnfilledQuantity() == 0 {
					restingAsk.Status = models.OrderStatusFilled
					delete(ob.OrdersMap, restingAsk.ID)
					bestAskLevel.Queue.Remove(curr)
					releaseOrderNode(curr)
				} else {
					restingAsk.Status = models.OrderStatusPartiallyFilled
				}
			}

			curr = next
		}

		// If all orders at this level have been filled, remove the empty price level in O(log L)
		if bestAskLevel.Queue.Len == 0 {
			delete(ob.priceMapAsks, bestAskLevel.PriceCents)
			ob.asksTree.Delete(bestAskLevel.PriceCents)
		} else {
			// If orders remain but all remaining orders belong to the same buyer (self-trade), break
			allSelf := true
			for n := bestAskLevel.Queue.Head; n != nil; n = n.Next {
				if !isSelfTradePrevented(n.Order.UserID, buyOrder.UserID) {
					allSelf = false
					break
				}
			}
			if allSelf {
				break // Cannot match further against own orders
			}
		}
	}

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
	sellCents := ToPriceCents(sellOrder.Price)

	// Sweep through bids starting with the highest bid (bidsTree.Max())
	for ob.bidsTree.Len() > 0 && sellOrder.UnfilledQuantity() > 0 {
		maxNode := ob.bidsTree.Max()
		if maxNode == nil {
			break
		}
		bestBidLevel := maxNode.Value

		// For Limit orders, if highest bid < seller's minimum price, stop matching
		if sellOrder.OrderType == models.OrderTypeLimit && bestBidLevel.PriceCents < sellCents {
			break
		}

		// Execute against FIFO orders at this price level using the Doubly-Linked List
		curr := bestBidLevel.Queue.Head
		for curr != nil && sellOrder.UnfilledQuantity() > 0 {
			restingBid := curr.Order
			next := curr.Next

			// Wash-Trading Guard: NEVER match user with themselves
			if isSelfTradePrevented(restingBid.UserID, sellOrder.UserID) {
				curr = next
				continue // Skip own resting order; keep it in book for other sellers
			}

			needed := sellOrder.UnfilledQuantity()
			available := restingBid.UnfilledQuantity()
			matchQty := needed
			if available < matchQty {
				matchQty = available
			}

			if matchQty > 0 {
				trade := acquireTrade()
				trade.ID = uuid.New()
				trade.TakerOrderID = sellOrder.ID
				trade.MakerOrderID = restingBid.ID
				trade.EventSymbol = ob.EventSymbol
				trade.Price = restingBid.Price // Maker's price
				trade.Quantity = matchQty
				trade.ExecutedAt = now
				trades = append(trades, trade)

				sellOrder.FilledQuantity += matchQty
				restingBid.FilledQuantity += matchQty
				bestBidLevel.Queue.TotalQuantity -= matchQty

				if restingBid.UnfilledQuantity() == 0 {
					restingBid.Status = models.OrderStatusFilled
					delete(ob.OrdersMap, restingBid.ID)
					bestBidLevel.Queue.Remove(curr)
					releaseOrderNode(curr)
				} else {
					restingBid.Status = models.OrderStatusPartiallyFilled
				}
			}

			curr = next
		}

		// If all orders at this level have been filled, remove the empty price level in O(log L)
		if bestBidLevel.Queue.Len == 0 {
			delete(ob.priceMapBids, bestBidLevel.PriceCents)
			ob.bidsTree.Delete(bestBidLevel.PriceCents)
		} else {
			// If orders remain but all remaining orders belong to the same seller (self-trade), break
			allSelf := true
			for n := bestBidLevel.Queue.Head; n != nil; n = n.Next {
				if !isSelfTradePrevented(n.Order.UserID, sellOrder.UserID) {
					allSelf = false
					break
				}
			}
			if allSelf {
				break // Cannot match further against own orders
			}
		}
	}

	if sellOrder.UnfilledQuantity() == 0 {
		sellOrder.Status = models.OrderStatusFilled
	} else if sellOrder.FilledQuantity > 0 {
		sellOrder.Status = models.OrderStatusPartiallyFilled
	}

	return trades
}

// MatchCrossedOrdersLocked sweeps and matches any crossed resting orders in the book (Bids.Max() >= Asks.Min())
func (ob *OrderBook) MatchCrossedOrdersLocked() []*models.Trade {
	var trades []*models.Trade
	now := time.Now().UTC()

	for ob.bidsTree.Len() > 0 && ob.asksTree.Len() > 0 {
		bestBidNode := ob.bidsTree.Max()
		bestAskNode := ob.asksTree.Min()
		if bestBidNode == nil || bestAskNode == nil {
			break
		}

		bestBidLevel := bestBidNode.Value
		bestAskLevel := bestAskNode.Value

		if bestBidLevel.PriceCents < bestAskLevel.PriceCents {
			break // Book is healthy and no longer crossed
		}

		if bestBidLevel.Queue.Len == 0 {
			delete(ob.priceMapBids, bestBidLevel.PriceCents)
			ob.bidsTree.Delete(bestBidLevel.PriceCents)
			continue
		}
		if bestAskLevel.Queue.Len == 0 {
			delete(ob.priceMapAsks, bestAskLevel.PriceCents)
			ob.asksTree.Delete(bestAskLevel.PriceCents)
			continue
		}

		bestBidNodeOrder := bestBidLevel.Queue.Head
		bestAskNodeOrder := bestAskLevel.Queue.Head

		if bestBidNodeOrder == nil || bestAskNodeOrder == nil {
			break
		}

		bestBid := bestBidNodeOrder.Order
		bestAsk := bestAskNodeOrder.Order

		// Wash-Trading Guard: Cannot match crossed orders of identical users
		if isSelfTradePrevented(bestBid.UserID, bestAsk.UserID) {
			break
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

		// Maker is the older resting order
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

		trade := acquireTrade()
		trade.ID = uuid.New()
		trade.TakerOrderID = takerID
		trade.MakerOrderID = makerID
		trade.EventSymbol = ob.EventSymbol
		trade.Price = execPrice
		trade.Quantity = matchQty
		trade.ExecutedAt = now
		trades = append(trades, trade)

		bestBid.FilledQuantity += matchQty
		bestAsk.FilledQuantity += matchQty
		bestBidLevel.Queue.TotalQuantity -= matchQty
		bestAskLevel.Queue.TotalQuantity -= matchQty

		if bestBid.UnfilledQuantity() == 0 {
			bestBid.Status = models.OrderStatusFilled
			delete(ob.OrdersMap, bestBid.ID)
			bestBidLevel.Queue.Remove(bestBidNodeOrder)
			releaseOrderNode(bestBidNodeOrder)
		} else {
			bestBid.Status = models.OrderStatusPartiallyFilled
		}

		if bestAsk.UnfilledQuantity() == 0 {
			bestAsk.Status = models.OrderStatusFilled
			delete(ob.OrdersMap, bestAsk.ID)
			bestAskLevel.Queue.Remove(bestAskNodeOrder)
			releaseOrderNode(bestAskNodeOrder)
		} else {
			bestAsk.Status = models.OrderStatusPartiallyFilled
		}

		if bestBidLevel.Queue.Len == 0 {
			delete(ob.priceMapBids, bestBidLevel.PriceCents)
			ob.bidsTree.Delete(bestBidLevel.PriceCents)
		}
		if bestAskLevel.Queue.Len == 0 {
			delete(ob.priceMapAsks, bestAskLevel.PriceCents)
			ob.asksTree.Delete(bestAskLevel.PriceCents)
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

// insertRestingOrderLocked inserts an unfilled limit order into the book in O(1) / O(log L)
func (ob *OrderBook) insertRestingOrderLocked(order *models.Order) {
	if order == nil || order.OrderType != models.OrderTypeLimit {
		return
	}

	cents := ToPriceCents(order.Price)

	if order.Side == models.SideBuy {
		level, exists := ob.priceMapBids[cents]
		if !exists {
			level = &PriceLevel{
				PriceCents: cents,
				Price:      order.Price,
				Queue:      &OrderQueue{},
			}
			ob.priceMapBids[cents] = level
			ob.bidsTree.Insert(cents, level)
		}
		node := acquireOrderNode(order, cents, level)
		level.Queue.Append(node)
		ob.OrdersMap[order.ID] = node
	} else {
		level, exists := ob.priceMapAsks[cents]
		if !exists {
			level = &PriceLevel{
				PriceCents: cents,
				Price:      order.Price,
				Queue:      &OrderQueue{},
			}
			ob.priceMapAsks[cents] = level
			ob.asksTree.Insert(cents, level)
		}
		node := acquireOrderNode(order, cents, level)
		level.Queue.Append(node)
		ob.OrdersMap[order.ID] = node
	}
}

// InsertRestingOrder public method for loading active orders on engine startup
func (ob *OrderBook) InsertRestingOrder(order *models.Order) {
	if order == nil || order.OrderType != models.OrderTypeLimit {
		return
	}
	ob.mu.Lock()
	defer ob.mu.Unlock()
	ob.insertRestingOrderLocked(order)
}

// CancelOrder removes an active order from the in-memory book in O(1)
func (ob *OrderBook) CancelOrder(orderID uuid.UUID) (*models.Order, error) {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	node, exists := ob.OrdersMap[orderID]
	if !exists {
		return nil, ErrOrderNotFound
	}

	delete(ob.OrdersMap, orderID)
	order := node.Order
	order.Status = models.OrderStatusCancelled

	level := node.Level
	if level != nil && level.Queue != nil {
		level.Queue.Remove(node)
		if level.Queue.Len == 0 {
			if order.Side == models.SideBuy {
				delete(ob.priceMapBids, level.PriceCents)
				ob.bidsTree.Delete(level.PriceCents)
			} else {
				delete(ob.priceMapAsks, level.PriceCents)
				ob.asksTree.Delete(level.PriceCents)
			}
		}
	}

	releaseOrderNode(node)
	return order, nil
}

// GetL2Depth computes aggregated Level-2 depth ladder up to `limit` price tiers
func (ob *OrderBook) GetL2Depth(limit int) models.L2OrderBook {
	ob.mu.RLock()
	defer ob.mu.RUnlock()

	if limit <= 0 || limit > 50 {
		limit = 20
	}

	// Traverse Red-Black Trees in sorted order (Bids descending, Asks ascending)
	bidLevelsList := ob.bidsTree.Descending(limit)
	askLevelsList := ob.asksTree.Ascending(limit)

	bidLevels := make([]models.L2PriceLevel, 0, len(bidLevelsList))
	for _, lvl := range bidLevelsList {
		bidLevels = append(bidLevels, models.L2PriceLevel{
			Price:      lvl.Price,
			Quantity:   lvl.TotalQuantity(),
			OrderCount: lvl.OrderCount(),
		})
	}

	askLevels := make([]models.L2PriceLevel, 0, len(askLevelsList))
	for _, lvl := range askLevelsList {
		askLevels = append(askLevels, models.L2PriceLevel{
			Price:      lvl.Price,
			Quantity:   lvl.TotalQuantity(),
			OrderCount: lvl.OrderCount(),
		})
	}

	bestBid := 0.0
	if maxNode := ob.bidsTree.Max(); maxNode != nil && maxNode.Value != nil {
		bestBid = maxNode.Value.Price
	}

	bestAsk := 0.0
	if minNode := ob.asksTree.Min(); minNode != nil && minNode.Value != nil {
		bestAsk = minNode.Value.Price
	}

	spread := 0.0
	if bestAsk > 0 && bestBid > 0 {
		spread = bestAsk - bestBid
	}

	return models.L2OrderBook{
		EventSymbol: ob.EventSymbol,
		Symbol:      ob.EventSymbol,
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
	for _, l := range ob.priceMapBids {
		totalBidQty += l.TotalQuantity()
	}

	totalAskQty := 0
	for _, l := range ob.priceMapAsks {
		totalAskQty += l.TotalQuantity()
	}

	return map[string]interface{}{
		"event_symbol":   ob.EventSymbol,
		"active_orders":  len(ob.OrdersMap),
		"bid_levels":     ob.bidsTree.Len(),
		"ask_levels":     ob.asksTree.Len(),
		"total_bid_qty":  totalBidQty,
		"total_ask_qty":  totalAskQty,
		"max_sell_price": ob.MaxSellPrice,
	}
}
