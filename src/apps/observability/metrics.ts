type MetricCounters = {
  orders_created: number;
  payments_paid: number;
  payments_failed: number;
  deliveries_started: number;
  dispatch_assignments: number;
  group_orders_created: number;
  group_orders_checked_out: number;
  coupons_redeemed: number;
  ws_connections: number;
};

const counters: MetricCounters = {
  orders_created: 0,
  payments_paid: 0,
  payments_failed: 0,
  deliveries_started: 0,
  dispatch_assignments: 0,
  group_orders_created: 0,
  group_orders_checked_out: 0,
  coupons_redeemed: 0,
  ws_connections: 0,
};

export const metrics = {
  inc<K extends keyof MetricCounters>(key: K, by: number = 1) {
    counters[key] += by;
  },
  snapshot() {
    return { ...counters, timestamp: new Date().toISOString() };
  },
};

