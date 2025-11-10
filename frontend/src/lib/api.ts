import type {
  Delivery,
  MenuItem,
  Order,
  OrderStatus,
  PayStatus,
  Restaurant,
  User,
  Coupon,
  MetricsSnapshot,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.origin.replace(/\/$/, "")}/api/v1`;

let ADMIN_API_KEY: string | undefined = undefined;

export function setAdminApiKey(key: string | undefined) {
  ADMIN_API_KEY = key;
  if (key) localStorage.setItem("adminApiKey", key);
  else localStorage.removeItem("adminApiKey");
}

function adminHeaders(): HeadersInit {
  const key = ADMIN_API_KEY ?? localStorage.getItem("adminApiKey") ?? undefined;
  return key ? { "x-api-key": key } : {};
}

async function handleResponse<T>(input: Promise<Response>): Promise<T> {
  const res = await input;
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      /* noop */
    }
    const message = typeof body === "object" && body !== null && "message" in body
      ? (body as { message?: string }).message
      : res.statusText;
    throw new Error(message || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getUsers(): Promise<User[]> {
    return handleResponse(fetch(`${API_BASE_URL}/users`));
  },
  async getRestaurants(): Promise<Restaurant[]> {
    return handleResponse(fetch(`${API_BASE_URL}/catalog/restaurants`));
  },
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return handleResponse(fetch(`${API_BASE_URL}/catalog/restaurants/${restaurantId}/menu`));
  },
  async listOrders(): Promise<Order[]> {
    return handleResponse(fetch(`${API_BASE_URL}/orders`));
  },
  async getOrder(orderId: string): Promise<Order> {
    return handleResponse(fetch(`${API_BASE_URL}/orders/${orderId}`));
  },
  async createOrder(payload: {
    userId: string;
    restaurantId: string;
    paymentChannel:
      | "credit_card"
      | "apple_pay"
      | "google_pay"
      | "paypal"
      | "cash_on_delivery"
      | "wechat_pay";
    items: { menuItemId: string; qty: number; options?: Record<string, unknown> }[];
    couponCode?: string;
    groupOrderId?: string;
    deliveryAddressId?: string;
  }): Promise<Order> {
    return handleResponse(
      fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  },
  async transitionOrder(orderId: string, status: OrderStatus): Promise<Order> {
    return handleResponse(
      fetch(`${API_BASE_URL}/orders/${orderId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  },
  async transitionPayment(orderId: string, status: PayStatus): Promise<Order> {
    return handleResponse(
      fetch(`${API_BASE_URL}/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  },
  async startDelivery(orderId: string): Promise<{ orderId: string; message: string }> {
    return handleResponse(
      fetch(`${API_BASE_URL}/orders/${orderId}/delivery/start`, {
        method: "POST",
      }),
    );
  },
  async getDelivery(orderId: string): Promise<Delivery> {
    return handleResponse(fetch(`${API_BASE_URL}/deliveries/${orderId}`));
  },
  // Promotions
  async listCoupons(): Promise<Coupon[]> {
    return handleResponse(fetch(`${API_BASE_URL}/promotions/coupons`));
  },
  async createCoupon(payload: Omit<Coupon, "id" | "createdAt" | "usedCount">): Promise<Coupon> {
    return handleResponse(
      fetch(`${API_BASE_URL}/promotions/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify(payload),
      }),
    );
  },
  async validateCoupon(payload: { restaurantId: string; total: number; code: string }): Promise<{
    valid: boolean;
    discount: number;
    finalTotal: number;
    reason?: string;
  }> {
    return handleResponse(
      fetch(`${API_BASE_URL}/promotions/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  },
  // Group orders
  async createGroupOrder(payload: { hostUserId: string; restaurantId: string; expiresAt?: string }): Promise<any> {
    return handleResponse(
      fetch(`${API_BASE_URL}/group-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  },
  async getGroupOrder(id: string): Promise<any> {
    return handleResponse(fetch(`${API_BASE_URL}/group-orders/${id}`));
  },
  async addGroupOrderItems(id: string, payload: { userId: string; items: { menuItemId: string; qty: number; options?: Record<string, unknown> }[] }): Promise<any> {
    return handleResponse(
      fetch(`${API_BASE_URL}/group-orders/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  },
  async checkoutGroupOrder(id: string, payload: { paymentChannel: any; couponCode?: string }): Promise<Order> {
    return handleResponse(
      fetch(`${API_BASE_URL}/group-orders/${id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  },
  // Observability & analytics
  async getMetrics(): Promise<MetricsSnapshot> {
    return handleResponse(fetch(`${API_BASE_URL}/metrics`));
  },
  async getAnalyticsSummary(): Promise<any> {
    return handleResponse(fetch(`${API_BASE_URL}/analytics/summary`, { headers: { ...adminHeaders() } }));
  },
  async getForecast(minutes = 60): Promise<any> {
    const url = new URL(`${API_BASE_URL}/analytics/forecast`);
    url.searchParams.set("minutes", String(minutes));
    return handleResponse(fetch(url, { headers: { ...adminHeaders() } }));
  },
};

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? window.location.origin;
