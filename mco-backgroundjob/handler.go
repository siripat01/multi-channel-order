package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

type OrderSyncTaskHandler struct {
	providers map[Channel]OrderProvider
	repository OrderRepository
	logger     *slog.Logger
}

func NewOrderSyncTaskHandler(providers []OrderProvider, repository OrderRepository, logger *slog.Logger) (*OrderSyncTaskHandler, error) {
	if repository == nil {
		return nil, fmt.Errorf("order repository is required")
	}
	if logger == nil {
		logger = slog.Default()
	}

	providerMap := make(map[Channel]OrderProvider, len(providers))
	for _, provider := range providers {
		if provider == nil {
			continue
		}
		providerMap[provider.Channel()] = provider
	}
	if len(providerMap) == 0 {
		return nil, fmt.Errorf("at least one order provider is required")
	}

	return &OrderSyncTaskHandler{
		providers:  providerMap,
		repository: repository,
		logger:     logger,
	}, nil
}

func (h *OrderSyncTaskHandler) Handle(ctx context.Context, task *asynq.Task) error {
	startedAt := time.Now()

	var payload SyncOrderPayload
	if err := json.Unmarshal(task.Payload(), &payload); err != nil {
		return fmt.Errorf("decode order sync payload: %w", err)
	}

	userID, err := uuid.Parse(payload.UserID)
	if err != nil {
		return fmt.Errorf("parse user_id %q: %w", payload.UserID, err)
	}
	shopID, err := uuid.Parse(payload.ShopID)
	if err != nil {
		return fmt.Errorf("parse shop_id %q: %w", payload.ShopID, err)
	}
	channel, err := ParseChannel(payload.Channel)
	if err != nil {
		return err
	}

	provider, ok := h.providers[channel]
	if !ok {
		return fmt.Errorf("channel %q is recognized but no provider adapter is configured", channel)
	}

	h.logger.InfoContext(ctx, "order sync started",
		"provider", channel,
		"shop_id", shopID.String(),
		"task_type", task.Type(),
	)

	orderIDs, err := provider.ListOrderIDs(ctx, ListOrdersRequest{
		ShopID:   payload.ShopID,
		TimeFrom: payload.TimeFrom,
		TimeTo:   payload.TimeTo,
	})
	if err != nil {
		return fmt.Errorf("list %s orders for shop %s: %w", channel, shopID, err)
	}
	if len(orderIDs) == 0 {
		h.logger.InfoContext(ctx, "order sync completed",
			"provider", channel,
			"shop_id", shopID.String(),
			"orders", 0,
			"duration_ms", time.Since(startedAt).Milliseconds(),
		)
		return nil
	}

	externalOrders, err := provider.GetOrders(ctx, payload.ShopID, orderIDs)
	if err != nil {
		return fmt.Errorf("get %s order details for shop %s: %w", channel, shopID, err)
	}

	orders, items, err := BuildOrders(userID, shopID, channel, externalOrders)
	if err != nil {
		return fmt.Errorf("normalize %s orders: %w", channel, err)
	}

	if err := h.repository.UpsertOrders(ctx, orders, items); err != nil {
		return fmt.Errorf("persist %s orders for shop %s: %w", channel, shopID, err)
	}

	h.logger.InfoContext(ctx, "order sync completed",
		"provider", channel,
		"shop_id", shopID.String(),
		"orders", len(orders),
		"items", len(items),
		"duration_ms", time.Since(startedAt).Milliseconds(),
	)
	return nil
}
