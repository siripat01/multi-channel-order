package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type OrderRepository interface {
	UpsertOrders(ctx context.Context, orders []Order, items []OrderItem) error
}

type SupabaseOrderRepository struct {
	endpoint string
	apiKey   string
	client   *http.Client
}

func NewSupabaseOrderRepository(baseURL, apiKey string, client *http.Client) (*SupabaseOrderRepository, error) {
	baseURL = strings.TrimSpace(baseURL)
	apiKey = strings.TrimSpace(apiKey)
	if baseURL == "" {
		return nil, fmt.Errorf("Supabase URL is required")
	}
	if apiKey == "" {
		return nil, fmt.Errorf("Supabase server-side key is required")
	}
	if client == nil {
		return nil, fmt.Errorf("HTTP client is required")
	}

	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, fmt.Errorf("invalid Supabase URL %q", baseURL)
	}

	return &SupabaseOrderRepository{
		endpoint: strings.TrimRight(baseURL, "/") + "/rest/v1/rpc/persist_synced_orders",
		apiKey:   apiKey,
		client:   client,
	}, nil
}

// UpsertOrders persists one synchronization batch through a PostgreSQL RPC.
// The function defined in docs/sql/002_atomic_order_sync.sql upserts orders and
// items inside one database transaction, so a failed item write rolls the whole
// batch back instead of leaving a partially persisted order.
func (r *SupabaseOrderRepository) UpsertOrders(ctx context.Context, orders []Order, items []OrderItem) error {
	if len(orders) == 0 && len(items) == 0 {
		return nil
	}

	payload := struct {
		Orders []Order     `json:"p_orders"`
		Items  []OrderItem `json:"p_items"`
	}{
		Orders: orders,
		Items:  items,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode order persistence payload: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, r.endpoint, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create order persistence request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+r.apiKey)
	req.Header.Set("apikey", r.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("persist order batch: %w", err)
	}
	defer resp.Body.Close()

	responseBody, readErr := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if readErr != nil {
		return fmt.Errorf("read order persistence response: %w", readErr)
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		message := strings.TrimSpace(string(responseBody))
		if message == "" {
			message = http.StatusText(resp.StatusCode)
		}
		return fmt.Errorf("persist order batch: HTTP %d: %s", resp.StatusCode, message)
	}

	return nil
}
