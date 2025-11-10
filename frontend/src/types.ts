export type OrderStatus =
  | "CREATED"
  | "CONFIRMED"
  | "PREPARING"
  | "PICKED_UP"
  | "DELIVERING"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED"
  | "FAILED";

export type PayStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface User {
  id: string;
  role: "customer" | "restaurant" | "courier" | "admin";
  name: string;
  phone: string;
  email: string;
}

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  openHours: string;
  isOpen: boolean;
  city?: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  stock: number;
  options?: Record<string, unknown>;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  qty: number;
  price: number;
  options?: Record<string, unknown>;
  // Optional, populated by backend for readability
  menuName?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: OrderStatus;
  payStatus: PayStatus;
  total: number;
  discountAmount?: number;
  couponCode?: string;
  groupOrderId?: string;
  etaMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  delivery?: Delivery;
  payment?: Payment;
}

export interface Payment {
  id: string;
  orderId: string;
  channel:
    | "credit_card"
    | "apple_pay"
    | "google_pay"
    | "paypal"
    | "cash_on_delivery"
    | "wechat_pay";
  amount: number;
  status: PayStatus;
  txnId?: string;
  processedAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "AMOUNT";
  value: number;
  active: boolean;
  createdAt: string;
  usageLimit?: number;
  usedCount?: number;
  restaurantId?: string;
  minOrderAmount?: number;
}

export interface MetricsSnapshot {
  orders_created: number;
  payments_paid: number;
  payments_failed: number;
  deliveries_started: number;
  dispatch_assignments: number;
  group_orders_created: number;
  group_orders_checked_out: number;
  coupons_redeemed: number;
  ws_connections: number;
  timestamp: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  courierId: string;
  pickupEta: string | null;
  dropoffEta: string | null;
  status: DeliveryStatus;
  routePolyline?: string;
  startedAt?: string;
  completedAt?: string;
}

export type DeliveryStatus =
  | "ASSIGNED"
  | "EN_ROUTE_PICKUP"
  | "AT_RESTAURANT"
  | "PICKED_UP"
  | "DELIVERING"
  | "DELIVERED"
  | "FAILED";

export interface TrackingUpdate {
  orderId: string;
  courierId: string;
  lat: number;
  lng: number;
  status: DeliveryStatus;
  etaMinutes: number;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
