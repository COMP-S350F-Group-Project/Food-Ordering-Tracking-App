import dayjs from "dayjs";
import { dataStore } from "../../infrastructure/data-store";

export class AnalyticsService {
  summary() {
    const byRestaurant = new Map<string, { restaurantId: string; orders: number; revenue: number }>();
    for (const order of dataStore.orders.values()) {
      const agg = byRestaurant.get(order.restaurantId) || {
        restaurantId: order.restaurantId,
        orders: 0,
        revenue: 0,
      };
      agg.orders += 1;
      agg.revenue += order.total;
      byRestaurant.set(order.restaurantId, agg);
    }
    const restaurants = Array.from(byRestaurant.values()).map((r) => {
      const rest = dataStore.restaurants.get(r.restaurantId);
      return { ...r, restaurantName: rest?.name ?? r.restaurantId, city: rest?.city };
    });
    const totals = restaurants.reduce(
      (acc, r) => {
        acc.orders += r.orders;
        acc.revenue += r.revenue;
        return acc;
      },
      { orders: 0, revenue: 0 },
    );
    return {
      totals,
      byRestaurant: restaurants,
      generatedAt: new Date().toISOString(),
    };
  }

  forecastOrders(minutesAhead = 60) {
    // Simple naive forecast: average orders per minute in the past 60 minutes, project forward
    const now = dayjs();
    const past = now.subtract(60, "minute");
    const orders = Array.from(dataStore.orders.values()).filter((o) => dayjs(o.createdAt).isAfter(past));
    const perMinute = orders.length / 60;
    const points: Array<{ ts: string; expectedOrders: number }> = [];
    for (let i = 1; i <= minutesAhead; i++) {
      points.push({ ts: now.add(i, "minute").toISOString(), expectedOrders: perMinute });
    }
    return { horizonMinutes: minutesAhead, perMinute, points };
  }
}

