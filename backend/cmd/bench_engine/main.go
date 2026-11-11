package main

import (
	"fmt"
	"math/rand"
	"sort"
	"sync"
	"time"

	"darkhold-dex/backend/pkg/engine"
	"darkhold-dex/backend/pkg/models"

	"github.com/google/uuid"
)

func main() {
	fmt.Println("================================================================================")
	fmt.Println("🚀 DARKHOLD IN-MEMORY MATCHING ENGINE HIGH-CONCURRENCY STRESS BENCHMARK")
	fmt.Println("================================================================================")

	const (
		totalOrders = 100000
		numWorkers  = 12
		seedOrders  = 5000
	)

	ob := engine.NewOrderBook("BENCH_STRESS_EVENT", 20000.0)
	makerID := uuid.New()

	fmt.Printf("1. Pre-seeding %d resting limit sell orders across 50 price levels...\n", seedOrders)
	for i := 0; i < seedOrders; i++ {
		price := 100.0 + float64(i%50)
		sell := &models.Order{
			ID:             uuid.New(),
			UserID:         makerID,
			EventSymbol:    "BENCH_STRESS_EVENT",
			Side:           models.SideSell,
			OrderType:      models.OrderTypeLimit,
			Price:          price,
			Quantity:       1000,
			FilledQuantity: 0,
			Status:         models.OrderStatusOpen,
			CreatedAt:      time.Now().UTC(),
		}
		if _, err := ob.MatchOrder(sell); err != nil {
			panic(err)
		}
	}
	fmt.Printf("   ✅ Seeded book. Active depth: %d resting price levels.\n\n", len(ob.OrdersMap))

	ordersPerWorker := totalOrders / numWorkers
	latencies := make([]time.Duration, totalOrders)

	fmt.Printf("2. Dispatching %d aggressive buy orders across %d concurrent goroutines...\n", totalOrders, numWorkers)
	var wg sync.WaitGroup
	start := time.Now()

	for w := 0; w < numWorkers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			offset := workerID * ordersPerWorker
			buyerID := uuid.New() // Unique buyer per worker ensures wash-trading guard is satisfied
			r := rand.New(rand.NewSource(int64(workerID + 100)))

			for i := 0; i < ordersPerWorker; i++ {
				price := 120.0 + float64(r.Intn(40)) // Price range ₹120 - ₹160
				buy := &models.Order{
					ID:             uuid.New(),
					UserID:         buyerID,
					EventSymbol:    "BENCH_STRESS_EVENT",
					Side:           models.SideBuy,
					OrderType:      models.OrderTypeLimit,
					Price:          price,
					Quantity:       1,
					FilledQuantity: 0,
					Status:         models.OrderStatusOpen,
					CreatedAt:      time.Now().UTC(),
				}

				t0 := time.Now()
				_, _ = ob.MatchOrder(buy)
				latencies[offset+i] = time.Since(t0)
			}
		}(w)
	}

	wg.Wait()
	elapsed := time.Since(start)

	throughput := float64(totalOrders) / elapsed.Seconds()

	sort.Slice(latencies, func(i, j int) bool {
		return latencies[i] < latencies[j]
	})

	p50 := latencies[int(float64(totalOrders)*0.50)]
	p90 := latencies[int(float64(totalOrders)*0.90)]
	p99 := latencies[int(float64(totalOrders)*0.99)]
	p999 := latencies[int(float64(totalOrders)*0.999)]
	maxLat := latencies[totalOrders-1]

	fmt.Println("================================================================================")
	fmt.Println("📊 BENCHMARK RESULTS")
	fmt.Println("================================================================================")
	fmt.Printf("Total Orders Processed : %d\n", totalOrders)
	fmt.Printf("Concurrent Workers     : %d goroutines\n", numWorkers)
	fmt.Printf("Total Elapsed Time     : %v\n", elapsed)
	fmt.Printf("Throughput             : \033[1;32m%.2f orders/sec\033[0m\n", throughput)
	fmt.Println("--------------------------------------------------------------------------------")
	fmt.Println("Latency Distribution (per-order match time in RAM):")
	fmt.Printf("  p50 (Median)         : %v\n", p50)
	fmt.Printf("  p90                  : %v\n", p90)
	fmt.Printf("  p99                  : \033[1;33m%v\033[0m (Sub-millisecond SLA)\n", p99)
	fmt.Printf("  p99.9                : %v\n", p999)
	fmt.Printf("  Max Latency          : %v\n", maxLat)
	fmt.Println("================================================================================")
}

