package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"darkhold-dex/backend/pkg/db"
	"darkhold-dex/backend/pkg/queue"
	"darkhold-dex/backend/pkg/ws"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	log.Println("⚡ [Darkhold Worker] Initializing dedicated event-driven background worker...")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to Supabase PostgreSQL database
	database, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("❌ [Darkhold Worker] Database connection failed: %v", err)
	}
	defer database.Close()

	// Initialize Blocking Pop Worker Server (zero-polling BLMOVE)
	blockingServer := queue.NewBlockingWorkerServer(database.Pool, ws.GlobalHub, 0)
	if err := blockingServer.Start(ctx); err != nil {
		log.Fatalf("❌ [Darkhold Worker] Failed to start blocking worker: %v", err)
	}

	// Graceful shutdown listener
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	<-stop
	log.Println("⚡ [Darkhold Worker] Shutting down worker gracefully...")
	blockingServer.Shutdown()
	log.Println("Worker process terminated cleanly.")
	_ = time.Second
}
