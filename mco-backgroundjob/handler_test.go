package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/siripat01/order-sync/internal"
)

// To test the handler in isolation without hitting the real Shopee API,
// we can use httptest to mock the server.
// Note: In production, the URL is hardcoded. For testing, we might want to
// make it configurable. But we can also use a custom http.Client or
// global transport override if needed.

func TestNewOrderSyncHandler(t *testing.T) {
	internal.InitializeSupabaseClient()
	// 1. Setup a mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify query parameters
		if r.URL.Query().Get("shop_id") != "ad27896f-444f-4d7e-b737-0f78c0ba75b5" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		fmt.Fprintln(w, `{"data": {"order_list": []}}`)
	}))
	defer server.Close()

	// 2. Prepare the payload
	payload := SyncOrderPayload{
		UserId:   "e4f82e53-d3fc-408f-b1c0-bac74d832847",
		Channel:  "Shopee",
		ShopId:   "ad27896f-444f-4d7e-b737-0f78c0ba75b5",
		TimeFrom: "12345678",
		TimeTo:   "87654321",
	}
	payloadBytes, _ := json.Marshal(payload)

	// 3. Create a mock task
	task := asynq.NewTask("order:sync", payloadBytes)

	// 4. Override the URL using t.Setenv for the test
	t.Setenv("SHOPEE_BASE_URL", server.URL)

	ctx := context.Background()

	// 5. Execute the handler
	err := NewOrderSyncHandler(ctx, task)

	if err != nil {
		t.Fatalf("Handler failed: %v", err)
	}
}

func BenchmarkProcessOrdersV1(b *testing.B) {
	orders, details, userId, shopId := setupBenchmarkData(100)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ProcessOrdersV1(orders, details, userId, shopId, "Shopee")
	}
}

func BenchmarkProcessOrdersV2(b *testing.B) {
	orders, details, userId, shopId := setupBenchmarkData(100)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ProcessOrdersV2(orders, details, userId, shopId, "Shopee")
	}
}

func setupBenchmarkData(n int) ([]ShopeeOrder, []ShopeeOrder, uuid.UUID, uuid.UUID) {
	userId := uuid.New()
	shopId := uuid.New()
	orders := make([]ShopeeOrder, n)
	details := make([]ShopeeOrder, n)

	for i := 0; i < n; i++ {
		sn := fmt.Sprintf("SN-%d", i)
		orders[i] = ShopeeOrder{OrderSn: sn, BuyerUsername: "user"}
		details[i] = ShopeeOrder{
			OrderSn: sn,
			ItemList: []ShopeeOrderItem{
				{ItemName: "Item 1", ItemSku: "SKU-1", ModelQuantityPurchased: 1, ModelOriginalPrice: 100},
			},
		}
	}
	return orders, details, userId, shopId
}
