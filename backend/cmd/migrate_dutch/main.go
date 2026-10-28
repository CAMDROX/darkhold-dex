package main

import (
	"context"
	"log"
	"time"

	"darkhold-dex/backend/pkg/db"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	database, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer database.Close()

	log.Println("⚡ Connected to database. Applying dutch_auctions migration...")

	schemaSQL := `
	CREATE TABLE IF NOT EXISTS public.dutch_auctions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		seller_id UUID NOT NULL REFERENCES public.users(id),
		relic_id UUID NOT NULL REFERENCES public.relic_inventory(id),
		event_symbol VARCHAR(32) NOT NULL REFERENCES public.events(symbol),
		start_price NUMERIC(18, 4) NOT NULL,
		reserve_price NUMERIC(18, 4) NOT NULL,
		current_price NUMERIC(18, 4) NOT NULL,
		clearing_price NUMERIC(18, 4),
		duration_seconds INT NOT NULL,
		buyer_id UUID REFERENCES public.users(id),
		status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED', 'EXPIRED')),
		started_at TIMESTAMPTZ DEFAULT NOW(),
		settled_at TIMESTAMPTZ,
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_dutch_auctions_status ON public.dutch_auctions(status);
	CREATE INDEX IF NOT EXISTS idx_dutch_auctions_symbol ON public.dutch_auctions(event_symbol, status);
	CREATE INDEX IF NOT EXISTS idx_dutch_auctions_seller ON public.dutch_auctions(seller_id);
	`

	_, err = database.Pool.Exec(ctx, schemaSQL)
	if err != nil {
		log.Fatalf("❌ Failed to execute migration: %v", err)
	}

	log.Println("✅ public.dutch_auctions table and indexes created successfully in Supabase PostgreSQL!")
}

