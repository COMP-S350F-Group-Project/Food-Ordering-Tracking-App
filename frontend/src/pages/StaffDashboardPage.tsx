import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Order, OrderStatus, Restaurant } from "../types";
import { LoadingState, ErrorState } from "../components/StateIndicators";

export function StaffDashboardPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | undefined>(undefined);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [rests, ords] = await Promise.all([api.getRestaurants(), api.listOrders()]);
        setRestaurants(rests);
        setOrders(ords);
        setSelectedRestaurantId(rests[0]?.id);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => o.restaurantId === selectedRestaurantId);
  }, [orders, selectedRestaurantId]);

  const nextTransitions: Record<OrderStatus, OrderStatus[]> = {
    CREATED: ["CONFIRMED"],
    CONFIRMED: ["PREPARING"],
    PREPARING: ["PICKED_UP"],
    PICKED_UP: ["DELIVERING"],
    DELIVERING: ["DELIVERED"],
    DELIVERED: ["COMPLETED"],
    COMPLETED: [],
    CANCELLED: [],
    REFUNDED: [],
    FAILED: [],
  };

  const doTransition = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId);
    try {
      const updated = await api.transitionOrder(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setError(err as Error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <LoadingState label="Loading staff dashboard..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>Restaurant Staff</h1>
          <p>Manage order workflow for your restaurant.</p>
        </div>
      </header>

      <section className="card">
        <div className="form-group">
          <label htmlFor="restaurant">Restaurant</label>
          <select id="restaurant" value={selectedRestaurantId} onChange={(e) => setSelectedRestaurantId(e.target.value)}>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.city ? `(${r.city})` : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="card">
        <h2>Orders</h2>
        {filtered.length === 0 ? <p className="muted">No orders yet.</p> : null}
        <ul className="stack">
          {filtered.map((o) => (
            <li key={o.id} className="row space-between">
              <div>
                <strong>{o.id.slice(0, 8)}</strong> – {o.status} – ${o.total.toFixed(2)} {o.couponCode ? <em>(coupon {o.couponCode})</em> : null}
              </div>
              <div className="row">
                {nextTransitions[o.status].map((s) => (
                  <button key={s} className="btn btn-secondary" disabled={updating === o.id} onClick={() => doTransition(o.id, s)}>
                    Mark {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

