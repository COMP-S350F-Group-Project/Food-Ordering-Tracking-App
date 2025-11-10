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
import { metrics } from "../observability/metrics";

const trackingIntervals = new Map<string, NodeJS.Timeout>();

const CITY_SPEED_KMH: Record<string, number> = {
  HKG: 22, // urban average
  SHA: 25,
  BJ: 20,
  default: 22,
};

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getCitySpeed = (city?: string): number =>
  (CITY_SPEED_KMH[city ?? "default"] ?? CITY_SPEED_KMH.default) as number;

const estimateEtaMinutes = (from: { lat: number; lng: number }, to: { lat: number; lng: number }, city?: string) => {
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const speed: number = getCitySpeed(city); // km/h
  const hours = km / Math.max(speed, 5);
  return Math.max(Math.round(hours * 60), 3);
};

const selectBestCourier = (order: Order): User | undefined => {
  const restaurant = dataStore.restaurants.get(order.restaurantId);
  if (!restaurant) return undefined;
  const couriers = Array.from(dataStore.users.values()).filter((u) => u.role === "courier");
  if (couriers.length === 0) return undefined;
  // Infer dropoff target from customer's first address
  const customer = dataStore.users.get(order.userId);
  const drop = customer?.addresses?.[0];
  // Score couriers by ETA from their last known location to restaurant + to dropoff
  const activeDeliveriesByCourier = new Map<string, number>();
  for (const d of dataStore.deliveries.values()) {
    if (d.status !== "DELIVERED" && d.status !== "FAILED") {
      activeDeliveriesByCourier.set(d.courierId, (activeDeliveriesByCourier.get(d.courierId) ?? 0) + 1);
    }
  }
  let best: { user: User; score: number } | undefined;
  for (const c of couriers) {
    const loc = dataStore.courierLocations.get(c.id) ?? {
      lat: c.addresses?.[0]?.lat ?? restaurant.lat,
      lng: c.addresses?.[0]?.lng ?? restaurant.lng,
    };
    const toPickup = estimateEtaMinutes(loc, { lat: restaurant.lat, lng: restaurant.lng }, restaurant.city);
    const toDrop = drop
      ? estimateEtaMinutes({ lat: restaurant.lat, lng: restaurant.lng }, { lat: drop.lat, lng: drop.lng }, drop.city)
      : 10;
    const loadPenalty = (activeDeliveriesByCourier.get(c.id) ?? 0) * 5; // 5 min per active delivery
    const score = toPickup + toDrop + loadPenalty;
    if (!best || score < best.score) {
      best = { user: c, score };
    }
  }
  return best?.user;
};

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

    const courier = selectBestCourier(order);
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
    metrics.inc("dispatch_assignments");

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
    metrics.inc("deliveries_started");

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
