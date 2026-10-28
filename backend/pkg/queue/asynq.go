package queue

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

const (
	// ChannelWSEvents is the Redis Pub/Sub channel used to relay worker events to the WebSocket hub
	ChannelWSEvents = "darkhold:ws:events"
)

var (
	// GlobalClient is the shared Asynq client instance for task enqueuing
	GlobalClient *asynq.Client
	clientOnce   sync.Once

	// globalRedisClient is the shared go-redis client for direct Redis commands and Pub/Sub
	globalRedisClient redis.UniversalClient
	rdbOnce           sync.Once
)

// WSEventBroadcast defines the payload format transmitted across Redis Pub/Sub
type WSEventBroadcast struct {
	SourcePID int         `json:"source_pid"`
	UserID    uuid.UUID   `json:"user_id"`
	Event     string      `json:"event"`
	Data      interface{} `json:"data"`
}

// GetRedisConnOpt constructs the Redis connection options from environment variables.
// Supports full connection URLs (REDIS_URL) or individual host/port/auth settings.
func GetRedisConnOpt() asynq.RedisConnOpt {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	redisURL := os.Getenv("REDIS_URL")
	if redisURL != "" {
		opt, err := asynq.ParseRedisURI(redisURL)
		if err == nil {
			return opt
		}
		log.Printf("⚠️  [Redis Config] Failed to parse REDIS_URL (%v), falling back to host/port configs", err)
	}

	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		host := os.Getenv("REDIS_HOST")
		if host == "" {
			host = "127.0.0.1"
		}
		port := os.Getenv("REDIS_PORT")
		if port == "" {
			port = "6379"
		}
		addr = host + ":" + port
	}

	password := os.Getenv("REDIS_PASSWORD")
	dbIndex := 0
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if parsedDB, err := strconv.Atoi(dbStr); err == nil {
			dbIndex = parsedDB
		}
	}

	return asynq.RedisClientOpt{
		Addr:         addr,
		Password:     password,
		DB:           dbIndex,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     20,
	}
}

// GetRedisUniversalClient initializes or returns the shared go-redis client for Pub/Sub
func GetRedisUniversalClient() redis.UniversalClient {
	rdbOnce.Do(func() {
		_ = godotenv.Load(".env")
		_ = godotenv.Load("../.env")

		redisURL := os.Getenv("REDIS_URL")
		if redisURL != "" {
			opt, err := redis.ParseURL(redisURL)
			if err == nil {
				globalRedisClient = redis.NewClient(opt)
				log.Println("⚡ [Redis Client] Connected to Redis Cloud via REDIS_URL.")
				return
			}
			log.Printf("⚠️  [Redis Client] ParseURL failed: %v", err)
		}

		addr := os.Getenv("REDIS_ADDR")
		if addr == "" {
			addr = "127.0.0.1:6379"
		}
		globalRedisClient = redis.NewClient(&redis.Options{
			Addr:     addr,
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       0,
		})
		log.Println("⚡ [Redis Client] Connected via REDIS_ADDR.")
	})
	return globalRedisClient
}

// PublishWSEvent sends an event message across Redis Pub/Sub for cross-process WebSocket dispatch
func PublishWSEvent(ctx context.Context, userID uuid.UUID, event string, data interface{}) error {
	rdb := GetRedisUniversalClient()
	if rdb == nil {
		return nil
	}

	msg := WSEventBroadcast{
		SourcePID: os.Getpid(),
		UserID:    userID,
		Event:     event,
		Data:      data,
	}

	bytes, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	return rdb.Publish(ctx, ChannelWSEvents, bytes).Err()
}

// StartWSEventBridge listens on Redis Pub/Sub and relays events to the local WebSocket hub
func StartWSEventBridge(ctx context.Context, hub *ws.Hub) {
	if hub == nil {
		return
	}

	rdb := GetRedisUniversalClient()
	if rdb == nil {
		return
	}

	pubsub := rdb.Subscribe(ctx, ChannelWSEvents)
	go func() {
		defer pubsub.Close()
		log.Println("⚡ [Redis PubSub Bridge] Subscribed to", ChannelWSEvents)

		ch := pubsub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case redisMsg, ok := <-ch:
				if !ok {
					return
				}
				var b WSEventBroadcast
				if err := json.Unmarshal([]byte(redisMsg.Payload), &b); err != nil {
					continue
				}

				// If event originated from a separate process (e.g. standalone worker),
				// forward it to connected WebSocket clients in this server process
				if b.SourcePID != os.Getpid() {
					hub.BroadcastToUser(b.UserID, b.Event, b.Data)
				}
			}
		}
	}()
}

// InitClient initializes and registers the singleton Asynq client.
func InitClient() *asynq.Client {
	clientOnce.Do(func() {
		redisOpt := GetRedisConnOpt()
		GlobalClient = asynq.NewClient(redisOpt)
		log.Println("⚡ [Asynq Client] Initialized Redis task queue client.")
	})
	return GlobalClient
}

// GetClient returns the initialized Asynq client, or initializes it if nil.
func GetClient() *asynq.Client {
	if GlobalClient == nil {
		return InitClient()
	}
	return GlobalClient
}

// CloseClient gracefully closes the Asynq client connection.
func CloseClient() {
	if GlobalClient != nil {
		if err := GlobalClient.Close(); err != nil {
			log.Printf("⚠️  [Asynq Client] Error closing client: %v", err)
		} else {
			log.Println("[Asynq Client] Task queue client closed cleanly.")
		}
	}
}

// NewServer creates a new configured Asynq Server for worker processing.
func NewServer() *asynq.Server {
	redisOpt := GetRedisConnOpt()

	concurrency := 10
	if cStr := os.Getenv("WORKER_CONCURRENCY"); cStr != "" {
		if parsedC, err := strconv.Atoi(cStr); err == nil && parsedC > 0 {
			concurrency = parsedC
		}
	}

	return asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: concurrency,
			Queues: map[string]int{
				"settlements": 8,
				"critical":    6,
			},
			StrictPriority:    true,
			TaskCheckInterval: 100 * time.Millisecond,
			ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
				log.Printf("❌ [Asynq Worker] Task failed! Type=%s Payload=%s Error=%v",
					task.Type(), string(task.Payload()), err)
			}),
			HealthCheckFunc: func(err error) {
				if err != nil {
					log.Printf("⚠️  [Asynq Worker HealthCheck] Warning: %v", err)
				}
			},
		},
	)
}
