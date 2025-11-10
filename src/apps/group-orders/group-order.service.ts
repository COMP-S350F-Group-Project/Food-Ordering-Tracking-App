import { randomUUID } from "node:crypto";
import { dataStore } from "../../infrastructure/data-store";
import { GroupOrder, GroupOrderParticipant } from "../../libs/common/types";
import { NotFoundError, ValidationError } from "../../libs/common/errors";
import { CatalogService } from "../catalog/catalog.service";
import { OrderService } from "../orders/order.service";
import { metrics } from "../observability/metrics";

export class GroupOrderService {
  constructor(
    private readonly catalog = new CatalogService(),
    private readonly orders = new OrderService(),
  ) {}

  list(): GroupOrder[] {
    return Array.from(dataStore.groupOrders.values());
  }

  create(hostUserId: string, restaurantId: string, expiresAt?: Date): GroupOrder {
    const id = randomUUID();
    const now = new Date();
    const group: GroupOrder = {
      id,
      restaurantId,
      hostUserId,
      status: "OPEN",
      participants: [],
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };
    dataStore.groupOrders.set(id, group);
    metrics.inc("group_orders_created");
    return group;
  }

  get(id: string): GroupOrder {
    const group = dataStore.groupOrders.get(id);
    if (!group) throw new NotFoundError("GroupOrder", { id });
    return group;
  }

  addItems(groupOrderId: string, userId: string, items: GroupOrderParticipant["items"]): GroupOrder {
    const group = this.get(groupOrderId);
    if (group.status !== "OPEN") throw new ValidationError("Group order is not open");
    const restaurant = dataStore.restaurants.get(group.restaurantId);
    if (!restaurant) throw new NotFoundError("Restaurant", { id: group.restaurantId });
    for (const it of items) {
      const menu = this.catalog.getMenuItem(it.menuItemId);
      if (menu.restaurantId !== group.restaurantId) {
        throw new ValidationError("Menu item not in group restaurant", { menuItemId: it.menuItemId });
      }
    }
    const existing = group.participants.find((p) => p.userId === userId);
    if (existing) {
      existing.items.push(...items);
    } else {
      group.participants.push({ userId, items: [...items] });
    }
    group.updatedAt = new Date();
    dataStore.groupOrders.set(group.id, group);
    return group;
  }

  checkout(groupOrderId: string, paymentChannel: Parameters<OrderService["createOrder"]>[0]["paymentChannel"], couponCode?: string) {
    const group = this.get(groupOrderId);
    if (group.status !== "OPEN") throw new ValidationError("Group order already checked out");
    if (group.participants.length === 0) throw new ValidationError("Group order has no participants");
    // Combine items; charge the host for demo purposes
    const items = group.participants.flatMap((p) => p.items);
    const order = this.orders.createOrder({
      userId: group.hostUserId,
      restaurantId: group.restaurantId,
      paymentChannel,
      items,
      couponCode,
      groupOrderId,
    } as any);
    group.status = "CHECKED_OUT";
    group.updatedAt = new Date();
    dataStore.groupOrders.set(group.id, group);
    metrics.inc("group_orders_checked_out");
    return order;
  }
}
