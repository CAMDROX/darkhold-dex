package queue

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

// Task Types
const (
	TypeTicketVerify = "ticket:verify"
	TypeTradeSettle  = "trade:settle"
)

// TicketVerifyPayload represents the parameters needed by the verification worker
type TicketVerifyPayload struct {
	UserID      uuid.UUID `json:"user_id"`
	EventSymbol string    `json:"event_symbol"`
	TicketID    string    `json:"ticket_id"`
}

// TradeSettlePayload represents the parameters needed by the settlement worker
type TradeSettlePayload struct {
	MakerOrderID uuid.UUID `json:"maker_order_id"`
	TakerOrderID uuid.UUID `json:"taker_order_id"`
	Price        int64     `json:"price"`
	Quantity     int       `json:"quantity"`
	EventSymbol  string    `json:"event_symbol"`
}

// NewTicketVerifyTask creates a new Asynq task for background ticket verification
func NewTicketVerifyTask(userID uuid.UUID, eventSymbol, ticketID string) (*asynq.Task, error) {
	payload, err := json.Marshal(TicketVerifyPayload{
		UserID:      userID,
		EventSymbol: eventSymbol,
		TicketID:    ticketID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ticket verify payload: %w", err)
	}

	// Queue with default options: retry up to 3 times, timeout of 30 seconds
	return asynq.NewTask(
		TypeTicketVerify,
		payload,
		asynq.Queue("critical"),
		asynq.MaxRetry(3),
	), nil
}

// NewTradeSettleTask creates an Asynq task for atomic trade settlement in the 'settlements' queue
func NewTradeSettleTask(makerOrderID, takerOrderID uuid.UUID, price int64, quantity int, eventSymbol string) (*asynq.Task, error) {
	payload, err := json.Marshal(TradeSettlePayload{
		MakerOrderID: makerOrderID,
		TakerOrderID: takerOrderID,
		Price:        price,
		Quantity:     quantity,
		EventSymbol:  eventSymbol,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal trade settle payload: %w", err)
	}

	return asynq.NewTask(
		TypeTradeSettle,
		payload,
		asynq.Queue("settlements"),
		asynq.MaxRetry(5),
	), nil
}

