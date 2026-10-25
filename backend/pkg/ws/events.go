package ws

import "time"

// Standard WebSocket Event Types
const (
	// Compliance & KYC Events
	EventKYCSubmitted     = "KYC_SUBMITTED"
	EventKYCStatusUpdated = "KYC_STATUS_UPDATED"

	// Market & Order Book Events (For upcoming phases)
	EventL2DepthDelta   = "L2_DEPTH_DELTA"
	EventL2DepthSnapshot = "L2_DEPTH_SNAPSHOT"
	EventTradeExecuted  = "TRADE_EXECUTED"

	// Relic Inventory & Ticket Ingestion Events
	EventTicketImported     = "TICKET_IMPORTED"
	EventTicketImportFailed = "TICKET_IMPORT_FAILED"
	EventImportSuccess      = "IMPORT_SUCCESS"
	EventImportFailed       = "IMPORT_FAILED"

	// Dutch Auction Events
	EventAuctionTick = "AUCTION_TICK"

	// Fiat On-Ramp & Treasury Events
	EventDepositSuccess = "DEPOSIT_SUCCESS"

	// Connection & Subscription Acknowledgements
	EventConnected    = "CONNECTED"
	EventSubscribed   = "SUBSCRIBED"
	EventUnsubscribed = "UNSUBSCRIBED"
	EventError        = "ERROR"
	EventPong         = "PONG"
)

// Standard System Topics / Rooms
const (
	TopicAdminCompliance = "admin:compliance"
)

// WSMessage represents the standard JSON message sent to clients
type WSMessage struct {
	Event     string      `json:"event"`
	Topic     string      `json:"topic,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// InboundAction represents a message sent from the client to the server
type InboundAction struct {
	Action string `json:"action"` // "subscribe", "unsubscribe", "ping"
	Topic  string `json:"topic,omitempty"`
}

// NewMessage creates a timestamped WSMessage ready for broadcast
func NewMessage(event string, topic string, data interface{}) WSMessage {
	return WSMessage{
		Event:     event,
		Topic:     topic,
		Timestamp: time.Now().UTC(),
		Data:      data,
	}
}
