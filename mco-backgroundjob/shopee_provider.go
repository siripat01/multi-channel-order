package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type ShopeeProvider struct {
	baseURL string
	client  *http.Client
}

func NewShopeeProvider(baseURL string, client *http.Client) (*ShopeeProvider, error) {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		return nil, fmt.Errorf("Shopee base URL is required")
	}
	if client == nil {
		return nil, fmt.Errorf("HTTP client is required")
	}
	return &ShopeeProvider{baseURL: baseURL, client: client}, nil
}

func (p *ShopeeProvider) Channel() Channel { return ChannelShopee }

func (p *ShopeeProvider) ListOrderIDs(ctx context.Context, request ListOrdersRequest) ([]string, error) {
	endpoint, err := url.Parse(p.baseURL + "/api/v2/order/get_order_list")
	if err != nil {
		return nil, fmt.Errorf("build Shopee order-list URL: %w", err)
	}

	query := endpoint.Query()
	query.Set("shop_id", request.ShopID)
	query.Set("time_from", request.TimeFrom)
	query.Set("time_to", request.TimeTo)
	query.Set("page_size", "20")
	endpoint.RawQuery = query.Encode()

	var response shopeeListOrdersResponse
	if err := p.getJSON(ctx, endpoint.String(), &response); err != nil {
		return nil, fmt.Errorf("fetch Shopee order list: %w", err)
	}

	orderIDs := make([]string, 0, len(response.Data.OrderList))
	for _, order := range response.Data.OrderList {
		if order.OrderSN != "" {
			orderIDs = append(orderIDs, order.OrderSN)
		}
	}
	return orderIDs, nil
}

func (p *ShopeeProvider) GetOrders(ctx context.Context, shopID string, externalOrderIDs []string) ([]ExternalOrder, error) {
	if len(externalOrderIDs) == 0 {
		return nil, nil
	}

	endpoint, err := url.Parse(p.baseURL + "/api/v2/order/get_order_detail")
	if err != nil {
		return nil, fmt.Errorf("build Shopee order-detail URL: %w", err)
	}

	query := endpoint.Query()
	query.Set("shop_id", shopID)
	query.Set("order_sn_list", strings.Join(externalOrderIDs, ","))
	endpoint.RawQuery = query.Encode()

	var response shopeeOrderDetailResponse
	if err := p.getJSON(ctx, endpoint.String(), &response); err != nil {
		return nil, fmt.Errorf("fetch Shopee order details: %w", err)
	}

	orders := make([]ExternalOrder, 0, len(response.Data.OrderList))
	for _, order := range response.Data.OrderList {
		items := make([]ExternalOrderItem, 0, len(order.ItemList))
		for index, item := range order.ItemList {
			sourceKey := fmt.Sprintf("item:%d:model:%s:position:%d", item.ItemID, item.ModelName, index)
			items = append(items, ExternalOrderItem{
				SourceKey: sourceKey,
				SKU:       item.ItemSKU,
				Name:      item.ItemName,
				Quantity:  item.ModelQuantityPurchased,
				Price:     item.ModelOriginalPrice,
			})
		}

		orders = append(orders, ExternalOrder{
			ExternalOrderID: order.OrderSN,
			Status:          order.OrderStatus,
			CustomerName:    order.BuyerUsername,
			CustomerAddress: order.RecipientAddress.FullAddress,
			CustomerPhone:   order.RecipientAddress.Phone,
			TotalPrice:      order.TotalAmount,
			Currency:        "THB",
			Items:           items,
		})
	}

	return orders, nil
}

func (p *ShopeeProvider) getJSON(ctx context.Context, requestURL string, target any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return fmt.Errorf("provider returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}
	return nil
}

type shopeeListOrdersResponse struct {
	Data struct {
		OrderList []struct {
			OrderSN string `json:"order_sn"`
		} `json:"order_list"`
	} `json:"data"`
}

type shopeeOrderDetailResponse struct {
	Data struct {
		OrderList []shopeeOrder `json:"order_list"`
	} `json:"data"`
}

type shopeeOrder struct {
	OrderSN          string            `json:"order_sn"`
	OrderStatus      string            `json:"order_status"`
	BuyerUsername    string            `json:"buyer_username"`
	RecipientAddress shopeeAddress     `json:"recipient_address"`
	ItemList         []shopeeOrderItem `json:"item_list"`
	TotalAmount      float64           `json:"total_amount"`
}

type shopeeAddress struct {
	Phone       string `json:"phone"`
	FullAddress string `json:"full_address"`
}

type shopeeOrderItem struct {
	ItemID                 int64   `json:"item_id"`
	ItemName               string  `json:"item_name"`
	ItemSKU                string  `json:"item_sku"`
	ModelName              string  `json:"model_name"`
	ModelQuantityPurchased int     `json:"model_quantity_purchased"`
	ModelOriginalPrice     float64 `json:"model_original_price"`
}
