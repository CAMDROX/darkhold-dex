package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/middleware"
	"darkhold-dex/backend/pkg/models"
	"darkhold-dex/backend/pkg/queue"
	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ImportTicket handles POST /api/tickets/import
// Steps:
// 1. Authenticate user from session context
// 2. Decode ticket_id and event_symbol
// 3. Pre-check: SELECT EXISTS in relic_inventory where external_ticket_id = input.ticket_id
// 4. Validate event existence
// 5. Enqueue asynq task (ticket:verify)
// 6. Return 202 Accepted
func ImportTicket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeTicketError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeTicketError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	var req models.ImportTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeTicketError(w, http.StatusBadRequest, "Invalid request payload. Expected {ticket_id, event_symbol}", "INVALID_BODY")
		return
	}

	req.TicketID = strings.TrimSpace(req.TicketID)
	req.EventSymbol = strings.ToUpper(strings.TrimSpace(req.EventSymbol))

	if req.TicketID == "" {
		writeTicketError(w, http.StatusBadRequest, "ticket_id is required", "MISSING_TICKET_ID")
		return
	}

	if req.EventSymbol == "" {
		writeTicketError(w, http.StatusBadRequest, "event_symbol is required", "MISSING_EVENT_SYMBOL")
		return
	}

	// ========================================================
	// Step 1: Enforce KYC Gate - Only 'verified' users can import assets
	// ========================================================
	var kycStatus string
	err := db.GlobalDB.Pool.QueryRow(r.Context(),
		"SELECT LOWER(COALESCE(kyc_status, 'unverified')) FROM public.users WHERE id = $1",
		claims.UserID,
	).Scan(&kycStatus)

	if err != nil {
		log.Printf("❌ [Ticket Import KYC Check DB Error]: %v", err)
		writeTicketError(w, http.StatusInternalServerError, "Failed to verify identity status", "DB_ERROR")
		return
	}

	if kycStatus != "verified" {
		log.Printf("⛔ [Ticket Import KYC Denied] UserID=%s Status=%s attempted import", claims.UserID, kycStatus)
		writeTicketError(w, http.StatusForbidden,
			"Identity verification required: Only KYC-verified traders are permitted to import and mint ticket relics into Darkhold Exchange.",
			"KYC_VERIFICATION_REQUIRED")
		return
	}

	// ========================================================
	// Step 2 Pre-Check: Fast duplicate check on relic_inventory
	// ========================================================
	var exists bool
	err = db.GlobalDB.Pool.QueryRow(r.Context(),
		"SELECT EXISTS(SELECT 1 FROM public.relic_inventory WHERE external_ticket_id = $1)",
		req.TicketID,
	).Scan(&exists)

	if err != nil {
		log.Printf("❌ [Ticket Import DB Error]: %v", err)
		writeTicketError(w, http.StatusInternalServerError, "Failed to verify ticket uniqueness", "DB_ERROR")
		return
	}

	if exists {
		writeTicketError(w, http.StatusBadRequest,
			fmt.Sprintf("Duplicate ticket: Barcode '%s' has already been imported into Darkhold Exchange.", req.TicketID),
			"DUPLICATE_TICKET")
		return
	}

	// Validate target event exists and is ACTIVE
	var eventID uuid.UUID
	err = db.GlobalDB.Pool.QueryRow(r.Context(),
		"SELECT id FROM public.events WHERE symbol = $1 AND status = 'ACTIVE'",
		req.EventSymbol,
	).Scan(&eventID)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeTicketError(w, http.StatusBadRequest,
				fmt.Sprintf("Event symbol '%s' does not exist or is not active", req.EventSymbol),
				"EVENT_NOT_FOUND")
			return
		}
		log.Printf("❌ [Ticket Import Event DB Error]: %v", err)
		writeTicketError(w, http.StatusInternalServerError, "Failed to validate event configuration", "DB_ERROR")
		return
	}

	// ========================================================
	// Enqueue Asynq Background Task (ticket:verify)
	// ========================================================
	task, err := queue.NewTicketVerifyTask(claims.UserID, req.EventSymbol, req.TicketID)
	if err != nil {
		log.Printf("❌ [Ticket Import Task Error]: %v", err)
		writeTicketError(w, http.StatusInternalServerError, "Failed to construct background verification task", "TASK_CREATION_FAILED")
		return
	}

	asynqClient := queue.GetClient()
	enqueued := false
	var taskID, queueName string

	if asynqClient != nil {
		info, err := asynqClient.EnqueueContext(r.Context(), task)
		if err == nil {
			enqueued = true
			taskID = info.ID
			queueName = info.Queue
			log.Printf("🚀 [Ticket Import Enqueued] TaskID=%s Ticket=%s Event=%s UserID=%s",
				info.ID, req.TicketID, req.EventSymbol, claims.UserID)
		} else {
			log.Printf("⚠️  [Ticket Import Asynq Notice]: %v, dispatching direct background worker", err)
		}
	}

	if !enqueued {
		taskID = uuid.New().String()
		queueName = "in-memory"
		go func() {
			bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()
			_ = queue.ProcessTicketVerifyDirect(bgCtx, db.GlobalDB.Pool, ws.GlobalHub, queue.TicketVerifyPayload{
				UserID:      claims.UserID,
				EventSymbol: req.EventSymbol,
				TicketID:    req.TicketID,
			})
		}()
		log.Printf("🚀 [Ticket Import Dispatched Direct] TaskID=%s Ticket=%s Event=%s UserID=%s",
			taskID, req.TicketID, req.EventSymbol, claims.UserID)
	}

	// ========================================================
	// Return HTTP 202 Accepted
	// ========================================================
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"status":       "ACCEPTED",
		"message":      "Verification queued",
		"ticket_id":    req.TicketID,
		"event_symbol": req.EventSymbol,
		"task_id":      taskID,
		"queue":        queueName,
		"timestamp":    time.Now().UTC(),
	})
}

// ListUserRelics handles GET /api/tickets/mine
// Returns all relic inventory owned by the authenticated user
func ListUserRelics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeTicketError(w, http.StatusUnauthorized, "Authentication required", "UNAUTHORIZED")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeTicketError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	rows, err := db.GlobalDB.Pool.Query(r.Context(), `
		SELECT 
			r.id, r.owner_id, r.event_id, r.external_ticket_id, 
			r.external_platform, r.internal_qr_hash, r.status, 
			r.expires_at, r.created_at, r.updated_at,
			e.name as event_name, e.symbol as event_symbol
		FROM public.relic_inventory r
		JOIN public.events e ON e.id = r.event_id
		WHERE r.owner_id = $1
		ORDER BY r.created_at DESC
	`, claims.UserID)

	if err != nil {
		log.Printf("❌ [List Relics Error]: %v", err)
		writeTicketError(w, http.StatusInternalServerError, "Failed to retrieve relic inventory", "DB_ERROR")
		return
	}
	defer rows.Close()

	type RelicWithEvent struct {
		models.RelicInventory
		EventName   string `json:"event_name"`
		EventSymbol string `json:"event_symbol"`
	}

	relics := make([]RelicWithEvent, 0)
	for rows.Next() {
		var item RelicWithEvent
		err := rows.Scan(
			&item.ID,
			&item.OwnerID,
			&item.EventID,
			&item.ExternalTicketID,
			&item.ExternalPlatform,
			&item.InternalQRHash,
			&item.Status,
			&item.ExpiresAt,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.EventName,
			&item.EventSymbol,
		)
		if err != nil {
			log.Printf("⚠️  [Scan Relic Row Error]: %v", err)
			continue
		}
		relics = append(relics, item)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"relics":  relics,
		"count":   len(relics),
	})
}

func writeTicketError(w http.ResponseWriter, status int, msg, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   msg,
		"code":    code,
	})
}

// EventSummary represents an active event for UI selection
type EventSummary struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Symbol       string    `json:"symbol"`
	EventDate    time.Time `json:"event_date,omitempty"`
	FaceValue    float64   `json:"face_value,omitempty"`
	MaxSellPrice float64   `json:"max_sell_price,omitempty"`
}

// ListEvents handles GET /api/events
// Returns the list of active events in format: [{ "id": "uuid", "name": "Webster 2026", "symbol": "WEBSTER_26" }]
func ListEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeTicketError(w, http.StatusInternalServerError, "Database connection unavailable", "DB_UNAVAILABLE")
		return
	}

	rows, err := db.GlobalDB.Pool.Query(r.Context(), `
		SELECT id, name, symbol, event_date, face_value, max_sell_price
		FROM public.events
		WHERE status = 'ACTIVE'
		ORDER BY event_date ASC
	`)
	if err != nil {
		log.Printf("❌ [ListEvents Error]: %v", err)
		writeTicketError(w, http.StatusInternalServerError, "Failed to query active events", "DB_ERROR")
		return
	}
	defer rows.Close()

	events := make([]EventSummary, 0)
	for rows.Next() {
		var e EventSummary
		if err := rows.Scan(&e.ID, &e.Name, &e.Symbol, &e.EventDate, &e.FaceValue, &e.MaxSellPrice); err == nil {
			events = append(events, e)
		}
	}

	// Auto-seed default events if table is currently empty for instant developer experience
	if len(events) == 0 {
		events = autoSeedEvents(r.Context())
	}

	_ = json.NewEncoder(w).Encode(events)
}

func autoSeedEvents(ctx context.Context) []EventSummary {
	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		return []EventSummary{}
	}

	// Insert standard starter events including the required WEBSTER_26
	_, _ = db.GlobalDB.Pool.Exec(ctx, `
		INSERT INTO public.events (name, symbol, event_date, face_value, max_markup_percentage, max_sell_price, external_platform, status)
		VALUES 
			('Webster Hall — Arcane Night 2026', 'WEBSTER_26', NOW() + INTERVAL '45 days', 120.00, 0.25, 150.00, 'SIMULATED', 'ACTIVE'),
			('Tomorrowland — Book of Vishanti 2026', 'TOMORROW_26', NOW() + INTERVAL '90 days', 350.00, 0.20, 420.00, 'SIMULATED', 'ACTIVE'),
			('Coachella — Mirage Sanctuary 2026', 'COACHELLA_26', NOW() + INTERVAL '60 days', 450.00, 0.15, 517.50, 'SIMULATED', 'ACTIVE'),
			('Ultra Miami — Resistance Matrix 2026', 'ULTRA_26', NOW() + INTERVAL '120 days', 280.00, 0.25, 350.00, 'SIMULATED', 'ACTIVE')
		ON CONFLICT (symbol) DO NOTHING;
	`)

	rows, err := db.GlobalDB.Pool.Query(ctx, `
		SELECT id, name, symbol, event_date, face_value, max_sell_price
		FROM public.events
		WHERE status = 'ACTIVE'
		ORDER BY event_date ASC
	`)
	if err != nil {
		return []EventSummary{}
	}
	defer rows.Close()

	events := make([]EventSummary, 0)
	for rows.Next() {
		var e EventSummary
		if err := rows.Scan(&e.ID, &e.Name, &e.Symbol, &e.EventDate, &e.FaceValue, &e.MaxSellPrice); err == nil {
			events = append(events, e)
		}
	}
	return events
}
