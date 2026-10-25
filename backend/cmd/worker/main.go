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

	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	log.Println("⚡ [Darkhold Asynq Worker] Initializing dedicated background worker...")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Connect to Supabase PostgreSQL database
	database, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("❌ [Darkhold Asynq Worker] Database connection failed: %v", err)
	}
	defer database.Close()

	// In standalone mode, ws.GlobalHub can be connected or nil
	worker := queue.NewTicketWorker(database.Pool, ws.GlobalHub)
	server := queue.NewServer()

	mux := asynq.NewServeMux()
	worker.RegisterHandlers(mux)

	// Graceful shutdown listener
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Println("⚡ [Darkhold Asynq Worker] Worker is actively polling queues: critical, default, low")
		if err := server.Run(mux); err != nil && err != asynq.ErrServerClosed {
			log.Fatalf("❌ [Darkhold Asynq Worker] Worker execution error: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down Darkhold Asynq Worker gracefully...")
	server.Shutdown()
	log.Println("Worker process terminated cleanly.")
	_ = time.Second
}
