package handlers

import (
	"log"
	"net/http"
	"strings"

	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/middleware"
	"darkhold-dex/backend/pkg/models"

	"github.com/google/uuid"
)

// GetSessions lists all active (unrevoked, non-expired) sessions for the authenticated user
func GetSessions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	query := `
		SELECT id, device_name, browser, os, COALESCE(ip_address::text, '127.0.0.1'), last_used_at, created_at
		FROM public.sessions
		WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
		ORDER BY last_used_at DESC;
	`

	rows, err := db.GlobalDB.Pool.Query(r.Context(), query, claims.UserID)
	if err != nil {
		log.Printf("❌ [GetSessions Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to retrieve active sessions")
		return
	}
	defer rows.Close()

	sessions := make([]models.SessionResponse, 0)
	for rows.Next() {
		var s models.SessionResponse
		if err := rows.Scan(&s.ID, &s.DeviceName, &s.Browser, &s.OS, &s.IPAddress, &s.LastUsedAt, &s.CreatedAt); err != nil {
			log.Printf("⚠️  [GetSessions Scan Error]: %v", err)
			continue
		}
		s.IsCurrent = (s.ID == claims.SessionID)
		sessions = append(sessions, s)
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// RevokeSession terminates a specific session by ID (remote device logout)
func RevokeSession(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Extract session ID from URL path: /api/auth/sessions/{id}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		writeJSONError(w, http.StatusBadRequest, "Session ID is required in URL path")
		return
	}
	targetSessionIDStr := pathParts[3]
	targetSessionID, err := uuid.Parse(targetSessionIDStr)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid session UUID format")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	cmdTag, err := db.GlobalDB.Pool.Exec(r.Context(),
		`UPDATE public.sessions 
		 SET revoked_at = NOW(), updated_at = NOW() 
		 WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
		targetSessionID, claims.UserID,
	)

	if err != nil {
		log.Printf("❌ [RevokeSession Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to revoke session")
		return
	}

	if cmdTag.RowsAffected() == 0 {
		writeJSONError(w, http.StatusNotFound, "Session not found or already revoked")
		return
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"success":            true,
		"message":            "Session revoked successfully",
		"revoked_session_id": targetSessionID,
		"was_current":        (targetSessionID == claims.SessionID),
	})
}

// RevokeAllSessions terminates all active sessions for the user
func RevokeAllSessions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSONError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if db.GlobalDB == nil || db.GlobalDB.Pool == nil {
		writeJSONError(w, http.StatusInternalServerError, "Database connection not available")
		return
	}

	cmdTag, err := db.GlobalDB.Pool.Exec(r.Context(),
		`UPDATE public.sessions 
		 SET revoked_at = NOW(), updated_at = NOW() 
		 WHERE user_id = $1 AND revoked_at IS NULL`,
		claims.UserID,
	)

	if err != nil {
		log.Printf("❌ [RevokeAllSessions Error]: %v", err)
		writeJSONError(w, http.StatusInternalServerError, "Failed to revoke all sessions")
		return
	}

	writeJSONSuccess(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"message":        "All sessions have been revoked",
		"revoked_count": cmdTag.RowsAffected(),
	})
}
