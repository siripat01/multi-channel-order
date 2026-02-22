package main

import (
	"log"

	"github.com/hibiken/asynq"
	"github.com/siripat01/order-sync/internal"
)

func main() {
	redisAddr := internal.GetEnv("REDIS_ADDR", "localhost:6379")

	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{Concurrency: 10},
	)

	internal.InitializeSupabaseClient()

	mux := asynq.NewServeMux()
	mux.HandleFunc("order:sync", NewOrderSyncHandler)

	if err := srv.Run(mux); err != nil {
		log.Fatal(err)
	}

}
