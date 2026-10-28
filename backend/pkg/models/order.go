package models

import (
	"time"

	"github.com/google/uuid"
)

type OrderSide string

const (
	SideBuy  OrderSide = "BUY"
	SideSell OrderSide = "SELL"
)

type OrderType string

const (
	OrderTypeLimit  OrderType = "LIMIT"
	OrderTypeMarket OrderType = "MARKET"
)

type OrderStatus string

const (
	OrderStatusOpen            OrderStatus = "OPEN"
	OrderStatusPartiallyFilled OrderStatus = "PARTIALLY_FILLED"
	OrderStatusFilled          OrderStatus = "FILLED"
	OrderStatusCancelled       OrderStatus = "CANCELLED"
	OrderStatusRejected        OrderStatus = "REJECTED"
)

// Order represents an active or historical secondary market order
type Order struct {
	ID             uuid.UUID   `json:"id"`
	UserID         uuid.UUID   `json:"user_id"`
	EventSymbol    string      `json:"event_symbol"`
	QuoteCurrency  string      `json:"quote_currency"`
	Side           OrderSide   `json:"side"`
	OrderType      OrderType   `json:"order_type"`
	Price          int64       `json:"price"`
	Quantity       int         `json:"quantity"`
	FilledQuantity int         `json:"filled_quantity"`
	Status         OrderStatus `json:"status"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

// UnfilledQuantity calculates the remaining volume to be filled
func (o *Order) UnfilledQuantity() int {
	return o.Quantity - o.FilledQuantity
}

// Trade represents an executed trade between a taker and a maker
type Trade struct {
	ID           uuid.UUID `json:"id"`
	TakerOrderID uuid.UUID `json:"taker_order_id"`
	MakerOrderID uuid.UUID `json:"maker_order_id"`
	EventSymbol  string    `json:"event_symbol"`
	Price        int64     `json:"price"`
	Quantity     int       `json:"quantity"`
	ExecutedAt   time.Time `json:"executed_at"`
}

// L2PriceLevel aggregates depth volume at a specific price
type L2PriceLevel struct {
	Price      int64 `json:"price"`
	Quantity   int   `json:"quantity"`
	OrderCount int   `json:"order_count"`
}

// L2OrderBook is the aggregated Level-2 order book depth ladder
type L2OrderBook struct {
	EventSymbol string         `json:"event_symbol"`
	Symbol      string         `json:"symbol"`
	Bids        []L2PriceLevel `json:"bids"`
	Asks        []L2PriceLevel `json:"asks"`
	Spread      int64          `json:"spread"`
	BestBid     int64          `json:"best_bid"`
	BestAsk     int64          `json:"best_ask"`
	Timestamp   time.Time      `json:"timestamp"`
}

// PlaceOrderRequest payload submitted from UI
type PlaceOrderRequest struct {
	EventSymbol   string `json:"event_symbol"`
	Side          string `json:"side"`
	OrderType     string `json:"order_type"`
	Price         int64  `json:"price"`
	Quantity      int    `json:"quantity"`
	QuoteCurrency string `json:"quote_currency,omitempty"`
}

// PlaceOrderResponse returned after validation & matching
type PlaceOrderResponse struct {
	Success bool           `json:"success"`
	Status  string         `json:"status"`
	Message string         `json:"message"`
	Order   *Order         `json:"order"`
	Trades  []*Trade       `json:"trades,omitempty"`
	L2Depth *L2OrderBook   `json:"l2_depth,omitempty"`
}
