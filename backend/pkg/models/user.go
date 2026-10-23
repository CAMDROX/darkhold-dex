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
	Role                       string     `json:"role"`       // "user", "admin"
	KYCStatus                  string     `json:"kyc_status"` // "unverified", "pending", "verified"
	AccountStatus              string     `json:"account_status"`
	FailedLoginAttempts        int        `json:"failed_login_attempts"`
	LockedUntil                *time.Time `json:"locked_until,omitempty"`
	CreatedAt                  time.Time  `json:"created_at"`
	UpdatedAt                  time.Time  `json:"updated_at"`
	EmailVerificationOTP       *string    `json:"-"`
	EmailVerificationOTPExpiresAt *time.Time `json:"-"`
}

// UserKYC represents the separate public.user_kyc table
type UserKYC struct {
	UserID            uuid.UUID  `json:"user_id"`
	Status            string     `json:"status"` // 'not_started', 'pending', 'approved', 'rejected', 'manual_review'
	Provider          *string    `json:"provider,omitempty"`
	ProviderReference *string    `json:"provider_reference,omitempty"`
	IDType            *string    `json:"id_type,omitempty"`
	IDNumber          *string    `json:"id_number,omitempty"`
	DocumentURL       *string    `json:"document_url,omitempty"`
	SubmittedAt       *time.Time `json:"submitted_at,omitempty"`
	ReviewedAt        *time.Time `json:"reviewed_at,omitempty"`
	ReviewedBy        *uuid.UUID `json:"reviewed_by,omitempty"`
	RejectionReason   *string    `json:"rejection_reason,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
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

// SubmitKYCRequest payload
type SubmitKYCRequest struct {
	IDType      string `json:"id_type"`
	IDNumber    string `json:"id_number"`
	DocumentURL string `json:"document_url"`
}

// ReviewKYCRequest payload
type ReviewKYCRequest struct {
	Status          string `json:"status"` // "approved", "rejected", "manual_review"
	RejectionReason string `json:"rejection_reason,omitempty"`
}

// UserResponse safe view
type UserResponse struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	Username        string     `json:"username"`
	IsEmailVerified bool       `json:"is_email_verified"`
	EmailVerifiedAt *time.Time `json:"email_verified_at,omitempty"`
	Role            string     `json:"role"`
	KYCStatus       string     `json:"kyc_status"` // "unverified", "pending", "verified"
	AccountStatus   string     `json:"account_status"`
	KYC             *UserKYC   `json:"kyc,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (u *User) ToResponse(kyc *UserKYC) UserResponse {
	role := u.Role
	if role == "" {
		role = "user"
	}
	kycStatus := u.KYCStatus
	if kycStatus == "" {
		kycStatus = "unverified"
	}

	return UserResponse{
		ID:              u.ID,
		Email:           u.Email,
		Username:        u.Username,
		IsEmailVerified: u.IsEmailVerified,
		EmailVerifiedAt: u.EmailVerifiedAt,
		Role:            role,
		KYCStatus:       kycStatus,
		AccountStatus:   u.AccountStatus,
		KYC:             kyc,
		CreatedAt:       u.CreatedAt,
	}
}
