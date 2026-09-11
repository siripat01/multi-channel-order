package main

type SyncOrderPayload struct {
	UserID   string `json:"user_id"`
	Channel  string `json:"channel"`
	ShopID   string `json:"shop_id"`
	TimeFrom string `json:"time_from"`
	TimeTo   string `json:"time_to"`
}
