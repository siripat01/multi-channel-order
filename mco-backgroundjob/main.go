package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/hibiken/asynq"
	"github.com/siripat01/order-sync/internal"
)

func main() {
	redisAddr := internal.GetEnv("REDIS_ADDR", "localhost:6379")
	shopeeBaseURL := os.Getenv("SHOPEE_BASE_URL")
	if shopeeBaseURL == "" {
		log.Fatal("SHOPEE_BASE_URL must be set")
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseKey == "" {
		// Backward-compatible fallback while existing local environments migrate.
		supabaseKey = os.Getenv("SUPABASE_KEY")
	}
	if supabaseURL == "" || supabaseKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
	}

	repository, err := NewSupabaseOrderRepository(
		supabaseURL,
		supabaseKey,
		&http.Client{Timeout: 10 * time.Second},
	)
	if err != nil {
		log.Fatalf("initialize order repository: %v", err)
	}

	shopeeProvider, err := NewShopeeProvider(shopeeBaseURL, &http.Client{Timeout: 10 * time.Second})
	if err != nil {
		log.Fatalf("initialize Shopee provider: %v", err)
	}

	handler, err := NewOrderSyncTaskHandler(
		[]OrderProvider{shopeeProvider},
		repository,
		slog.Default(),
	)
	if err != nil {
		log.Fatalf("initialize order sync handler: %v", err)
	}

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{Concurrency: 10},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc("order:sync", handler.Handle)

	if err := srv.Run(mux); err != nil {
		log.Fatal(err)
	}
}
