package main

import (
	"github.com/google/uuid"
)

type SyncOrderPayload struct {
	UserId   string `json:"user_id"`
	Channel  string `json:"channel"`
	ShopId   string `json:"shop_id"`
	TimeFrom string `json:"time_from"`
	TimeTo   string `json:"time_to"`
}

type ShopeeResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    struct {
		OrderList  []ShopeeOrder `json:"order_list"`
		More       bool          `json:"more"`
		NextCursor string        `json:"next_cursor"`
	} `json:"data"`
	RequestId string `json:"request_id"`
}

type ShopeeOrder struct {
	OrderSn          string            `json:"order_sn"`
	OrderStatus      string            `json:"order_status"`
	CreateTime       int64             `json:"create_time"`
	UpdateTime       int64             `json:"update_time"`
	BuyerUsername    string            `json:"buyer_username"`
	RecipientAddress ShopeeAddress     `json:"recipient_address"`
	ItemList         []ShopeeOrderItem `json:"item_list"`
	PaymentMethod    string            `json:"payment_method"`
	TotalAmount      float64           `json:"total_amount"`
	ShippingCarrier  string            `json:"shipping_carrier"`
	TrackingNumber   string            `json:"tracking_number"`
}

type ShopeeAddress struct {
	Name        string `json:"name"`
	Phone       string `json:"phone"`
	FullAddress string `json:"full_address"`
	District    string `json:"district"`
	City        string `json:"city"`
	Zipcode     string `json:"zipcode"`
}

type ShopeeOrderItem struct {
	ItemId                 int64   `json:"item_id"`
	ItemName               string  `json:"item_name"`
	ItemSku                string  `json:"item_sku"`
	ModelName              string  `json:"model_name"`
	ModelQuantityPurchased int     `json:"model_quantity_purchased"`
	ModelOriginalPrice     float64 `json:"model_original_price"`
	ModelDiscountedPrice   float64 `json:"model_discounted_price"`
}

type ShopeeOrderDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Data    struct {
		OrderList []ShopeeOrder `json:"order_list"`
	} `json:"data"`
	RequestId string `json:"request_id"`
}

type Order struct {
	Id              uuid.UUID `json:"id,omitempty"`
	UserId          uuid.UUID `json:"user_id"`
	ShopId          uuid.UUID `json:"shop_id"`
	Channel         string    `json:"channel"`
	ExternalOrderId string    `json:"external_order_id"`
	Status          string    `json:"status"`
	CustomerName    string    `json:"customer_name"`
	CustomerAddress string    `json:"customer_address"`
	CustomerPhone   string    `json:"customer_phone"`
	TotalPrice      float64   `json:"total_price"`
	Currency        string    `json:"currency"`
}

type OrderItem struct {
	OrderId  string  `json:"order_id"`
	Sku      string  `json:"sku"`
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
}

type ShopeeItem struct {
	ItemId                 int64  `json:"item_id"`
	ItemName               string `json:"item_name"`
	ItemSku                string `json:"item_sku"`
	ModelName              string `json:"model_name"`
	ModelQuantityPurchased int    `json:"model_quantity_purchased"`
	// ใช้ float64 เพื่อป้องกัน error "cannot unmarshal number into string"
	// ที่คุณเจอใน Test ก่อนหน้านี้ครับ
	ModelOriginalPrice   float64 `json:"model_original_price"`
	ModelDiscountedPrice float64 `json:"model_discounted_price"`
}
