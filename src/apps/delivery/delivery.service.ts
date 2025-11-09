import dayjs from "dayjs";
import { randomUUID } from "node:crypto";
import {
  dataStore,
  findDeliveryByOrderId,
  updateDeliveryStatus,
  updateOrderStatus,
} from "../../infrastructure/data-store";
import { NotFoundError } from "../../libs/common/errors";
import {
  CourierLocation,
  Delivery,
  DeliveryStatus,
  Order,
  TrackingUpdate,
  User,
} from "../../libs/common/types";
import { trackingGateway } from "../tracking/tracking.gateway";
import { logger } from "../../libs/common/logger";

const trackingIntervals = new Map<string, NodeJS.Timeout>();

const getAvailableCourier = (): User | undefined =>
  Array.from(dataStore.users.values()).find((user) => user.role === "courier");

export interface ManualLocationUpdateInput {
  courierId: string;
  lat: number;
  lng: number;
}

export class DeliveryService {
  ensureDelivery(orderId: string): Delivery {
    const order = dataStore.orders.get(orderId);
    if (!order) {
      throw new NotFoundError("Order", { orderId });
    }

    const existing = findDeliveryByOrderId(orderId);
    if (existing) {
      return existing;
    }

    const courier = getAvailableCourier();
    if (!courier) {
      throw new NotFoundError("Courier", {});
    }

    const delivery: Delivery = {
      id: randomUUID(),
      orderId,
      courierId: courier.id,
      pickupEta: dayjs().add(5, "minute").toDate(),
      dropoffEta: dayjs().add(20, "minute").toDate(),
      status: "ASSIGNED",
    };

    dataStore.deliveries.set(delivery.id, delivery);
    updateOrderStatus(orderId, "CONFIRMED");

    const location: CourierLocation = {
      courierId: courier.id,
      lat: courier.addresses?.[0]?.lat ?? 22.3,
      lng: courier.addresses?.[0]?.lng ?? 114.16,
      recordedAt: new Date(),
    };
    dataStore.courierLocations.set(courier.id, location);
    return delivery;
  }

  startTracking(orderId: string) {
    const order = dataStore.orders.get(orderId);
    if (!order) {
      throw new NotFoundError("Order", { orderId });
    }
    const delivery = findDeliveryByOrderId(orderId);
    if (!delivery) {
      throw new NotFoundError("Delivery", { orderId });
    }

    updateDeliveryStatus(orderId, "DELIVERING");
    updateOrderStatus(orderId, "DELIVERING");

    this.emitTrackingUpdate(this.getDelivery(orderId), order);

    if (trackingIntervals.has(orderId)) {
      return;
    }

    const steps = [
      { lat: 22.29, lng: 114.16 },
      { lat: 22.295, lng: 114.162 },
      { lat: 22.3, lng: 114.163 },
      { lat: 22.304, lng: 114.165 },
      { lat: 22.308, lng: 114.166 },
    ];
    let index = 0;

    const interval = setInterval(() => {
      index += 1;
      if (index >= steps.length) {
        clearInterval(interval);
        trackingIntervals.delete(orderId);
        updateDeliveryStatus(orderId, "DELIVERED");
        updateOrderStatus(orderId, "DELIVERED");
        this.emitTrackingUpdate(delivery, order, 0);
        return;
      }
      const coords = steps[index];
      if (!coords) {
        return;
      }
      this.recordLocation({
        courierId: delivery.courierId,
        lat: coords.lat,
        lng: coords.lng,
      });
      const remaining = steps.length - index;
      this.emitTrackingUpdate(this.getDelivery(orderId), order, remaining * 2);
    }, 2000);

    trackingIntervals.set(orderId, interval);
  }

  finishDelivery(orderId: string) {
    const interval = trackingIntervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      trackingIntervals.delete(orderId);
    }
    updateDeliveryStatus(orderId, "DELIVERED");
    updateOrderStatus(orderId, "DELIVERED");
  }

  recordLocation(input: ManualLocationUpdateInput) {
    const location: CourierLocation = {
      courierId: input.courierId,
      lat: input.lat,
      lng: input.lng,
      recordedAt: new Date(),
    };
    dataStore.courierLocations.set(input.courierId, location);
  }

  getDelivery(orderId: string): Delivery {
    const delivery = findDeliveryByOrderId(orderId);
    if (!delivery) {
      throw new NotFoundError("Delivery", { orderId });
    }
    return delivery;
  }

  private emitTrackingUpdate(delivery: Delivery, order: Order, eta?: number) {
    const location = dataStore.courierLocations.get(delivery.courierId);
    if (!location) {
      logger.warn("Courier location missing", { courierId: delivery.courierId });
      return;
    }
    const update: TrackingUpdate = {
      orderId: order.id,
      courierId: delivery.courierId,
      lat: location.lat,
      lng: location.lng,
      status: delivery.status,
      etaMinutes: eta ?? Math.max(order.etaMinutes ?? 10, 1),
      updatedAt: new Date(),
    };
    trackingGateway.emitUpdate(update);
  }
}
