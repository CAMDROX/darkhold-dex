package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"strings"

	"github.com/mileusna/useragent"
)

// GenerateRefreshToken generates a 64-character random hex token and its SHA-256 hash
func GenerateRefreshToken() (rawToken string, tokenHash string, err error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", err
	}
	rawToken = hex.EncodeToString(bytes)
	tokenHash = HashRefreshToken(rawToken)
	return rawToken, tokenHash, nil
}

// HashRefreshToken hashes a raw refresh token using SHA-256 for secure DB storage
func HashRefreshToken(rawToken string) string {
	hash := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(hash[:])
}

// ParseClientInfo extracts device, browser, OS, and client IP from HTTP request
func ParseClientInfo(r *http.Request) (deviceName, browser, os, ip string) {
	uaStr := r.UserAgent()
	ua := useragent.Parse(uaStr)

	// Browser
	if ua.Name != "" {
		browser = fmt.Sprintf("%s %s", ua.Name, ua.Version)
	} else {
		browser = "Unknown Browser"
	}

	// Operating System
	if ua.OS != "" {
		os = fmt.Sprintf("%s %s", ua.OS, ua.OSVersion)
	} else {
		os = "Unknown OS"
	}

	// Device classification
	if ua.Mobile {
		deviceName = "Mobile Device"
		if ua.Device != "" {
			deviceName = ua.Device
		}
	} else if ua.Tablet {
		deviceName = "Tablet Device"
	} else if ua.Desktop {
		deviceName = fmt.Sprintf("%s Desktop", ua.OS)
	} else if ua.Bot {
		deviceName = "Automated Bot / Script"
	} else {
		deviceName = "Web Client"
	}

	// Client IP Address
	ip = extractIP(r)

	return strings.TrimSpace(deviceName), strings.TrimSpace(browser), strings.TrimSpace(os), ip
}

func extractIP(r *http.Request) string {
	// Check X-Forwarded-For header
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	xri := r.Header.Get("X-Real-IP")
	if xri != "" {
		ip := strings.TrimSpace(xri)
		if net.ParseIP(ip) != nil {
			return ip
		}
	}

	// Fallback to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && net.ParseIP(host) != nil {
		return host
	}

	return "127.0.0.1"
}
