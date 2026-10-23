package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
)

type CustomClaims struct {
	UserID    uuid.UUID `json:"user_id"`
	SessionID uuid.UUID `json:"session_id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	jwt.RegisteredClaims
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "darkhold_fallback_secret_key_arcane_99"
	}
	return []byte(secret)
}

// GenerateAccessToken creates a short-lived signed JWT (15 minutes)
func GenerateAccessToken(userID, sessionID uuid.UUID, email, username string) (string, int64, error) {
	expiresIn := int64(15 * 60) // 15 minutes in seconds
	expirationTime := time.Now().Add(time.Duration(expiresIn) * time.Second)

	claims := &CustomClaims{
		UserID:    userID,
		SessionID: sessionID,
		Email:     email,
		Username:  username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "darkhold-dex",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(getJWTSecret())
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresIn, nil
}

// ValidateAccessToken verifies the JWT signature and extracts claims
func ValidateAccessToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
