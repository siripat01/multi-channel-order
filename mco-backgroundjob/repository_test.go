package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestSupabaseOrderRepositoryUsesSingleAtomicRPC(t *testing.T) {
	var calls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != http.MethodPost {
			t.Fatalf("method = %s, want POST", r.Method)
		}
		if r.URL.Path != "/rest/v1/rpc/persist_synced_orders" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer test-key" {
			t.Fatalf("authorization = %q", got)
		}
		if got := r.Header.Get("apikey"); got != "test-key" {
			t.Fatalf("apikey = %q", got)
		}

		var payload struct {
			Orders []Order     `json:"p_orders"`
			Items  []OrderItem `json:"p_items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		if len(payload.Orders) != 1 || len(payload.Items) != 1 {
			t.Fatalf("unexpected payload sizes: orders=%d items=%d", len(payload.Orders), len(payload.Items))
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	repository, err := NewSupabaseOrderRepository(server.URL, "test-key", &http.Client{Timeout: time.Second})
	if err != nil {
		t.Fatalf("create repository: %v", err)
	}

	orderID := uuid.New()
	err = repository.UpsertOrders(context.Background(), []Order{{
		ID:              orderID,
		UserID:          uuid.New(),
		ShopID:          uuid.New(),
		Channel:         "Shopee",
		ExternalOrderID: "ORDER-1",
		Status:          "READY_TO_SHIP",
		TotalPrice:      100,
		Currency:        "THB",
	}}, []OrderItem{{
		OrderID:       orderID.String(),
		SourceItemKey: "item:1",
		SKU:           "SKU-1",
		Name:          "Item",
		Quantity:      1,
		Price:         100,
	}})
	if err != nil {
		t.Fatalf("persist batch: %v", err)
	}
	if calls != 1 {
		t.Fatalf("RPC calls = %d, want 1", calls)
	}
}

func TestSupabaseOrderRepositoryReturnsRPCError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, `{"message":"transaction failed"}`, http.StatusBadRequest)
	}))
	defer server.Close()

	repository, err := NewSupabaseOrderRepository(server.URL, "test-key", server.Client())
	if err != nil {
		t.Fatalf("create repository: %v", err)
	}

	err = repository.UpsertOrders(context.Background(), []Order{{ID: uuid.New()}}, nil)
	if err == nil {
		t.Fatal("expected RPC error")
	}
	if !strings.Contains(err.Error(), "HTTP 400") || !strings.Contains(err.Error(), "transaction failed") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSupabaseOrderRepositoryPropagatesContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-r.Context().Done()
	}))
	defer server.Close()

	repository, err := NewSupabaseOrderRepository(server.URL, "test-key", server.Client())
	if err != nil {
		t.Fatalf("create repository: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err = repository.UpsertOrders(ctx, []Order{{ID: uuid.New()}}, nil)
	if err == nil {
		t.Fatal("expected context cancellation error")
	}
}
