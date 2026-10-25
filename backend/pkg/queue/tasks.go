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
)

// TicketVerifyPayload represents the parameters needed by the verification worker
type TicketVerifyPayload struct {
	UserID      uuid.UUID `json:"user_id"`
	EventSymbol string    `json:"event_symbol"`
	TicketID    string    `json:"ticket_id"`
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
