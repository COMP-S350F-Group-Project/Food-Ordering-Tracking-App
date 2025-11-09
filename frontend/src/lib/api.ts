import type {
  Delivery,
  MenuItem,
  Order,
  OrderStatus,
  PayStatus,
  Restaurant,
  User,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  `${window.location.origin.replace(/\/$/, "")}/api/v1`;

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
    paymentChannel: "credit_card" | "apple_pay" | "google_pay";
    items: { menuItemId: string; qty: number; options?: Record<string, unknown> }[];
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
};

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? window.location.origin;
