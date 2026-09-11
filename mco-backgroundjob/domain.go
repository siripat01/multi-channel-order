package main

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type Channel string

const (
	ChannelShopee Channel = "shopee"
	ChannelLazada Channel = "lazada"
	ChannelLINE   Channel = "line"
)

func ParseChannel(value string) (Channel, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case string(ChannelShopee):
		return ChannelShopee, nil
	case string(ChannelLazada):
		return ChannelLazada, nil
	case "line shopping", "line_shopping", string(ChannelLINE):
		return ChannelLINE, nil
	default:
		return "", fmt.Errorf("unsupported order channel %q", value)
	}
}

type ExternalOrder struct {
	ExternalOrderID string
	Status          string
	CustomerName    string
	CustomerAddress string
	CustomerPhone   string
	TotalPrice      float64
	Currency        string
	Items           []ExternalOrderItem
}

type ExternalOrderItem struct {
	SourceKey string
	SKU       string
	Name      string
	Quantity  int
	Price     float64
}

type Order struct {
	ID              uuid.UUID `json:"id,omitempty"`
	UserID          uuid.UUID `json:"user_id"`
	ShopID          uuid.UUID `json:"shop_id"`
	Channel         string    `json:"channel"`
	ExternalOrderID string    `json:"external_order_id"`
	Status          string    `json:"status"`
	CustomerName    string    `json:"customer_name"`
	CustomerAddress string    `json:"customer_address"`
	CustomerPhone   string    `json:"customer_phone"`
	TotalPrice      float64   `json:"total_price"`
	Currency        string    `json:"currency"`
}

type OrderItem struct {
	OrderID       string  `json:"order_id"`
	SourceItemKey string  `json:"source_item_key"`
	SKU           string  `json:"sku"`
	Name          string  `json:"name"`
	Quantity      int     `json:"quantity"`
	Price         float64 `json:"price"`
}

func stableOrderID(shopID uuid.UUID, channel Channel, externalOrderID string) uuid.UUID {
	key := fmt.Sprintf("mco/order/%s/%s/%s", shopID.String(), channel, externalOrderID)
	return uuid.NewSHA1(uuid.NameSpaceURL, []byte(key))
}

func BuildOrders(userID, shopID uuid.UUID, channel Channel, external []ExternalOrder) ([]Order, []OrderItem, error) {
	orders := make([]Order, 0, len(external))
	items := make([]OrderItem, 0)

	for _, externalOrder := range external {
		if strings.TrimSpace(externalOrder.ExternalOrderID) == "" {
			return nil, nil, fmt.Errorf("provider returned an order without an external order id")
		}

		orderID := stableOrderID(shopID, channel, externalOrder.ExternalOrderID)
		currency := externalOrder.Currency
		if currency == "" {
			currency = "THB"
		}

		orders = append(orders, Order{
			ID:              orderID,
			UserID:          userID,
			ShopID:          shopID,
			Channel:         string(channel),
			ExternalOrderID: externalOrder.ExternalOrderID,
			Status:          externalOrder.Status,
			CustomerName:    externalOrder.CustomerName,
			CustomerAddress: externalOrder.CustomerAddress,
			CustomerPhone:   externalOrder.CustomerPhone,
			TotalPrice:      externalOrder.TotalPrice,
			Currency:        currency,
		})

		for index, item := range externalOrder.Items {
			sourceKey := strings.TrimSpace(item.SourceKey)
			if sourceKey == "" {
				sourceKey = fmt.Sprintf("position:%d", index)
			}

			items = append(items, OrderItem{
				OrderID:       orderID.String(),
				SourceItemKey: sourceKey,
				SKU:           item.SKU,
				Name:          item.Name,
				Quantity:      item.Quantity,
				Price:         item.Price,
			})
		}
	}

	return orders, items, nil
}
