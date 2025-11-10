export type UserRole = "customer" | "restaurant" | "courier" | "admin";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
  addresses?: Address[] | undefined;
  // Optional: primary city for routing/dispatch demos
  city?: string | undefined;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  lat: number;
  lng: number;
  detail: string;
  city?: string | undefined;
}

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  openHours: string;
  isOpen: boolean;
  city?: string | undefined;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  price: number;
  options?: Record<string, unknown> | undefined;
  stock: number;
}

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

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  qty: number;
  price: number;
  options?: Record<string, unknown> | undefined;
  // Enriched, optional field for client display
  menuName?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  status: OrderStatus;
  total: number;
  payStatus: PayStatus;
  etaMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
  // Optional discount and applied coupon code
  discountAmount?: number | undefined;
  couponCode?: string | undefined;
  // Optional linkage to a group order
  groupOrderId?: string | undefined;
  // Optional explicit delivery address for routing demo
  deliveryAddressId?: string | undefined;
}

export interface Delivery {
  id: string;
  orderId: string;
  courierId: string;
  pickupEta: Date | null;
  dropoffEta: Date | null;
  routePolyline?: string | undefined;
  status: DeliveryStatus;
  lastLocation?: CourierLocation | undefined;
  startedAt?: Date | undefined;
  completedAt?: Date | undefined;
}

export type DeliveryStatus =
  | "ASSIGNED"
  | "EN_ROUTE_PICKUP"
  | "AT_RESTAURANT"
  | "PICKED_UP"
  | "DELIVERING"
  | "DELIVERED"
  | "FAILED";

export interface CourierLocation {
  courierId: string;
  lat: number;
  lng: number;
  recordedAt: Date;
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
  txnId?: string | undefined;
  processedAt?: Date | undefined;
}

export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment?: string | undefined;
}

export interface TrackingUpdate {
  orderId: string;
  courierId: string;
  lat: number;
  lng: number;
  etaMinutes: number;
  status: DeliveryStatus;
  updatedAt: Date;
}

// Promotions: simple coupon model for demo purposes
export type CouponType = "PERCENT" | "AMOUNT";
export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number; // percent 0-100 for PERCENT or currency amount for AMOUNT
  validFrom?: Date | undefined;
  validTo?: Date | undefined;
  usageLimit?: number | undefined;
  usedCount?: number | undefined;
  restaurantId?: string | undefined; // restrict to restaurant if provided
  minOrderAmount?: number | undefined;
  active: boolean;
  createdAt: Date;
}

// Group orders: collaborative ordering session
export type GroupOrderStatus = "OPEN" | "CHECKED_OUT" | "CANCELLED";
export interface GroupOrderParticipant {
  userId: string;
  items: Array<{ menuItemId: string; qty: number; options?: Record<string, unknown> | undefined }>;
}
export interface GroupOrder {
  id: string;
  restaurantId: string;
  hostUserId: string;
  status: GroupOrderStatus;
  participants: GroupOrderParticipant[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date | undefined;
  couponCode?: string | undefined;
}
