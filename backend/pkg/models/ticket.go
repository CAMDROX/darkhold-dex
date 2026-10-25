package models

import (
	"time"

	"github.com/google/uuid"
)

// ImportTicketRequest payload submitted from UI
type ImportTicketRequest struct {
	TicketID    string `json:"ticket_id"`
	EventSymbol string `json:"event_symbol"`
}

// ImportTicketResponse standard response returned by the import API
type ImportTicketResponse struct {
	Success     bool      `json:"success"`
	Status      string    `json:"status"`
	Message     string    `json:"message"`
	TicketID    string    `json:"ticket_id"`
	EventSymbol string    `json:"event_symbol"`
	TaskID      string    `json:"task_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// Event represents the public.events table
type Event struct {
	ID                    uuid.UUID `json:"id"`
	Name                  string    `json:"name"`
	Symbol                string    `json:"symbol"`
	EventDate             time.Time `json:"event_date"`
	FaceValue             float64   `json:"face_value"`
	MaxMarkupPercentage   float64   `json:"max_markup_percentage"`
	MaxSellPrice          float64   `json:"max_sell_price"`
	ExternalPlatform      string    `json:"external_platform"`
	VerificationAPIURL    *string   `json:"verification_api_url,omitempty"`
	VerificationAPISecret *string   `json:"-"`
	Status                string    `json:"status"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

// RelicInventory represents the physical ticket vault in public.relic_inventory
type RelicInventory struct {
	ID               uuid.UUID `json:"id"`
	OwnerID          uuid.UUID `json:"owner_id"`
	EventID          uuid.UUID `json:"event_id"`
	ExternalTicketID string    `json:"external_ticket_id"`
	ExternalPlatform string    `json:"external_platform"`
	InternalQRHash   string    `json:"internal_qr_hash"`
	Status           string    `json:"status"`
	ExpiresAt        time.Time `json:"expires_at"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Transaction represents a ledger transaction in public.transactions
type Transaction struct {
	ID              uuid.UUID  `json:"id"`
	ReferenceID     *uuid.UUID `json:"reference_id,omitempty"`
	TransactionType string     `json:"transaction_type"`
	CreatedAt       time.Time  `json:"created_at"`
}

// LedgerEntry represents double-entry balance accounting in public.ledger_entries
type LedgerEntry struct {
	ID            uuid.UUID `json:"id"`
	TransactionID uuid.UUID `json:"transaction_id"`
	AccountID     uuid.UUID `json:"account_id"`
	Amount        float64   `json:"amount"`
	CreatedAt     time.Time `json:"created_at"`
}

// Account represents the double-entry account in public.accounts
type Account struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Currency    string    `json:"currency"`
	AccountType string    `json:"account_type"`
	CreatedAt   time.Time `json:"created_at"`
}
