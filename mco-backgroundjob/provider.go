package main

import "context"

type ListOrdersRequest struct {
	ShopID   string
	TimeFrom string
	TimeTo   string
}

type OrderProvider interface {
	Channel() Channel
	ListOrderIDs(ctx context.Context, request ListOrdersRequest) ([]string, error)
	GetOrders(ctx context.Context, shopID string, externalOrderIDs []string) ([]ExternalOrder, error)
}
