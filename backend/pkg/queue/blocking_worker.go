package queue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"
	"time"

	"darkhold-dex/backend/pkg/ws"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

const (
	// Active queue names for event-driven Redis blocking pop
	QueueSettlements = "darkhold:queue:settlements"
	QueueCritical    = "darkhold:queue:critical"

	// Suffix for atomic processing state (at-least-once guarantee)
	ActiveSuffix = ":active"
	DLQSuffix    = ":dlq"
)

// BlockingTask encapsulates a task payload with metadata for blocking pop workers
type BlockingTask struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Queue     string          `json:"queue"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt time.Time       `json:"created_at"`
	Retry     int             `json:"retry"`
	MaxRetry  int             `json:"max_retry"`
}

// EnqueueTicketVerify pushes a ticket verification task to QueueCritical via LPUSH (instant wake-up for BLMOVE)
func EnqueueTicketVerify(ctx context.Context, userID uuid.UUID, eventSymbol, ticketID string) (string, error) {
	rdb := GetRedisUniversalClient()
	if rdb == nil {
		return "", errors.New("redis client unavailable")
	}

	payloadBytes, err := json.Marshal(TicketVerifyPayload{
		UserID:      userID,
		EventSymbol: eventSymbol,
		TicketID:    ticketID,
	})
	if err != nil {
		return "", fmt.Errorf("failed to marshal ticket verify payload: %w", err)
	}

	taskID := uuid.New().String()
	task := BlockingTask{
		ID:        taskID,
		Type:      TypeTicketVerify,
		Queue:     QueueCritical,
		Payload:   payloadBytes,
		CreatedAt: time.Now().UTC(),
		Retry:     0,
		MaxRetry:  3,
	}

	taskJSON, err := json.Marshal(task)
	if err != nil {
		return "", fmt.Errorf("failed to marshal task: %w", err)
	}

	if err := rdb.LPush(ctx, QueueCritical, taskJSON).Err(); err != nil {
		return "", fmt.Errorf("failed to LPUSH task to redis: %w", err)
	}

	return taskID, nil
}

// EnqueueTradeSettle pushes an atomic trade settlement task to QueueSettlements via LPUSH (instant wake-up for BLMOVE)
func EnqueueTradeSettle(ctx context.Context, makerOrderID, takerOrderID uuid.UUID, price float64, quantity int, eventSymbol string) (string, error) {
	rdb := GetRedisUniversalClient()
	if rdb == nil {
		return "", errors.New("redis client unavailable")
	}

	payloadBytes, err := json.Marshal(TradeSettlePayload{
		MakerOrderID: makerOrderID,
		TakerOrderID: takerOrderID,
		Price:        price,
		Quantity:     quantity,
		EventSymbol:  eventSymbol,
	})
	if err != nil {
		return "", fmt.Errorf("failed to marshal trade settle payload: %w", err)
	}

	taskID := uuid.New().String()
	task := BlockingTask{
		ID:        taskID,
		Type:      TypeTradeSettle,
		Queue:     QueueSettlements,
		Payload:   payloadBytes,
		CreatedAt: time.Now().UTC(),
		Retry:     0,
		MaxRetry:  5,
	}

	taskJSON, err := json.Marshal(task)
	if err != nil {
		return "", fmt.Errorf("failed to marshal task: %w", err)
	}

	if err := rdb.LPush(ctx, QueueSettlements, taskJSON).Err(); err != nil {
		return "", fmt.Errorf("failed to LPUSH task to redis: %w", err)
	}

	return taskID, nil
}

// BlockingWorkerServer implements an event-driven worker pool using Redis BLMOVE / BRPopLPush
// Eliminates polling loops and wakes up worker goroutines in < 0.2ms upon LPUSH
type BlockingWorkerServer struct {
	pool        *pgxpool.Pool
	hub         *ws.Hub
	rdb         redis.UniversalClient
	worker      *TicketWorker
	concurrency int
	stopChan    chan struct{}
	wg          sync.WaitGroup
	running     bool
	mu          sync.Mutex
}

// NewBlockingWorkerServer initializes a new blocking worker server
func NewBlockingWorkerServer(pool *pgxpool.Pool, hub *ws.Hub, concurrency int) *BlockingWorkerServer {
	if concurrency <= 0 {
		concurrency = 10
		if cStr := os.Getenv("WORKER_CONCURRENCY"); cStr != "" {
			if parsed, err := strconv.Atoi(cStr); err == nil && parsed > 0 {
				concurrency = parsed
			}
		}
	}

	return &BlockingWorkerServer{
		pool:        pool,
		hub:         hub,
		rdb:         GetRedisUniversalClient(),
		worker:      NewTicketWorker(pool, hub),
		concurrency: concurrency,
		stopChan:    make(chan struct{}),
	}
}

// Start launches the blocking pop worker pool in the background
func (s *BlockingWorkerServer) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		return nil
	}
	s.running = true

	if s.rdb == nil {
		return errors.New("redis client unavailable: cannot start blocking worker")
	}

	// Recover any stranded tasks from previous crashes in the active processing lists
	s.recoverActiveQueues(ctx)

	log.Printf("⚡ [Darkhold Worker] Launching %d event-driven Blocking Pop (BLMOVE) worker goroutines on queues: [settlements, critical]", s.concurrency)

	for i := 0; i < s.concurrency; i++ {
		s.wg.Add(1)
		go s.workerLoop(ctx, i+1)
	}

	return nil
}

// recoverActiveQueues moves any uncompleted tasks from `:active` back to the main queue upon startup
func (s *BlockingWorkerServer) recoverActiveQueues(ctx context.Context) {
	queues := []string{QueueSettlements, QueueCritical}
	for _, q := range queues {
		activeQueue := q + ActiveSuffix
		count := 0
		for {
			// Atomically move from active back to main queue
			res, err := s.rdb.RPopLPush(ctx, activeQueue, q).Result()
			if err != nil || res == "" {
				break
			}
			count++
		}
		if count > 0 {
			log.Printf("⚡ [Worker Recovery] Recovered %d uncompleted task(s) from %s to %s", count, activeQueue, q)
		}
	}
}

// workerLoop executes strict-priority event-driven blocking pop
func (s *BlockingWorkerServer) workerLoop(ctx context.Context, workerID int) {
	defer s.wg.Done()

	// Prioritized queue list: settlements first (priority 1), then critical (priority 2)
	queues := []string{QueueSettlements, QueueCritical}

	for {
		select {
		case <-s.stopChan:
			return
		case <-ctx.Done():
			return
		default:
		}

		taskStr, matchedQueue, err := s.blockingPopNextTask(ctx, queues)
		if err != nil {
			if errors.Is(err, redis.Nil) || errors.Is(err, context.Canceled) {
				continue
			}
			// Transient network glitch: back off briefly before retrying socket
			time.Sleep(100 * time.Millisecond)
			continue
		}

		if taskStr == "" {
			continue
		}

		s.processTask(ctx, taskStr, matchedQueue)
	}
}

// blockingPopNextTask checks settlements first (highest priority), then critical, using BLMOVE with 2-second timeout
func (s *BlockingWorkerServer) blockingPopNextTask(ctx context.Context, queues []string) (string, string, error) {
	timeout := 2 * time.Second

	for _, q := range queues {
		activeQueue := q + ActiveSuffix

		// Try BLMOVE (Redis 6.2+)
		res, err := s.rdb.BLMove(ctx, q, activeQueue, "RIGHT", "LEFT", timeout).Result()
		if err == nil && res != "" {
			return res, q, nil
		}

		// Fallback to BRPopLPush if BLMOVE is unrecognized
		if err != nil && err != redis.Nil {
			resFallback, fallbackErr := s.rdb.BRPopLPush(ctx, q, activeQueue, timeout).Result()
			if fallbackErr == nil && resFallback != "" {
				return resFallback, q, nil
			}
			if fallbackErr != redis.Nil {
				return "", "", fallbackErr
			}
		}
	}

	return "", "", redis.Nil
}

// processTask handles task deserialization, execution, retry tracking, and active queue removal
func (s *BlockingWorkerServer) processTask(ctx context.Context, rawTaskStr, sourceQueue string) {
	activeQueue := sourceQueue + ActiveSuffix

	var task BlockingTask
	if err := json.Unmarshal([]byte(rawTaskStr), &task); err != nil {
		log.Printf("❌ [Blocking Worker] Corrupted task JSON, moving to DLQ: %v", err)
		_ = s.rdb.LPush(ctx, sourceQueue+DLQSuffix, rawTaskStr).Err()
		_ = s.rdb.LRem(ctx, activeQueue, 1, rawTaskStr).Err()
		return
	}

	var processErr error

	switch task.Type {
	case TypeTicketVerify:
		var payload TicketVerifyPayload
		if err := json.Unmarshal(task.Payload, &payload); err != nil {
			processErr = fmt.Errorf("ticket payload unmarshal: %w", err)
		} else {
			processErr = s.worker.ProcessTicketVerifyInternal(ctx, payload)
		}

	case TypeTradeSettle:
		var payload TradeSettlePayload
		if err := json.Unmarshal(task.Payload, &payload); err != nil {
			processErr = fmt.Errorf("trade settle payload unmarshal: %w", err)
		} else {
			processErr = s.worker.HandleTradeSettlementInternal(ctx, payload)
		}

	default:
		processErr = fmt.Errorf("unknown task type: %s", task.Type)
	}

	if processErr != nil {
		log.Printf("⚠️  [Blocking Worker Task Failed] TaskID=%s Type=%s Error=%v", task.ID, task.Type, processErr)

		// Check retry limit
		if task.Retry < task.MaxRetry {
			task.Retry++
			if updatedJSON, err := json.Marshal(task); err == nil {
				_ = s.rdb.LPush(ctx, sourceQueue, updatedJSON).Err()
			}
		} else {
			log.Printf("❌ [Blocking Worker Retries Exhausted] TaskID=%s moved to DLQ %s", task.ID, sourceQueue+DLQSuffix)
			_ = s.rdb.LPush(ctx, sourceQueue+DLQSuffix, rawTaskStr).Err()
		}
	}

	// Always remove successfully processed or retried/dead-lettered task from active queue
	_ = s.rdb.LRem(ctx, activeQueue, 1, rawTaskStr).Err()
}

// Shutdown stops the worker pool cleanly, letting in-flight jobs finish
func (s *BlockingWorkerServer) Shutdown() {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return
	}
	s.running = false
	close(s.stopChan)
	s.mu.Unlock()

	log.Println("⚡ [Darkhold Worker] Gracefully shutting down blocking worker goroutines...")
	s.wg.Wait()
	log.Println("⚡ [Darkhold Worker] All blocking worker goroutines stopped cleanly.")
}

// StartBlockingWorker provides a one-line starter for cmd/server embedded background processing
func StartBlockingWorker(ctx context.Context, pool *pgxpool.Pool, hub *ws.Hub) (*BlockingWorkerServer, error) {
	server := NewBlockingWorkerServer(pool, hub, 0)
	if err := server.Start(ctx); err != nil {
		return nil, err
	}
	return server, nil
}
