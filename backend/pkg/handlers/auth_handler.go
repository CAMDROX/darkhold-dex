package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"darkhold-dex/backend/pkg/auth"
	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/email"
	"darkhold-dex/backend/pkg/middleware"
	"darkhold-dex/backend/pkg/models"

	"github.com/google/uuid"
)

// Signup handles user registration and OTP dispatch
func Signup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = strings.TrimSpace(req.Username)

	// Validate inputs
	if _, err := mail.ParseAddress(req.Email); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Please provide a valid email address")
		return
	}
	if len(req.Username) < 3 || len(req.Username) > 30 {
		writeJSONError(w, http.StatusBadRequest, "Username must be between 3 and 30 characters")
		return
	}
	if len(req.Password) < 6 {
		writeJSONError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	// Check for existing user
	var existingID uuid.UUID
	var existingVerified bool
	var existingEmail string
	err := db.GlobalDB.Pool.QueryRow(r.Context(),
		"SELECT id, email, is_email_verified FROM public.users WHERE LOWER(email) = $1 OR LOWER(username) = LOWER($2)",
		req.Email, req.Username,
	).Scan(&existingID, &existingEmail, &existingVerified)

	if err == nil {
		// User already exists
		if existingVerified {
			writeJSONError(w, http.StatusConflict, "An account with this email or username already exists. Please sign in.")
			return
		}

		// Account exists but is unverified - update password and send fresh OTP
		otp, err := email.GenerateOTP()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to generate security code")
			return
		}
		otpExpiresAt := time.Now().Add(15 * time.Minute)
		pwdHash, err := auth.HashPassword(req.Password)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to hash password")
			return
		}

		_, updateErr := db.GlobalDB.Pool.Exec(r.Context(),
			`UPDATE public.users 
			 SET password_hash = $1, email_verification_otp = $2, email_verification_otp_expires_at = $3, updated_at = NOW() 
			 WHERE id = $4`,
			pwdHash, otp, otpExpiresAt, existingID,
		)
		if updateErr != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to update pending account")
			return
		}

		go func() {
			if err := email.SendVerificationEmail(req.Email, req.Username, otp); err != nil {
				log.Printf("⚠️  [Resend Dispatch Failed]: %v", err)
			}
		}()

		writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
			"message": "A new verification code has been dispatched to your email",
			"email":   req.Email,
		})
		return
	}

	// New User Registration
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	otp, err := email.GenerateOTP()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to generate security code")
		return
	}
	otpExpiresAt := time.Now().Add(15 * time.Minute)

	var newUserID uuid.UUID
	insertQuery := `
		INSERT INTO public.users (
			email, username, password_hash, is_email_verified, 
			email_verification_otp, email_verification_otp_expires_at
		) VALUES ($1, $2, $3, false, $4, $5)
		RETURNING id;
	`

	err = db.GlobalDB.Pool.QueryRow(r.Context(), insertQuery,
		req.Email, req.Username, passwordHash, otp, otpExpiresAt,
	).Scan(&newUserID)

	if err != nil {
		log.Printf("❌ [Signup Error] DB Insert failed: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Database failed to create user")
		return
	}

	// Dispatch email asynchronously
	go func() {
		if err := email.SendVerificationEmail(req.Email, req.Username, otp); err != nil {
			log.Printf("⚠️  [Resend Dispatch Failed]: %v", err)
		}
	}()

	writeJSONSuccess(w, http.StatusCreated, map[string]interface{}{
		"message": "Registration successful. Please verify your email with the 6-digit code.",
		"email":   req.Email,
		"user_id": newUserID,
	})
}

// VerifyOTP checks the 6-digit OTP, marks email verified, creates a session, and logs the user in
func VerifyOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.VerifyOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.OTP = strings.TrimSpace(req.OTP)

	if req.Email == "" || len(req.OTP) != 6 {
		writeJSONError(w, http.StatusBadRequest, "Please provide your email and the 6-digit verification code")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	var user models.User
	var otpInDB *string
	var otpExpiresAt *time.Time

	query := `
		SELECT id, email, username, is_email_verified, email_verification_otp, email_verification_otp_expires_at, 
		       kyc_status, account_status, created_at
		FROM public.users 
		WHERE LOWER(email) = $1;
	`

	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, req.Email).Scan(
		&user.ID, &user.Email, &user.Username, &user.IsEmailVerified,
		&otpInDB, &otpExpiresAt, &user.KYCStatus, &user.AccountStatus, &user.CreatedAt,
	)

	if err != nil {
		writeJSONError(w, http.StatusNotFound, "No account found matching this email address")
		return
	}

	if user.IsEmailVerified {
		// Already verified
	} else {
		if otpInDB == nil || otpExpiresAt == nil {
			writeJSONError(w, http.StatusBadRequest, "No pending verification code found. Please request a new one.")
			return
		}

		if time.Now().After(*otpExpiresAt) {
			writeJSONError(w, http.StatusBadRequest, "Verification code has expired. Please request a new code.")
			return
		}

		if *otpInDB != req.OTP {
			writeJSONError(w, http.StatusBadRequest, "Invalid verification code. Please check your email and try again.")
			return
		}

		// Update user as verified
		now := time.Now()
		_, updateErr := db.GlobalDB.Pool.Exec(r.Context(),
			`UPDATE public.users 
			 SET is_email_verified = true, email_verified_at = $1, email_verification_otp = NULL, 
			     email_verification_otp_expires_at = NULL, updated_at = $1 
			 WHERE id = $2`,
			now, user.ID,
		)
		if updateErr != nil {
			writeJSONError(w, http.StatusInternalServerError, "Failed to update email verification status")
			return
		}
		user.IsEmailVerified = true
		user.EmailVerifiedAt = &now
	}

	// Create new session upon verification
	authResp, err := createSessionForUser(r, user)
	if err != nil {
		log.Printf("❌ [Session Creation Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to initialize active session")
		return
	}

	writeJSONSuccess(w, http.StatusOK, authResp)
}

// ResendOTP generates a fresh OTP and resends the verification email
func ResendOTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.ResendOTPRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		writeJSONError(w, http.StatusBadRequest, "Email address is required")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	var userID uuid.UUID
	var userEmail string
	var username string
	var isVerified bool

	err := db.GlobalDB.Pool.QueryRow(r.Context(),
		"SELECT id, email, username, is_email_verified FROM public.users WHERE LOWER(email) = $1 OR LOWER(username) = $1",
		req.Email,
	).Scan(&userID, &userEmail, &username, &isVerified)

	if err != nil {
		writeJSONError(w, http.StatusNotFound, "No account found matching this email or username")
		return
	}

	if isVerified {
		writeJSONError(w, http.StatusBadRequest, "Your email is already verified. Please sign in.")
		return
	}

	otp, err := email.GenerateOTP()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to generate security code")
		return
	}
	otpExpiresAt := time.Now().Add(15 * time.Minute)

	_, err = db.GlobalDB.Pool.Exec(r.Context(),
		"UPDATE public.users SET email_verification_otp = $1, email_verification_otp_expires_at = $2, updated_at = NOW() WHERE id = $3",
		otp, otpExpiresAt, userID,
	)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to record fresh verification code")
		return
	}

	go func() {
		if err := email.SendVerificationEmail(userEmail, username, otp); err != nil {
			log.Printf("⚠️  [Resend Dispatch Failed]: %v", err)
		}
	}()

	writeJSONSuccess(w, http.StatusOK, map[string]string{
		"message": "A fresh 6-digit verification code has been dispatched to your email",
	})
}

// Login authenticates user and issues Access & Refresh tokens
func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Identifier = strings.TrimSpace(req.Identifier)
	req.Password = strings.TrimSpace(req.Password)

	if req.Identifier == "" || req.Password == "" {
		writeJSONError(w, http.StatusBadRequest, "Please provide your username/email and password")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	var user models.User
	var pwdHash string

	query := `
		SELECT id, email, username, password_hash, is_email_verified, email_verified_at, 
		       kyc_status, account_status, failed_login_attempts, locked_until, created_at
		FROM public.users
		WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1);
	`

	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, req.Identifier).Scan(
		&user.ID, &user.Email, &user.Username, &pwdHash, &user.IsEmailVerified,
		&user.EmailVerifiedAt, &user.KYCStatus, &user.AccountStatus,
		&user.FailedLoginAttempts, &user.LockedUntil, &user.CreatedAt,
	)

	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Validate Password
	if !auth.CheckPasswordHash(req.Password, pwdHash) {
		writeJSONError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Email Verification Check
	if !user.IsEmailVerified {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"code":    "EMAIL_NOT_VERIFIED",
			"error":   "Email verification required before accessing the exchange.",
			"email":   user.Email,
		})
		return
	}

	// Create Session & Issue Tokens
	authResp, err := createSessionForUser(r, user)
	if err != nil {
		log.Printf("❌ [Login Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to establish authenticated session")
		return
	}

	writeJSONSuccess(w, http.StatusOK, authResp)
}

// Refresh issues a new Access Token using an active Refresh Token
func Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req models.RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.RefreshToken = strings.TrimSpace(req.RefreshToken)
	if req.RefreshToken == "" {
		writeJSONError(w, http.StatusBadRequest, "Refresh token is required")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	var sessionID uuid.UUID
	var userID uuid.UUID
	var expiresAt time.Time
	var revokedAt *time.Time
	var email string
	var username string

	query := `
		SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.email, u.username
		FROM public.sessions s
		JOIN public.users u ON s.user_id = u.id
		WHERE s.refresh_token_hash = $1;
	`

	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, tokenHash).Scan(
		&sessionID, &userID, &expiresAt, &revokedAt, &email, &username,
	)

	if err != nil || revokedAt != nil || time.Now().After(expiresAt) {
		writeJSONError(w, http.StatusUnauthorized, "Invalid, expired, or revoked refresh token")
		return
	}

	// Update last_used_at on session
	_, _ = db.GlobalDB.Pool.Exec(r.Context(),
		"UPDATE public.sessions SET last_used_at = NOW(), updated_at = NOW() WHERE id = $1",
		sessionID,
	)

	// Issue new Access Token
	newAccessToken, expiresIn, err := auth.GenerateAccessToken(userID, sessionID, email, username)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Failed to sign refreshed token")
		return
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"access_token": newAccessToken,
		"expires_in":   expiresIn,
	})
}

// Logout revokes the current active session
func Logout(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if db.GlobalDB != nil && db.GlobalDB.Pool != nil {
		_, err := db.GlobalDB.Pool.Exec(r.Context(),
			"UPDATE public.sessions SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1 AND user_id = $2",
			claims.SessionID, claims.UserID,
		)
		if err != nil {
			log.Printf("⚠️  [Logout Warning]: %v", err)
		}
	}

	writeJSONSuccess(w, http.StatusOK, map[string]string{
		"message": "Session terminated successfully",
	})
}

// GetMe returns the authenticated user's profile
func GetMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	var user models.User
	query := `
		SELECT id, email, username, is_email_verified, email_verified_at, kyc_status, account_status, created_at
		FROM public.users WHERE id = $1;
	`
	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, claims.UserID).Scan(
		&user.ID, &user.Email, &user.Username, &user.IsEmailVerified,
		&user.EmailVerifiedAt, &user.KYCStatus, &user.AccountStatus, &user.CreatedAt,
	)

	if err != nil {
		writeJSONError(w, http.StatusNotFound, "User not found")
		return
	}

	writeJSONSuccess(w, http.StatusOK, user.ToResponse())
}

// Helper: creates a session row in public.sessions and returns AuthResponse
func createSessionForUser(r *http.Request, user models.User) (*models.AuthResponse, error) {
	rawRefreshToken, refreshTokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	deviceName, browser, osName, clientIP := auth.ParseClientInfo(r)
	expiresAt := time.Now().Add(30 * 24 * time.Hour) // 30 days validity

	var sessionID uuid.UUID
	insertSessionQuery := `
		INSERT INTO public.sessions (
			user_id, refresh_token_hash, device_name, browser, os, 
			ip_address, user_agent, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id;
	`

	err = db.GlobalDB.Pool.QueryRow(r.Context(), insertSessionQuery,
		user.ID, refreshTokenHash, deviceName, browser, osName,
		clientIP, r.UserAgent(), expiresAt,
	).Scan(&sessionID)

	if err != nil {
		return nil, fmt.Errorf("failed to record session: %w", err)
	}

	accessToken, expiresIn, err := auth.GenerateAccessToken(user.ID, sessionID, user.Email, user.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		ExpiresIn:    expiresIn,
		User:         user.ToResponse(),
	}, nil
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   msg,
	})
}

func writeJSONSuccess(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
