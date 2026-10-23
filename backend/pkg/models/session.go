package models

import (
	"time"

	"github.com/google/uuid"
)

// Session represents the public.sessions table in Supabase
type Session struct {
	ID               uuid.UUID  `json:"id"`
	UserID           uuid.UUID  `json:"user_id"`
	RefreshTokenHash string     `json:"-"`
	DeviceName       string     `json:"device_name"`
	Browser          string     `json:"browser"`
	OS               string     `json:"os"`
	IPAddress        *string    `json:"ip_address"`
	UserAgent        string     `json:"user_agent"`
	LastUsedAt       time.Time  `json:"last_used_at"`
	ExpiresAt        time.Time  `json:"expires_at"`
	RevokedAt        *time.Time `json:"revoked_at,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// SessionResponse safe view for listing active sessions on the Profile page
type SessionResponse struct {
	ID         uuid.UUID `json:"id"`
	DeviceName string    `json:"device_name"`
	Browser    string    `json:"browser"`
	OS         string    `json:"os"`
	IPAddress  string    `json:"ip_address"`
	LastUsedAt time.Time `json:"last_used_at"`
	CreatedAt  time.Time `json:"created_at"`
	IsCurrent  bool      `json:"is_current"`
}

// AuthResponse returned on login and OTP verification
type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"` // seconds (e.g. 900 for 15m)
	User         UserResponse `json:"user"`
}

// RefreshTokenRequest
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}
