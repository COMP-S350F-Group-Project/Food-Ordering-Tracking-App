import { randomUUID } from "node:crypto";
import dayjs from "dayjs";
import { dataStore, updateOrderStatus } from "../../infrastructure/data-store";
import { CatalogService } from "../catalog/catalog.service";
import { PaymentService } from "../payment/payment.service";
import { DeliveryService } from "../delivery/delivery.service";
import { AppError, NotFoundError, ValidationError } from "../../libs/common/errors";
import {
  Order,
  OrderItem,
  OrderStatus,
  PayStatus,
} from "../../libs/common/types";

export interface CreateOrderItemInput {
  menuItemId: string;
  qty: number;
  options?: Record<string, unknown> | undefined;
}

export interface CreateOrderInput {
  userId: string;
  restaurantId: string;
  items: CreateOrderItemInput[];
  paymentChannel: "credit_card" | "apple_pay" | "google_pay";
}

const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["DELIVERING", "CANCELLED"],
  DELIVERING: ["DELIVERED", "FAILED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: [],
};

const PAYMENT_STATUS_FLOW: Record<PayStatus, PayStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

export class OrderService {
  constructor(
    private readonly catalogService = new CatalogService(),
    private readonly paymentService = new PaymentService(),
    private readonly deliveryService = new DeliveryService(),
  ) {}

  listOrders(): Order[] {
    return Array.from(dataStore.orders.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  getOrder(id: string): Order {
    const order = dataStore.orders.get(id);
    if (!order) {
      throw new NotFoundError("Order", { id });
    }
    return order;
  }

  createOrder(input: CreateOrderInput): Order {
    if (input.items.length === 0) {
      throw new ValidationError("Order requires at least one item");
    }

    const user = dataStore.users.get(input.userId);
    if (!user || user.role !== "customer") {
      throw new ValidationError("Invalid customer");
    }

    const restaurant = dataStore.restaurants.get(input.restaurantId);
    if (!restaurant || !restaurant.isOpen) {
      throw new ValidationError("Restaurant not available");
    }

    const orderId = randomUUID();
    const orderItems: OrderItem[] = input.items.map((item) => {
      if (item.qty <= 0) {
        throw new ValidationError("Quantity must be greater than zero", { menuItemId: item.menuItemId });
      }
      const menu = this.catalogService.getMenuItem(item.menuItemId);
      if (menu.restaurantId !== input.restaurantId) {
        throw new ValidationError("Menu item does not belong to restaurant", { menuItemId: menu.id });
      }
      if (menu.stock < item.qty) {
        throw new ValidationError("Insufficient stock", { menuItemId: menu.id, available: menu.stock });
      }
      this.catalogService.updateStock({ menuItemId: menu.id, delta: -item.qty });
      const baseItem: OrderItem = {
        id: randomUUID(),
        orderId,
        menuItemId: menu.id,
        qty: item.qty,
        price: menu.price,
      };
      return item.options ? { ...baseItem, options: item.options } : baseItem;
    });

    const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
    const order: Order = {
      id: orderId,
      userId: input.userId,
      restaurantId: input.restaurantId,
      status: "CREATED",
      payStatus: "PENDING",
      total,
      etaMinutes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: orderItems,
    };

    dataStore.orders.set(orderId, order);
    this.paymentService.initializePayment({
      orderId,
      channel: input.paymentChannel,
      amount: total,
    });
    return order;
  }

  transitionOrder(orderId: string, nextStatus: OrderStatus): Order {
    const order = this.getOrder(orderId);
    const allowed = ORDER_STATUS_FLOW[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(`Invalid transition ${order.status} -> ${nextStatus}`, 409);
    }
    order.status = nextStatus;
    order.updatedAt = new Date();

    if (nextStatus === "DELIVERING") {
      const eta = dayjs().add(20, "minute");
      order.etaMinutes = eta.diff(dayjs(), "minute");
      this.deliveryService.ensureDelivery(orderId);
      this.deliveryService.startTracking(orderId);
    }

    if (nextStatus === "DELIVERED") {
      order.etaMinutes = 0;
      this.deliveryService.finishDelivery(orderId);
    }

    if (nextStatus === "CANCELLED" || nextStatus === "REFUNDED") {
      order.items.forEach((item) => {
        this.catalogService.updateStock({ menuItemId: item.menuItemId, delta: item.qty });
      });
    }

    dataStore.orders.set(orderId, order);
    return order;
  }

  transitionPayment(orderId: string, nextStatus: PayStatus): Order {
    const order = this.getOrder(orderId);
    const allowed = PAYMENT_STATUS_FLOW[order.payStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(`Invalid payment state transition ${order.payStatus} -> ${nextStatus}`, 409);
    }
    order.payStatus = nextStatus;
    if (nextStatus === "PAID" && order.status === "CREATED") {
      order.status = "CONFIRMED";
      order.updatedAt = new Date();
      this.deliveryService.ensureDelivery(order.id);
    }
    dataStore.orders.set(order.id, order);
    this.paymentService.updateStatus(orderId, nextStatus);
    return order;
  }
}
