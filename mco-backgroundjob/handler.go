package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/siripat01/order-sync/internal"
)

var ShopeeBaseURL = "https://d14452c0-14dd-48ba-b5c0-fc4efc3147a3.mock.pstmn.io"

func init() {
	if envUrl := os.Getenv("SHOPEE_BASE_URL"); envUrl != "" {
		ShopeeBaseURL = envUrl
	}
}

// ProcessOrdersV1 uses a map for O(1) lookup of items
func ProcessOrdersV1(orders []ShopeeOrder, details []ShopeeOrder, userId, shopId uuid.UUID, channel string) ([]Order, []OrderItem) {
	var ordersToInsert []Order
	var itemsToInsert []OrderItem

	detailMap := make(map[string][]ShopeeOrderItem)
	for _, d := range details {
		detailMap[d.OrderSn] = d.ItemList
	}

	for _, o := range orders {
		newOrderId := uuid.New()
		ordersToInsert = append(ordersToInsert, Order{
			Id:              newOrderId,
			UserId:          userId,
			ShopId:          shopId,
			Channel:         channel,
			ExternalOrderId: o.OrderSn,
			Status:          o.OrderStatus,
			CustomerName:    o.BuyerUsername,
			CustomerAddress: o.RecipientAddress.FullAddress,
			CustomerPhone:   o.RecipientAddress.Phone,
			TotalPrice:      o.TotalAmount,
			Currency:        "THB",
		})

		if items, ok := detailMap[o.OrderSn]; ok {
			for _, item := range items {
				itemsToInsert = append(itemsToInsert, OrderItem{
					OrderId:  newOrderId.String(),
					Sku:      item.ItemSku,
					Name:     item.ItemName,
					Quantity: item.ModelQuantityPurchased,
					Price:    item.ModelOriginalPrice,
				})
			}
		}
	}
	return ordersToInsert, itemsToInsert
}

// ProcessOrdersV2 uses nested loops for lookup (O(N*M)) - slower for demonstration
func ProcessOrdersV2(orders []ShopeeOrder, details []ShopeeOrder, userId, shopId uuid.UUID, channel string) ([]Order, []OrderItem) {
	var ordersToInsert []Order
	var itemsToInsert []OrderItem

	for _, o := range orders {
		newOrderId := uuid.New()
		ordersToInsert = append(ordersToInsert, Order{
			Id:              newOrderId,
			UserId:          userId,
			ShopId:          shopId,
			Channel:         channel,
			ExternalOrderId: o.OrderSn,
			Status:          o.OrderStatus,
			CustomerName:    o.BuyerUsername,
			CustomerAddress: o.RecipientAddress.FullAddress,
			CustomerPhone:   o.RecipientAddress.Phone,
			TotalPrice:      o.TotalAmount,
			Currency:        "THB",
		})

		// Nested loop search - intentionally inefficient for benchmark comparison
		for _, d := range details {
			if d.OrderSn == o.OrderSn {
				for _, item := range d.ItemList {
					itemsToInsert = append(itemsToInsert, OrderItem{
						OrderId:  newOrderId.String(),
						Sku:      item.ItemSku,
						Name:     item.ItemName,
						Quantity: item.ModelQuantityPurchased,
						Price:    item.ModelOriginalPrice,
					})
				}
				break
			}
		}
	}
	return ordersToInsert, itemsToInsert
}

func NewOrderSyncHandler(ctx context.Context, t *asynq.Task) error {
	var p SyncOrderPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return err
	}

	userId, _ := uuid.Parse(p.UserId)
	shopId, _ := uuid.Parse(p.ShopId)

	url := fmt.Sprintf("%s/api/v2/order/get_order_list?shop_id=%s&time_from=%s&time_to=%s&page_size=20",
		ShopeeBaseURL, p.ShopId, p.TimeFrom, p.TimeTo)

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var shopeeResponse ShopeeResponse
	if err := json.NewDecoder(resp.Body).Decode(&shopeeResponse); err != nil {
		return err
	}

	if len(shopeeResponse.Data.OrderList) == 0 {
		return nil
	}

	var orderSns []string
	for _, o := range shopeeResponse.Data.OrderList {
		orderSns = append(orderSns, o.OrderSn)
	}

	detailUrl := fmt.Sprintf("%s/api/v2/order/get_order_detail?shop_id=%s&order_sn_list=%s",
		ShopeeBaseURL, p.ShopId, strings.Join(orderSns, ","))

	detailResp, err := http.Get(detailUrl)
	if err != nil {
		return err
	}
	defer detailResp.Body.Close()

	var orderDetailResponse ShopeeOrderDetail
	if err := json.NewDecoder(detailResp.Body).Decode(&orderDetailResponse); err != nil {
		return err
	}

	ordersToInsert, itemsToInsert := ProcessOrdersV1(shopeeResponse.Data.OrderList, orderDetailResponse.Data.OrderList, userId, shopId, p.Channel)

	supabaseClient := internal.GetSupabaseClient()
	if len(ordersToInsert) > 0 {
		_, _, err = supabaseClient.From("orders").Insert(ordersToInsert, false, "", "", "").Execute()
		if err != nil {
			return err
		}
	}

	if len(itemsToInsert) > 0 {
		_, _, err = supabaseClient.From("order_items").Insert(itemsToInsert, false, "", "", "").Execute()
		if err != nil {
			return err
		}
	}

	return nil
}
