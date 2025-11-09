import type { OrderStatus, PayStatus } from "../types";

const statusColours: Record<OrderStatus, string> = {
  CREATED: "badge info",
  CONFIRMED: "badge info",
  PREPARING: "badge warning",
  PICKED_UP: "badge warning",
  DELIVERING: "badge primary",
  DELIVERED: "badge success",
  COMPLETED: "badge success",
  CANCELLED: "badge neutral",
  REFUNDED: "badge neutral",
  FAILED: "badge danger",
};

const statusLabels: Record<OrderStatus, string> = {
  CREATED: "Created",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  PICKED_UP: "Picked up",
  DELIVERING: "Delivering",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

const payColours: Record<PayStatus, string> = {
  PENDING: "badge warning",
  PAID: "badge success",
  FAILED: "badge danger",
  REFUNDED: "badge neutral",
};

const payLabels: Record<PayStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={statusColours[status]}>{statusLabels[status]}</span>;
}

export function PayStatusBadge({ status }: { status: PayStatus }) {
  return <span className={payColours[status]}>{payLabels[status]}</span>;
}
