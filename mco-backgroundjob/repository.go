package main

import (
	"context"
	"fmt"

	"github.com/supabase-community/supabase-go"
)

type OrderRepository interface {
	UpsertOrders(ctx context.Context, orders []Order, items []OrderItem) error
}

type SupabaseOrderRepository struct {
	client *supabase.Client
}

func NewSupabaseOrderRepository(client *supabase.Client) (*SupabaseOrderRepository, error) {
	if client == nil {
		return nil, fmt.Errorf("Supabase client is required")
	}
	return &SupabaseOrderRepository{client: client}, nil
}

// UpsertOrders makes repeated synchronization safe at the row level when the
// database constraints in docs/sql/001_order_sync_idempotency.sql are applied.
//
// Note: PostgREST performs these as separate requests, so order + item writes
// are not yet one database transaction. That limitation is documented and is a
// deliberate next step rather than hidden behind an abstraction.
func (r *SupabaseOrderRepository) UpsertOrders(_ context.Context, orders []Order, items []OrderItem) error {
	if len(orders) > 0 {
		if _, _, err := r.client.From("orders").
			Upsert(orders, "shop_id,channel,external_order_id", "", "").
			Execute(); err != nil {
			return fmt.Errorf("upsert orders: %w", err)
		}
	}

	if len(items) > 0 {
		if _, _, err := r.client.From("order_items").
			Upsert(items, "order_id,source_item_key", "", "").
			Execute(); err != nil {
			return fmt.Errorf("upsert order items: %w", err)
		}
	}

	return nil
}
