package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestShopeeProviderNormalizesOrders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/v2/order/get_order_list":
			if r.URL.Query().Get("shop_id") != "shop-1" {
				http.Error(w, "wrong shop", http.StatusBadRequest)
				return
			}
			fmt.Fprint(w, `{"data":{"order_list":[{"order_sn":"ORDER-1"}]}}`)
		case "/api/v2/order/get_order_detail":
			fmt.Fprint(w, `{"data":{"order_list":[{"order_sn":"ORDER-1","order_status":"READY_TO_SHIP","buyer_username":"alice","recipient_address":{"full_address":"Bangkok","phone":"0800000000"},"total_amount":150.5,"item_list":[{"item_id":42,"item_name":"Keyboard","item_sku":"KB-1","model_name":"Black","model_quantity_purchased":1,"model_original_price":150.5}]}]}}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	provider, err := NewShopeeProvider(server.URL, &http.Client{Timeout: time.Second})
	if err != nil {
		t.Fatalf("create provider: %v", err)
	}

	ids, err := provider.ListOrderIDs(context.Background(), ListOrdersRequest{
		ShopID:   "shop-1",
		TimeFrom: "100",
		TimeTo:   "200",
	})
	if err != nil {
		t.Fatalf("list order ids: %v", err)
	}
	if len(ids) != 1 || ids[0] != "ORDER-1" {
		t.Fatalf("unexpected order ids: %#v", ids)
	}

	orders, err := provider.GetOrders(context.Background(), "shop-1", ids)
	if err != nil {
		t.Fatalf("get orders: %v", err)
	}
	if len(orders) != 1 {
		t.Fatalf("expected one order, got %d", len(orders))
	}
	if orders[0].ExternalOrderID != "ORDER-1" || orders[0].CustomerName != "alice" {
		t.Fatalf("unexpected normalized order: %#v", orders[0])
	}
	if len(orders[0].Items) != 1 || orders[0].Items[0].SourceKey == "" {
		t.Fatalf("expected stable source item key, got %#v", orders[0].Items)
	}
}

func TestShopeeProviderRejectsNon2xxResponses(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "provider unavailable", http.StatusBadGateway)
	}))
	defer server.Close()

	provider, err := NewShopeeProvider(server.URL, &http.Client{Timeout: time.Second})
	if err != nil {
		t.Fatalf("create provider: %v", err)
	}

	_, err = provider.ListOrderIDs(context.Background(), ListOrdersRequest{ShopID: "shop-1"})
	if err == nil {
		t.Fatal("expected non-2xx provider response to return an error")
	}
}
