package main

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"testing"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

type fakeProvider struct {
	channel Channel
	orders  []ExternalOrder
}

func (f *fakeProvider) Channel() Channel { return f.channel }
func (f *fakeProvider) ListOrderIDs(context.Context, ListOrdersRequest) ([]string, error) {
	ids := make([]string, 0, len(f.orders))
	for _, order := range f.orders {
		ids = append(ids, order.ExternalOrderID)
	}
	return ids, nil
}
func (f *fakeProvider) GetOrders(context.Context, string, []string) ([]ExternalOrder, error) {
	return f.orders, nil
}

type fakeRepository struct {
	orders map[string]Order
	items  map[string]OrderItem
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		orders: map[string]Order{},
		items:  map[string]OrderItem{},
	}
}

func (r *fakeRepository) UpsertOrders(_ context.Context, orders []Order, items []OrderItem) error {
	for _, order := range orders {
		key := order.ShopID.String() + ":" + order.Channel + ":" + order.ExternalOrderID
		r.orders[key] = order
	}
	for _, item := range items {
		key := item.OrderID + ":" + item.SourceItemKey
		r.items[key] = item
	}
	return nil
}

func TestOrderSyncHandlerIsRetrySafe(t *testing.T) {
	provider := &fakeProvider{
		channel: ChannelShopee,
		orders: []ExternalOrder{{
			ExternalOrderID: "ORDER-123",
			Status:          "READY_TO_SHIP",
			CustomerName:    "customer",
			TotalPrice:      100,
			Currency:        "THB",
			Items: []ExternalOrderItem{{
				SourceKey: "item:1",
				SKU:       "SKU-1",
				Name:      "Item 1",
				Quantity:  1,
				Price:     100,
			}},
		}},
	}
	repository := newFakeRepository()
	handler, err := NewOrderSyncTaskHandler(
		[]OrderProvider{provider},
		repository,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatalf("create handler: %v", err)
	}

	payload, _ := json.Marshal(SyncOrderPayload{
		UserID:   uuid.NewString(),
		ShopID:   uuid.NewString(),
		Channel:  "Shopee",
		TimeFrom: "100",
		TimeTo:   "200",
	})
	task := asynq.NewTask("order:sync", payload)

	if err := handler.Handle(context.Background(), task); err != nil {
		t.Fatalf("first sync failed: %v", err)
	}
	var firstOrderID uuid.UUID
	for _, order := range repository.orders {
		firstOrderID = order.ID
	}

	if err := handler.Handle(context.Background(), task); err != nil {
		t.Fatalf("retry sync failed: %v", err)
	}
	if len(repository.orders) != 1 {
		t.Fatalf("expected one logical order after retry, got %d", len(repository.orders))
	}
	if len(repository.items) != 1 {
		t.Fatalf("expected one logical order item after retry, got %d", len(repository.items))
	}
	for _, order := range repository.orders {
		if order.ID != firstOrderID {
			t.Fatalf("expected stable order id %s, got %s", firstOrderID, order.ID)
		}
	}
}

func TestOrderSyncHandlerRejectsInvalidShopID(t *testing.T) {
	repository := newFakeRepository()
	handler, err := NewOrderSyncTaskHandler(
		[]OrderProvider{&fakeProvider{channel: ChannelShopee}},
		repository,
		slog.New(slog.NewTextHandler(io.Discard, nil)),
	)
	if err != nil {
		t.Fatalf("create handler: %v", err)
	}

	payload, _ := json.Marshal(SyncOrderPayload{
		UserID:  uuid.NewString(),
		ShopID:  "not-a-uuid",
		Channel: "Shopee",
	})

	if err := handler.Handle(context.Background(), asynq.NewTask("order:sync", payload)); err == nil {
		t.Fatal("expected invalid shop id to return an error")
	}
}

func TestBuildOrdersUsesDeterministicIdentifiers(t *testing.T) {
	userID := uuid.New()
	shopID := uuid.New()
	external := []ExternalOrder{{
		ExternalOrderID: "ORDER-123",
		Items:           []ExternalOrderItem{{SourceKey: "item:1"}},
	}}

	first, firstItems, err := BuildOrders(userID, shopID, ChannelShopee, external)
	if err != nil {
		t.Fatalf("build first order: %v", err)
	}
	second, secondItems, err := BuildOrders(userID, shopID, ChannelShopee, external)
	if err != nil {
		t.Fatalf("build second order: %v", err)
	}

	if first[0].ID != second[0].ID {
		t.Fatalf("order id changed across retries: %s != %s", first[0].ID, second[0].ID)
	}
	if firstItems[0].SourceItemKey != secondItems[0].SourceItemKey {
		t.Fatal("source item key changed across retries")
	}
}
