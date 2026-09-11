export type KnownOrderStatus = "new" | "packed" | "shipped";
export type OrderFilter = "all" | KnownOrderStatus;

export interface OrderRecord {
  id: string;
  external_order_id: string;
  external_created_at?: string | null;
  customer_name: string;
  total_price: number;
  status: string;
}

export interface OrderListResponse {
  data?: OrderRecord[];
  message?: string;
}

export interface OrderViewModel {
  id: string;
  databaseId: string;
  date: Date;
  customer: string;
  amount: number;
  status: string;
}

export function toOrderViewModel(order: OrderRecord): OrderViewModel {
  return {
    id: order.external_order_id,
    databaseId: order.id,
    date: new Date(order.external_created_at ?? Date.now()),
    customer: order.customer_name,
    amount: order.total_price,
    status: order.status.toLowerCase() || "new",
  };
}
