package models

import (
	"time"

	"github.com/google/uuid"
)

type AuctionStatus string

const (
	AuctionStatusActive  AuctionStatus = "ACTIVE"
	AuctionStatusSettled AuctionStatus = "SETTLED"
	AuctionStatusExpired AuctionStatus = "EXPIRED"
)

// DutchAuction represents a live or settled price-decay auction for a festival pass/relic
type DutchAuction struct {
	ID              uuid.UUID     `json:"id"`
	SellerID        uuid.UUID     `json:"seller_id"`
	SellerUsername  string        `json:"seller_username,omitempty"`
	RelicID         uuid.UUID     `json:"relic_id"`
	EventSymbol     string        `json:"event_symbol"`
	EventName       string        `json:"event_name,omitempty"`
	StartPrice      int64         `json:"start_price"`
	ReservePrice    int64         `json:"reserve_price"`
	CurrentPrice    int64         `json:"current_price"`
	ClearingPrice   *int64        `json:"clearing_price,omitempty"`
	DurationSeconds int           `json:"duration_seconds"`
	BuyerID         *uuid.UUID    `json:"buyer_id,omitempty"`
	BuyerUsername   string        `json:"buyer_username,omitempty"`
	Status          AuctionStatus `json:"status"`
	StartedAt       time.Time     `json:"started_at"`
	SettledAt       *time.Time    `json:"settled_at,omitempty"`
	UpdatedAt       time.Time     `json:"updated_at"`

	// Real-time calculated fields for client delivery
	TimeRemainingSeconds int     `json:"time_remaining_seconds"`
	ProgressPercentage   float64 `json:"progress_percentage"`
}

// CreateAuctionRequest payload for POST /api/auctions
type CreateAuctionRequest struct {
	RelicID         uuid.UUID `json:"relic_id"`
	EventSymbol     string    `json:"event_symbol"`
	StartPrice      int64     `json:"start_price"`
	ReservePrice    int64     `json:"reserve_price"`
	DurationSeconds int       `json:"duration_seconds"`
}

// SnipeAuctionResponse returned upon winning a Dutch auction
type SnipeAuctionResponse struct {
	Status        string    `json:"status"`
	AuctionID     uuid.UUID `json:"auction_id"`
	EventSymbol   string    `json:"event_symbol"`
	ClearingPrice int64     `json:"clearing_price"`
	RelicID       uuid.UUID `json:"relic_id"`
	BuyerID       uuid.UUID `json:"buyer_id"`
	SettledAt     time.Time `json:"settled_at"`
	Message       string    `json:"message"`
}

