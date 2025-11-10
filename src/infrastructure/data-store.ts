import dayjs from "dayjs";
import { randomUUID } from "node:crypto";
import {
  Address,
  CourierLocation,
  Delivery,
  DeliveryStatus,
  MenuItem,
  Order,
  OrderItem,
  PayStatus,
  Payment,
  Restaurant,
  TrackingUpdate,
  User,
} from "../libs/common/types";
import { logger } from "../libs/common/logger";

interface DataStore {
  users: Map<string, User>;
  restaurants: Map<string, Restaurant>;
  menuItems: Map<string, MenuItem>;
  orders: Map<string, Order>;
  deliveries: Map<string, Delivery>;
  payments: Map<string, Payment>;
  courierLocations: Map<string, CourierLocation>;
  coupons: Map<string, import("../libs/common/types").Coupon>;
  groupOrders: Map<string, import("../libs/common/types").GroupOrder>;
}

const store: DataStore = {
  users: new Map(),
  restaurants: new Map(),
  menuItems: new Map(),
  orders: new Map(),
  deliveries: new Map(),
  payments: new Map(),
  courierLocations: new Map(),
  coupons: new Map(),
  groupOrders: new Map(),
};

export const dataStore = {
  get users() {
    return store.users;
  },
  get restaurants() {
    return store.restaurants;
  },
  get menuItems() {
    return store.menuItems;
  },
  get orders() {
    return store.orders;
  },
  get deliveries() {
    return store.deliveries;
  },
  get payments() {
    return store.payments;
  },
  get courierLocations() {
    return store.courierLocations;
  },
  get coupons() {
    return store.coupons;
  },
  get groupOrders() {
    return store.groupOrders;
  },
};

const createAddress = (userId: string, label: string, lat: number, lng: number, city?: string): Address => ({
  id: randomUUID(),
  userId,
  label,
  lat,
  lng,
  detail: `${label} Address Detail`,
  city,
});

const createUser = (role: User["role"], name: string, phone: string, email: string, city?: string): User => {
  const id = randomUUID();
  const base: User = {
    id,
    role,
    name,
    phone,
    email,
    createdAt: new Date(),
    city,
  };
  if (role === "customer") {
    return {
      ...base,
      addresses: [
        createAddress(id, "Home", 22.282, 114.158, city ?? "HKG"),
        createAddress(id, "Office", 22.335, 114.175, city ?? "HKG"),
      ],
    };
  }
  return base;
};

const createRestaurant = (name: string, lat: number, lng: number, isOpen: boolean, city?: string): Restaurant => ({
  id: randomUUID(),
  name,
  lat,
  lng,
  rating: 4.5,
  openHours: "09:00-21:00",
  isOpen,
  city,
});

const createMenuItem = (
  restaurantId: string,
  name: string,
  price: number,
  stock: number,
  options?: Record<string, unknown>,
): MenuItem => {
  const base: MenuItem = {
    id: randomUUID(),
    restaurantId,
    name,
    price,
    stock,
  };
  return options ? { ...base, options } : base;
};

export const seedData = () => {
  if (store.users.size > 0) {
    logger.info("Data store already seeded");
    return;
  }

  // Users across cities (HKG, SHA)
  const customer = createUser("customer", "Alice Customer", "+85212340000", "alice@example.com", "HKG");
  const courierHkg1 = createUser("courier", "Bob Courier", "+85212340001", "bob@example.com", "HKG");
  const courierHkg2 = createUser("courier", "Carol Courier", "+85212340003", "carol@example.com", "HKG");
  const courierSha1 = createUser("courier", "Dave Courier", "+862112340001", "dave@example.com", "SHA");
  const admin = createUser("admin", "Admin One", "+85212340002", "admin@example.com", "HKG");
  const restStaffHkg = createUser("restaurant", "Staff HK DimSum", "+85212340010", "staff.hkg@example.com", "HKG");
  const restStaffSha = createUser("restaurant", "Staff SH Noodle", "+862112340010", "staff.sha@example.com", "SHA");

  const restaurantA = createRestaurant("Dim Sum Express", 22.282, 114.158, true, "HKG");
  const restaurantB = createRestaurant("Noodle House", 31.2304, 121.4737, true, "SHA");

  const menuA1 = createMenuItem(restaurantA.id, "Shrimp Dumplings", 48.5, 100);
  const menuA2 = createMenuItem(restaurantA.id, "BBQ Pork Bun", 32.0, 100);
  const menuA3 = createMenuItem(restaurantA.id, "Siu Mai", 42.0, 120);
  const menuA4 = createMenuItem(restaurantA.id, "Spring Rolls", 28.0, 150);
  const menuB1 = createMenuItem(restaurantB.id, "Beef Brisket Noodles", 56.0, 80, {
    spiceLevels: ["mild", "medium", "hot"],
  });
  const menuB2 = createMenuItem(restaurantB.id, "Wonton Noodles", 52.0, 90);

  [customer, courierHkg1, courierHkg2, courierSha1, admin, restStaffHkg, restStaffSha].forEach((u) =>
    store.users.set(u.id, u),
  );
  [restaurantA, restaurantB].forEach((r) => store.restaurants.set(r.id, r));
  [menuA1, menuA2, menuA3, menuA4, menuB1, menuB2].forEach((m) => store.menuItems.set(m.id, m));

  const orderId = randomUUID();
  const orderItems: OrderItem[] = [
    {
      id: randomUUID(),
      orderId,
      menuItemId: menuA1.id,
      qty: 2,
      price: menuA1.price,
    },
    {
      id: randomUUID(),
      orderId,
      menuItemId: menuA2.id,
      qty: 1,
      price: menuA2.price,
    },
  ];

  const order: Order = {
    id: orderId,
    userId: customer.id,
    restaurantId: restaurantA.id,
    status: "DELIVERING",
    total: orderItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    payStatus: "PAID",
    etaMinutes: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: orderItems,
  };

  store.orders.set(orderId, order);

  const payment: Payment = {
    id: randomUUID(),
    orderId,
    channel: "credit_card",
    amount: order.total,
    status: "PAID",
    txnId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    processedAt: new Date(),
  };
  store.payments.set(payment.id, payment);

  const delivery: Delivery = {
    id: randomUUID(),
    orderId,
    courierId: courierHkg1.id,
    pickupEta: dayjs().add(5, "minute").toDate(),
    dropoffEta: dayjs().add(20, "minute").toDate(),
    status: "DELIVERING",
    routePolyline: "encoded_polyline_placeholder",
    startedAt: new Date(),
  };
  store.deliveries.set(delivery.id, delivery);

  const location: CourierLocation = {
    courierId: courierHkg1.id,
    lat: 22.29,
    lng: 114.16,
    recordedAt: new Date(),
  };
  store.courierLocations.set(courierHkg1.id, location);

  const initialTracking: TrackingUpdate = {
    orderId,
    courierId: courierHkg1.id,
    lat: location.lat,
    lng: location.lng,
    etaMinutes: 12,
    status: "DELIVERING",
    updatedAt: new Date(),
  };
  logger.info("Seeded data store with sample records", { orderId, tracking: initialTracking });

  // Additional sample order in CREATED/PENDING state for end-to-end demo
  const order2Id = randomUUID();
  const order2Items: OrderItem[] = [
    {
      id: randomUUID(),
      orderId: order2Id,
      menuItemId: menuB2.id,
      qty: 1,
      price: menuB2.price,
    },
    {
      id: randomUUID(),
      orderId: order2Id,
      menuItemId: menuA3.id,
      qty: 2,
      price: menuA3.price,
    },
  ];
  const order2: Order = {
    id: order2Id,
    userId: customer.id,
    restaurantId: restaurantB.id,
    status: "CREATED",
    total: order2Items.reduce((sum, it) => sum + it.price * it.qty, 0),
    payStatus: "PENDING",
    etaMinutes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: order2Items,
  };
  store.orders.set(order2Id, order2);
  const payment2: Payment = {
    id: randomUUID(),
    orderId: order2Id,
    channel: "credit_card",
    amount: order2.total,
    status: "PENDING",
  };
  store.payments.set(payment2.id, payment2);

  // Seed a couple of coupons
  const couponPercentId = randomUUID();
  store.coupons.set(couponPercentId, {
    id: couponPercentId,
    code: "WELCOME10",
    type: "PERCENT",
    value: 10,
    active: true,
    createdAt: new Date(),
    usageLimit: 1000,
    usedCount: 0,
  });
  const couponFlatId = randomUUID();
  store.coupons.set(couponFlatId, {
    id: couponFlatId,
    code: "SAVE20",
    type: "AMOUNT",
    value: 20,
    active: true,
    createdAt: new Date(),
    minOrderAmount: 60,
  });
};

export const findDeliveryByOrderId = (orderId: string): Delivery | undefined => {
  for (const delivery of store.deliveries.values()) {
    if (delivery.orderId === orderId) {
      return delivery;
    }
  }
  return undefined;
};

export const updateDeliveryStatus = (orderId: string, status: DeliveryStatus) => {
  const delivery = findDeliveryByOrderId(orderId);
  if (!delivery) return;
  delivery.status = status;
  delivery.completedAt = status === "DELIVERED" ? new Date() : undefined;
  store.deliveries.set(delivery.id, delivery);
};

export const updateOrderStatus = (orderId: string, status: Order["status"]) => {
  const order = store.orders.get(orderId);
  if (!order) return;
  order.status = status;
  order.updatedAt = new Date();
  store.orders.set(orderId, order);
};

export const updatePaymentStatus = (orderId: string, status: PayStatus) => {
  for (const payment of store.payments.values()) {
    if (payment.orderId === orderId) {
      payment.status = status;
      payment.processedAt = new Date();
      store.payments.set(payment.id, payment);
    }
  }
};
