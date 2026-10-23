package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents the public.users table in Supabase
type User struct {
	ID                         uuid.UUID  `json:"id"`
	Email                      string     `json:"email"`
	Username                   string     `json:"username"`
	PasswordHash               string     `json:"-"`
	IsEmailVerified            bool       `json:"is_email_verified"`
	EmailVerifiedAt            *time.Time `json:"email_verified_at,omitempty"`
	KYCStatus                  string     `json:"kyc_status"`
	AccountStatus              string     `json:"account_status"`
	FailedLoginAttempts        int        `json:"failed_login_attempts"`
	LockedUntil                *time.Time `json:"locked_until,omitempty"`
	CreatedAt                  time.Time  `json:"created_at"`
	UpdatedAt                  time.Time  `json:"updated_at"`
	EmailVerificationOTP       *string    `json:"-"`
	EmailVerificationOTPExpiresAt *time.Time `json:"-"`
}

// SignupRequest payload
type SignupRequest struct {
	Email    string `json:"email"`
	Username string `json:"username"`
	Password string `json:"password"`
}

// VerifyOTPRequest payload
type VerifyOTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

// ResendOTPRequest payload
type ResendOTPRequest struct {
	Email string `json:"email"`
}

// LoginRequest payload (identifier can be email or username)
type LoginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

// UserResponse safe view
type UserResponse struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	Username        string     `json:"username"`
	IsEmailVerified bool       `json:"is_email_verified"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	KYCStatus       string     `json:"kyc_status"`
	AccountStatus   string     `json:"account_status"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:              u.ID,
		Email:           u.Email,
		Username:        u.Username,
		IsEmailVerified: u.IsEmailVerified,
		EmailVerifiedAt: u.EmailVerifiedAt,
		KYCStatus:       u.KYCStatus,
		AccountStatus:   u.AccountStatus,
		CreatedAt:       u.CreatedAt,
	}
}
