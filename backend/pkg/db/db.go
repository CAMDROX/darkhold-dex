package db

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// DB holds the connection pool
type DB struct {
	Pool *pgxpool.Pool
}

// Global instance if needed
var GlobalDB *DB

// Connect initializes the PostgreSQL connection pool to Supabase
func Connect(ctx context.Context) (*DB, error) {
	// Attempt to load .env from current directory or parent directory
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	connStr := os.Getenv("DATABASE_URL")

	// If DATABASE_URL is not set directly, build it from individual variables
	if connStr == "" {
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		user := os.Getenv("DB_USER")
		password := os.Getenv("DB_PASSWORD")
		dbname := os.Getenv("DB_NAME")
		sslmode := os.Getenv("DB_SSLMODE")

		if host == "" || user == "" {
			return nil, fmt.Errorf("database configuration missing: provide DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD in .env")
		}

		if port == "" {
			port = "5432"
		}
		if dbname == "" {
			dbname = "postgres"
		}
		if sslmode == "" {
			sslmode = "require"
		}

		// URL-encode password in case of special characters like @, #, $, /
		encodedPassword := url.QueryEscape(password)
		connStr = fmt.Sprintf("postgresql://%s:%s@%s:%s/%s?sslmode=%s",
			user, encodedPassword, host, port, dbname, sslmode)
	}

	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database connection string: %w", err)
	}

	// Optimize connection pool settings for high-frequency orderbook & double-entry ledger
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 15 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgxpool: %w", err)
	}

	// Ping database to verify live connectivity
	pingCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("database ping failed: unable to establish connection to Supabase: %w", err)
	}

	log.Println("⚡ [Supabase DB] Successfully connected and pinged Supabase PostgreSQL database!")
	GlobalDB = &DB{Pool: pool}
	return GlobalDB, nil
}

// Close gracefully closes the connection pool
func (d *DB) Close() {
	if d.Pool != nil {
		d.Pool.Close()
		log.Println("[Supabase DB] Connection pool closed.")
	}
}
