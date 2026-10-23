package handlers

import (
	"context"
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
	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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
			email_verification_otp, email_verification_otp_expires_at,
			role, kyc_status
		) VALUES ($1, $2, $3, false, $4, $5, 'user', 'unverified')
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

	// Initialize user_kyc record
	_, _ = db.GlobalDB.Pool.Exec(r.Context(),
		`INSERT INTO public.user_kyc (user_id, status) VALUES ($1, 'not_started') ON CONFLICT (user_id) DO NOTHING;`,
		newUserID,
	)

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
		       role, kyc_status, account_status, created_at
		FROM public.users 
		WHERE LOWER(email) = $1;
	`

	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, req.Email).Scan(
		&user.ID, &user.Email, &user.Username, &user.IsEmailVerified,
		&otpInDB, &otpExpiresAt, &user.Role, &user.KYCStatus, &user.AccountStatus, &user.CreatedAt,
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
		       role, kyc_status, account_status, failed_login_attempts, locked_until, created_at
		FROM public.users
		WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1);
	`

	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, req.Identifier).Scan(
		&user.ID, &user.Email, &user.Username, &pwdHash, &user.IsEmailVerified,
		&user.EmailVerifiedAt, &user.Role, &user.KYCStatus, &user.AccountStatus,
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
	var role string

	query := `
		SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.email, u.username, u.role
		FROM public.sessions s
		JOIN public.users u ON s.user_id = u.id
		WHERE s.refresh_token_hash = $1;
	`

	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, tokenHash).Scan(
		&sessionID, &userID, &expiresAt, &revokedAt, &email, &username, &role,
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
	newAccessToken, expiresIn, err := auth.GenerateAccessToken(userID, sessionID, email, username, role)
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
		SELECT id, email, username, is_email_verified, email_verified_at, role, kyc_status, account_status, created_at
		FROM public.users WHERE id = $1;
	`
	err := db.GlobalDB.Pool.QueryRow(r.Context(), query, claims.UserID).Scan(
		&user.ID, &user.Email, &user.Username, &user.IsEmailVerified,
		&user.EmailVerifiedAt, &user.Role, &user.KYCStatus, &user.AccountStatus, &user.CreatedAt,
	)

	if err != nil {
		writeJSONError(w, http.StatusNotFound, "User not found")
		return
	}

	kyc := fetchUserKYC(r.Context(), user.ID)
	writeJSONSuccess(w, http.StatusOK, user.ToResponse(kyc))
}

// fetchUserKYC retrieves the user's KYC record from public.user_kyc
func fetchUserKYC(ctx context.Context, userID uuid.UUID) *models.UserKYC {
	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		return nil
	}

	var k models.UserKYC
	query := `
		SELECT user_id, status, provider, provider_reference, id_type, id_number, document_url,
		       submitted_at, reviewed_at, reviewed_by, rejection_reason, created_at, updated_at
		FROM public.user_kyc
		WHERE user_id = $1;
	`
	err := db.GlobalDB.Pool.QueryRow(ctx, query, userID).Scan(
		&k.UserID, &k.Status, &k.Provider, &k.ProviderReference, &k.IDType, &k.IDNumber, &k.DocumentURL,
		&k.SubmittedAt, &k.ReviewedAt, &k.ReviewedBy, &k.RejectionReason, &k.CreatedAt, &k.UpdatedAt,
	)
	if err != nil {
		return nil
	}
	return &k
}

// SubmitKYC allows an authenticated user to submit government ID/proof for verification
func SubmitKYC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	var req models.SubmitKYCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.IDType = strings.TrimSpace(req.IDType)
	req.IDNumber = strings.TrimSpace(req.IDNumber)
	req.DocumentURL = strings.TrimSpace(req.DocumentURL)

	if req.IDType == "" || req.IDNumber == "" {
		writeJSONError(w, http.StatusBadRequest, "Government ID type and ID number are required")
		return
	}

	providerRef := req.IDType + "-" + req.IDNumber

	// Upsert into public.user_kyc
	kycQuery := `
		INSERT INTO public.user_kyc (
			user_id, status, provider, provider_reference, id_type, id_number, document_url,
			submitted_at, updated_at
		) VALUES (
			$1, 'pending', 'GOVT_ID_PROOF', $2, $3, $4, $5, NOW(), NOW()
		)
		ON CONFLICT (user_id) DO UPDATE SET
			status = 'pending',
			provider = 'GOVT_ID_PROOF',
			provider_reference = $2,
			id_type = $3,
			id_number = $4,
			document_url = $5,
			submitted_at = NOW(),
			rejection_reason = NULL,
			updated_at = NOW();
	`

	_, err := db.GlobalDB.Pool.Exec(r.Context(), kycQuery,
		claims.UserID, providerRef, req.IDType, req.IDNumber, req.DocumentURL,
	)
	if err != nil {
		log.Printf("❌ [KYC Submit Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to submit verification details")
		return
	}

	// Update user kyc_status to 'pending'
	_, _ = db.GlobalDB.Pool.Exec(r.Context(),
		`UPDATE public.users SET kyc_status = 'pending', updated_at = NOW() WHERE id = $1`,
		claims.UserID,
	)

	// Fetch updated user
	var user models.User
	userQuery := `
		SELECT id, email, username, is_email_verified, email_verified_at, role, kyc_status, account_status, created_at
		FROM public.users WHERE id = $1;
	`
	_ = db.GlobalDB.Pool.QueryRow(r.Context(), userQuery, claims.UserID).Scan(
		&user.ID, &user.Email, &user.Username, &user.IsEmailVerified,
		&user.EmailVerifiedAt, &user.Role, &user.KYCStatus, &user.AccountStatus, &user.CreatedAt,
	)

	kyc := fetchUserKYC(r.Context(), user.ID)
	userResp := user.ToResponse(kyc)

	// Broadcast real-time KYC_SUBMITTED event to all connected compliance admins
	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastToRoom(ws.TopicAdminCompliance, ws.EventKYCSubmitted, map[string]interface{}{
			"user": userResp,
		})
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"message": "Government ID proof submitted successfully! Your account verification is now pending admin review.",
		"user":    userResp,
	})
}

// AdminListKYC lists all users with their verification/KYC status for admin review
func AdminListKYC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	statusFilter := r.URL.Query().Get("status")

	baseQuery := `
		SELECT u.id, u.email, u.username, u.role, u.kyc_status, u.is_email_verified, u.created_at,
		       k.status, k.provider, k.provider_reference, k.id_type, k.id_number, k.document_url,
		       k.submitted_at, k.reviewed_at, k.reviewed_by, k.rejection_reason
		FROM public.users u
		LEFT JOIN public.user_kyc k ON u.id = k.user_id
	`

	var rows pgx.Rows
	var err error

	if statusFilter != "" && statusFilter != "all" {
		baseQuery += ` WHERE u.kyc_status = $1 OR k.status = $1 ORDER BY k.submitted_at DESC NULLS LAST, u.created_at DESC`
		rows, err = db.GlobalDB.Pool.Query(r.Context(), baseQuery, statusFilter)
	} else {
		baseQuery += ` ORDER BY 
			CASE WHEN u.kyc_status = 'pending' THEN 1 WHEN u.kyc_status = 'unverified' THEN 2 ELSE 3 END,
			k.submitted_at DESC NULLS LAST, 
			u.created_at DESC`
		rows, err = db.GlobalDB.Pool.Query(r.Context(), baseQuery)
	}

	if err != nil {
		log.Printf("❌ [AdminListKYC Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to load verifications")
		return
	}
	defer rows.Close()

	type AdminVerificationItem struct {
		User models.UserResponse `json:"user"`
	}

	var results []AdminVerificationItem
	for rows.Next() {
		var u models.User
		var k models.UserKYC
		var kStatus, kProvider, kProviderRef, kIDType, kIDNumber, kDocURL, kRejectionReason *string
		var kSubmittedAt, kReviewedAt *time.Time
		var kReviewedBy *uuid.UUID

		scanErr := rows.Scan(
			&u.ID, &u.Email, &u.Username, &u.Role, &u.KYCStatus, &u.IsEmailVerified, &u.CreatedAt,
			&kStatus, &kProvider, &kProviderRef, &kIDType, &kIDNumber, &kDocURL,
			&kSubmittedAt, &kReviewedAt, &kReviewedBy, &kRejectionReason,
		)
		if scanErr != nil {
			log.Printf("⚠️  [AdminListKYC Scan Error]: %v", scanErr)
			continue
		}

		k.UserID = u.ID
		if kStatus != nil {
			k.Status = *kStatus
		} else {
			k.Status = "not_started"
		}
		k.Provider = kProvider
		k.ProviderReference = kProviderRef
		k.IDType = kIDType
		k.IDNumber = kIDNumber
		k.DocumentURL = kDocURL
		k.SubmittedAt = kSubmittedAt
		k.ReviewedAt = kReviewedAt
		k.ReviewedBy = kReviewedBy
		k.RejectionReason = kRejectionReason

		results = append(results, AdminVerificationItem{
			User: u.ToResponse(&k),
		})
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"verifications": results,
		"total":         len(results),
	})
}

// AdminReviewKYC approves or rejects a user's verification
func AdminReviewKYC(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	adminClaims := middleware.GetClaims(r.Context())
	if adminClaims == nil || adminClaims.Role != "admin" {
		writeJSONError(w, http.StatusForbidden, "Admin privileges required")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	targetIDStr := r.PathValue("id")
	if targetIDStr == "" {
		writeJSONError(w, http.StatusBadRequest, "Target user ID is required")
		return
	}

	targetUserID, err := uuid.Parse(targetIDStr)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid target user UUID")
		return
	}

	var req models.ReviewKYCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if req.Status != "approved" && req.Status != "rejected" && req.Status != "verified" && req.Status != "unverified" {
		writeJSONError(w, http.StatusBadRequest, "Status must be 'approved' or 'rejected'")
		return
	}

	var newKYCStatus, newUserKYCStatus string
	var reason *string

	if req.Status == "approved" || req.Status == "verified" {
		newKYCStatus = "approved"
		newUserKYCStatus = "verified"
	} else {
		newKYCStatus = "rejected"
		newUserKYCStatus = "unverified"
		trimReason := strings.TrimSpace(req.RejectionReason)
		if trimReason == "" {
			trimReason = "Identity proof could not be verified. Please provide a clear, valid government-issued ID."
		}
		reason = &trimReason
	}

	// Update user_kyc
	kycUpdateQuery := `
		INSERT INTO public.user_kyc (
			user_id, status, reviewed_at, reviewed_by, rejection_reason, updated_at
		) VALUES (
			$1, $2, NOW(), $3, $4, NOW()
		)
		ON CONFLICT (user_id) DO UPDATE SET
			status = $2,
			reviewed_at = NOW(),
			reviewed_by = $3,
			rejection_reason = $4,
			updated_at = NOW();
	`
	_, err = db.GlobalDB.Pool.Exec(r.Context(), kycUpdateQuery, targetUserID, newKYCStatus, adminClaims.UserID, reason)
	if err != nil {
		log.Printf("❌ [AdminReviewKYC Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to update KYC status")
		return
	}

	// Update public.users
	_, err = db.GlobalDB.Pool.Exec(r.Context(),
		`UPDATE public.users SET kyc_status = $1, updated_at = NOW() WHERE id = $2`,
		newUserKYCStatus, targetUserID,
	)
	if err != nil {
		log.Printf("❌ [AdminReviewUsers Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to update user status")
		return
	}

	// Dispatch notification email asynchronously to the user
	var targetEmail, targetUsername string
	_ = db.GlobalDB.Pool.QueryRow(r.Context(),
		"SELECT email, username FROM public.users WHERE id = $1", targetUserID,
	).Scan(&targetEmail, &targetUsername)

	if targetEmail != "" {
		go func(emailAddr, uName, status string, rejReason *string) {
			if status == "verified" {
				if err := email.SendKYCApprovedEmail(emailAddr, uName); err != nil {
					log.Printf("⚠️  [Resend KYC Approval Email Failed]: %v", err)
				}
			} else if status == "unverified" {
				rText := ""
				if rejReason != nil {
					rText = *rejReason
				}
				if err := email.SendKYCRejectedEmail(emailAddr, uName, rText); err != nil {
					log.Printf("⚠️  [Resend KYC Rejection Email Failed]: %v", err)
				}
			}
		}(targetEmail, targetUsername, newUserKYCStatus, reason)
	}

	now := time.Now().UTC()
	reviewPayload := map[string]interface{}{
		"user_id":          targetUserID,
		"kyc_status":       newUserKYCStatus,
		"reviewed_by":      adminClaims.UserID,
		"reviewed_at":      now,
		"rejection_reason": reason,
	}

	// Broadcast real-time KYC_STATUS_UPDATED event to:
	// 1. The specific user across all their devices/tabs (instantly unlocks/updates their UI)
	// 2. All connected admins in admin:compliance (so other admins see the status change immediately)
	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastToUser(targetUserID, ws.EventKYCStatusUpdated, reviewPayload)
		ws.GlobalHub.BroadcastToRoom(ws.TopicAdminCompliance, ws.EventKYCStatusUpdated, reviewPayload)
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"message":          fmt.Sprintf("User KYC status updated to '%s' and email notification dispatched", newUserKYCStatus),
		"user_id":          targetUserID,
		"kyc_status":       newUserKYCStatus,
		"reviewed_by":      adminClaims.UserID,
		"reviewed_at":      now,
		"rejection_reason": reason,
	})
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

	accessToken, expiresIn, err := auth.GenerateAccessToken(user.ID, sessionID, user.Email, user.Username, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	kyc := fetchUserKYC(r.Context(), user.ID)

	return &models.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		ExpiresIn:    expiresIn,
		User:         user.ToResponse(kyc),
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
