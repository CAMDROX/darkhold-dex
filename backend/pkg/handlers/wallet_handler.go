package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/middleware"
	"darkhold-dex/backend/pkg/models"
	"darkhold-dex/backend/pkg/queue"
	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// writeWalletError is a helper for returning consistent JSON error envelopes
func writeWalletError(w http.ResponseWriter, status int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   message,
		"code":    code,
	})
}

// isUniqueViolation checks if an error corresponds to PostgreSQL code 23505
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "23505") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "idx_transactions_reference_unique")
}

// resolvePlatformAdminID resolves the Admin user ID for system double-entry accounting
func resolvePlatformAdminID(ctx context.Context, tx pgx.Tx) (uuid.UUID, error) {
	checkCandidate := func(envKey string) *uuid.UUID {
		val := strings.TrimSpace(os.Getenv(envKey))
		if val != "" {
			if id, err := uuid.Parse(val); err == nil {
				var exists bool
				_ = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM public.users WHERE id = $1)", id).Scan(&exists)
				if exists {
					return &id
				}
				log.Printf("⚠️  [Admin Resolution] %s (%s) not found in public.users, using fallback", envKey, id)
			}
		}
		return nil
	}

	if id := checkCandidate("PLATFORM_ADMIN_USER_ID"); id != nil {
		return *id, nil
	}
	if id := checkCandidate("ADMIN_USER_ID"); id != nil {
		return *id, nil
	}

	// Fallback to role = 'admin'
	var adminID uuid.UUID
	err := tx.QueryRow(ctx, `
		SELECT id FROM public.users 
		WHERE role = 'admin' 
		ORDER BY created_at ASC 
		LIMIT 1
	`).Scan(&adminID)
	if err == nil {
		return adminID, nil
	}

	// Fallback to earliest created user
	err = tx.QueryRow(ctx, `
		SELECT id FROM public.users 
		ORDER BY created_at ASC 
		LIMIT 1
	`).Scan(&adminID)
	if err == nil {
		return adminID, nil
	}

	return uuid.Nil, errors.New("platform admin user not found in database")
}

// SimulateDeposit handles POST /api/wallet/deposit/simulate
// Sequential Steps:
// 1. Authenticate user from session context
// 2. Decode and validate request payload {amount, currency, payment_id}
// 2b. Enforce KYC Gate: Only 'verified' users can deposit (checked BEFORE duplicate check)
// 3. Fast-path Idempotency Pre-check: Check if reference_id already exists in transactions
// 4. Open a single pgx transaction (tx.Begin)
// 5. User Account Upsert (Just-in-Time CTE): public.accounts where currency = req.Currency & account_type = 'AVAILABLE'
// 6. Admin Account Upsert (Just-in-Time CTE): public.accounts for Platform Admin
// 7. Insert Transaction: public.transactions (transaction_type = 'FIAT_DEPOSIT', reference_id = req.PaymentID)
//    - Safely catch Postgres Unique Violation (code 23505) -> return 200 OK without running math
// 8. Double-Entry Ledger Writes:
//    - admin_account_id gets -req.Amount
//    - user_account_id gets +req.Amount
// 9. Commit SQL Transaction
// 10. WebSocket Notification: Dispatch { "type": "DEPOSIT_SUCCESS", "currency": req.Currency, "amount": req.Amount }
func SimulateDeposit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeWalletError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeWalletError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	var req models.SimulateDepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeWalletError(w, http.StatusBadRequest, "Invalid request payload. Expected {amount, currency, payment_id}", "INVALID_PAYLOAD")
		return
	}

	req.PaymentID = strings.TrimSpace(req.PaymentID)
	req.Currency = strings.ToUpper(strings.TrimSpace(req.Currency))

	if req.Amount <= 0 {
		writeWalletError(w, http.StatusBadRequest, "Deposit amount must be greater than zero", "INVALID_AMOUNT")
		return
	}

	if req.Currency == "" {
		writeWalletError(w, http.StatusBadRequest, "Currency is required (e.g. INR, USD)", "MISSING_CURRENCY")
		return
	}

	if req.PaymentID == "" {
		writeWalletError(w, http.StatusBadRequest, "payment_id is required", "MISSING_PAYMENT_ID")
		return
	}

	ctx := r.Context()

	// ========================================================
	// Step 2b: Enforce KYC Gate - Only 'verified' users can deposit funds
	// Backend strictly restricts unverified users before duplicate check
	// ========================================================
	var kycStatus string
	err := db.GlobalDB.Pool.QueryRow(ctx,
		"SELECT LOWER(COALESCE(kyc_status, 'unverified')) FROM public.users WHERE id = $1",
		claims.UserID,
	).Scan(&kycStatus)

	if err != nil {
		log.Printf("❌ [Deposit KYC Check DB Error]: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to verify identity status", "DB_ERROR")
		return
	}

	if kycStatus != "verified" {
		log.Printf("⛔ [Deposit KYC Denied] UserID=%s Status=%s attempted deposit", claims.UserID, kycStatus)
		writeWalletError(w, http.StatusForbidden,
			"Identity verification required: Only KYC-verified traders are permitted to deposit funds into Darkhold Exchange.",
			"KYC_VERIFICATION_REQUIRED")
		return
	}

	// ========================================================
	// Step 3: Fast-Path Idempotency Pre-check
	// If this reference_id was already recorded, return 200 OK immediately
	// ========================================================
	var existingTxID uuid.UUID
	err = db.GlobalDB.Pool.QueryRow(ctx, `
		SELECT id FROM public.transactions 
		WHERE transaction_type = 'FIAT_DEPOSIT' AND reference_id = $1
	`, req.PaymentID).Scan(&existingTxID)

	if err == nil {
		log.Printf("ℹ️  [SimulateDeposit Idempotent Hit] PaymentID=%s already processed (TxID=%s)", req.PaymentID, existingTxID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(models.SimulateDepositResponse{
			Success:    true,
			Status:     "ALREADY_PROCESSED",
			Message:    "Deposit already processed (idempotent request)",
			PaymentID:  req.PaymentID,
			Currency:   req.Currency,
			Amount:     req.Amount,
			Idempotent: true,
			Timestamp:  time.Now().UTC(),
		})
		return
	}

	// ========================================================
	// Step 4: Open Single pgx Transaction
	// ========================================================
	tx, err := db.GlobalDB.Pool.Begin(ctx)
	if err != nil {
		log.Printf("❌ [SimulateDeposit DB Error]: Failed to start transaction: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to initialize database transaction", "DB_TX_ERROR")
		return
	}
	defer tx.Rollback(ctx)

	// CTE query for Just-in-Time Account Upsert
	accountUpsertQuery := `
		WITH ins AS (
			INSERT INTO public.accounts (user_id, currency, account_type)
			VALUES ($1, $2, 'AVAILABLE')
			ON CONFLICT (user_id, currency, account_type) DO NOTHING
			RETURNING id
		)
		SELECT id FROM ins
		UNION ALL
		SELECT id FROM public.accounts
		WHERE user_id = $1 AND currency = $2 AND account_type = 'AVAILABLE'
		LIMIT 1;
	`

	// ========================================================
	// Step 5: User Account Upsert (Just-in-Time)
	// ========================================================
	var userAccountID uuid.UUID
	err = tx.QueryRow(ctx, accountUpsertQuery, claims.UserID, req.Currency).Scan(&userAccountID)
	if err != nil {
		log.Printf("❌ [SimulateDeposit DB Error]: User account upsert failed: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to allocate user ledger account", "ACCOUNT_UPSERT_FAILED")
		return
	}

	// ========================================================
	// Step 6: Admin Account Upsert (Just-in-Time Platform Reserve)
	// ========================================================
	adminUserID, err := resolvePlatformAdminID(ctx, tx)
	if err != nil {
		log.Printf("❌ [SimulateDeposit DB Error]: Failed to resolve admin user: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Platform admin reserve configuration error", "ADMIN_RESOLVE_FAILED")
		return
	}

	var adminAccountID uuid.UUID
	err = tx.QueryRow(ctx, accountUpsertQuery, adminUserID, req.Currency).Scan(&adminAccountID)
	if err != nil {
		log.Printf("❌ [SimulateDeposit DB Error]: Admin reserve account upsert failed: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to allocate platform reserve account", "ADMIN_ACCOUNT_FAILED")
		return
	}

	// ========================================================
	// Step 7: Insert Transaction Wrapper
	// Strict Idempotency Lock via idx_transactions_reference_unique
	// ========================================================
	var transactionID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.transactions (transaction_type, reference_id)
		VALUES ('FIAT_DEPOSIT', $1)
		RETURNING id;
	`, req.PaymentID).Scan(&transactionID)

	if err != nil {
		if isUniqueViolation(err) {
			// Idempotent retry: Rollback transaction safely and return 200 OK
			_ = tx.Rollback(ctx)
			log.Printf("ℹ️  [SimulateDeposit Unique Violation Caught] PaymentID=%s already inserted. Returning 200 OK.", req.PaymentID)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(models.SimulateDepositResponse{
				Success:    true,
				Status:     "ALREADY_PROCESSED",
				Message:    "Deposit already recorded (idempotent request)",
				PaymentID:  req.PaymentID,
				Currency:   req.Currency,
				Amount:     req.Amount,
				Idempotent: true,
				Timestamp:  time.Now().UTC(),
			})
			return
		}

		log.Printf("❌ [SimulateDeposit DB Error]: Transaction insert failed: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to record transaction wrapper", "TRANSACTION_INSERT_FAILED")
		return
	}

	// ========================================================
	// Step 8: Double-Entry Ledger Writes
	// admin_account_id gets -req.Amount
	// user_account_id gets +req.Amount
	// ========================================================
	_, err = tx.Exec(ctx, `
		INSERT INTO public.ledger_entries (transaction_id, account_id, amount)
		VALUES 
			($1, $2, $3),
			($1, $4, $5);
	`, transactionID, adminAccountID, -req.Amount, userAccountID, req.Amount)

	if err != nil {
		log.Printf("❌ [SimulateDeposit DB Error]: Ledger entry insert failed: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to record double-entry balance transfers", "LEDGER_WRITE_FAILED")
		return
	}

	// ========================================================
	// Step 9: Commit Transaction
	// ========================================================
	if err := tx.Commit(ctx); err != nil {
		if isUniqueViolation(err) {
			log.Printf("ℹ️  [SimulateDeposit Commit Race] Unique violation on commit for PaymentID=%s", req.PaymentID)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(models.SimulateDepositResponse{
				Success:    true,
				Status:     "ALREADY_PROCESSED",
				Message:    "Deposit already recorded (idempotent request)",
				PaymentID:  req.PaymentID,
				Currency:   req.Currency,
				Amount:     req.Amount,
				Idempotent: true,
				Timestamp:  time.Now().UTC(),
			})
			return
		}

		log.Printf("❌ [SimulateDeposit DB Error]: Commit failed: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to commit ledger transaction", "COMMIT_FAILED")
		return
	}

	log.Printf("💰 [Fiat Deposit Committed] User=%s Amount=%d %s TxID=%s PaymentID=%s",
		claims.UserID, req.Amount, req.Currency, transactionID, req.PaymentID)

	// ========================================================
	// Step 10: WebSocket Notification to User
	// Format: { "type": "DEPOSIT_SUCCESS", "currency": "INR", "amount": 1000.00 }
	// ========================================================
	wsPayload := map[string]interface{}{
		"type":       "DEPOSIT_SUCCESS",
		"currency":   req.Currency,
		"amount":     req.Amount,
		"payment_id": req.PaymentID,
		"tx_id":      transactionID.String(),
		"timestamp":  time.Now().UTC(),
	}

	if ws.GlobalHub != nil {
		ws.GlobalHub.BroadcastToUser(claims.UserID, ws.EventDepositSuccess, wsPayload)
	}

	// Cross-process bridge publish via Redis Pub/Sub
	if err := queue.PublishWSEvent(ctx, claims.UserID, ws.EventDepositSuccess, wsPayload); err != nil {
		log.Printf("⚠️  [SimulateDeposit PubSub] Cross-worker event relay warning: %v", err)
	}

	// HTTP 200 OK Response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(models.SimulateDepositResponse{
		Success:    true,
		Status:     "DEPOSIT_SUCCESS",
		Message:    "Deposit simulated and credited via double-entry ledger",
		PaymentID:  req.PaymentID,
		Currency:   req.Currency,
		Amount:     req.Amount,
		Idempotent: false,
		Timestamp:  time.Now().UTC(),
	})
}

// GetWalletBalances handles GET /api/wallet/balances
// Computes current available balances for authenticated user from public.accounts & ledger_entries
func GetWalletBalances(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeWalletError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeWalletError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	ctx := r.Context()
	rows, err := db.GlobalDB.Pool.Query(ctx, `
		SELECT 
			a.currency, 
			a.account_type, 
			COALESCE(SUM(le.amount), 0) AS balance
		FROM public.accounts a
		LEFT JOIN public.ledger_entries le ON a.id = le.account_id
		WHERE a.user_id = $1
		GROUP BY a.id, a.currency, a.account_type
		ORDER BY a.currency;
	`, claims.UserID)

	if err != nil {
		log.Printf("❌ [GetWalletBalances DB Error]: %v", err)
		writeWalletError(w, http.StatusInternalServerError, "Failed to calculate wallet balances", "DB_ERROR")
		return
	}
	defer rows.Close()

	balances := make([]models.BalanceItem, 0)
	currenciesSeen := make(map[string]bool)

	for rows.Next() {
		var item models.BalanceItem
		if err := rows.Scan(&item.Currency, &item.AccountType, &item.Balance); err == nil {
			balances = append(balances, item)
			currenciesSeen[item.Currency] = true
		}
	}

	// Guarantee default entries for standard currencies (INR, USD) if user hasn't made a deposit yet
	for _, c := range []string{"INR", "USD"} {
		if !currenciesSeen[c] {
			balances = append(balances, models.BalanceItem{
				Currency:    c,
				AccountType: "AVAILABLE",
				Balance:     0,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(models.WalletBalancesResponse{
		Success:  true,
		Balances: balances,
	})
}
