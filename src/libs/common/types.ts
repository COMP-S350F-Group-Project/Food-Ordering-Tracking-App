export type UserRole = "customer" | "restaurant" | "courier" | "admin";

export interface User {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
  email: string;
  createdAt: Date;
  addresses?: Address[] | undefined;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  lat: number;
  lng: number;
  detail: string;
}

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number;
  openHours: string;
  isOpen: boolean;
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
  channel: "credit_card" | "apple_pay" | "google_pay";
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
