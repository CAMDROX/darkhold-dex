package models

import "time"

// SimulateDepositRequest defines the payload for POST /api/wallet/deposit/simulate
type SimulateDepositRequest struct {
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	PaymentID string `json:"payment_id"`
}

// SimulateDepositResponse defines the response returned upon deposit simulation
type SimulateDepositResponse struct {
	Success    bool      `json:"success"`
	Status     string    `json:"status"`
	Message    string    `json:"message"`
	PaymentID  string    `json:"payment_id"`
	Currency   string    `json:"currency"`
	Amount     int64     `json:"amount"`
	Idempotent bool      `json:"idempotent,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}

// BalanceItem represents a currency balance in the user's available account
type BalanceItem struct {
	Currency    string `json:"currency"`
	AccountType string `json:"account_type"`
	Balance     int64  `json:"balance"`
}

// WalletBalancesResponse defines the response returned for GET /api/wallet/balances
type WalletBalancesResponse struct {
	Success  bool          `json:"success"`
	Balances []BalanceItem `json:"balances"`
}
