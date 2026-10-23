package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"darkhold-dex/backend/pkg/auth"
	"darkhold-dex/backend/pkg/db"
)

type contextKey string

const ClaimsKey contextKey = "user_claims"

// RequireAuth ensures the request has a valid, non-revoked Bearer JWT
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			writeAuthError(w, http.StatusUnauthorized, "Missing or malformed Authorization header")
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := auth.ValidateAccessToken(tokenString)
		if err != nil {
			writeAuthError(w, http.StatusUnauthorized, "Invalid or expired access token")
			return
		}

		// Verify session revocation in Supabase if DB is connected
		if db.GlobalDB != nil && db.GlobalDB.Pool != nil {
			var revokedAt *time.Time
			var expiresAt time.Time
			err := db.GlobalDB.Pool.QueryRow(r.Context(),
				"SELECT revoked_at, expires_at FROM public.sessions WHERE id = $1",
				claims.SessionID,
			).Scan(&revokedAt, &expiresAt)

			if err != nil {
				writeAuthError(w, http.StatusUnauthorized, "Session no longer exists or database unreachable")
				return
			}

			if revokedAt != nil {
				writeAuthError(w, http.StatusUnauthorized, "Session has been revoked")
				return
			}

			if time.Now().After(expiresAt) {
				writeAuthError(w, http.StatusUnauthorized, "Session has expired")
				return
			}
		}

		// Inject verified claims into context
		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// GetClaims retrieves CustomClaims from request context
func GetClaims(ctx context.Context) *auth.CustomClaims {
	claims, ok := ctx.Value(ClaimsKey).(*auth.CustomClaims)
	if !ok {
		return nil
	}
	return claims
}

func writeAuthError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   msg,
		"code":    "UNAUTHORIZED",
		"success": false,
	})
}
