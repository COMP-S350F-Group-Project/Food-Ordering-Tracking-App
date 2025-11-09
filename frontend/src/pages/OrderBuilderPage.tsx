import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { MenuItem, Order, Restaurant, User } from "../types";
import { LoadingState, ErrorState } from "../components/StateIndicators";

type QuantityMap = Record<string, number>;

export function OrderBuilderPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | undefined>(undefined);
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [fetchedUsers, fetchedRestaurants] = await Promise.all([api.getUsers(), api.getRestaurants()]);
        const customers = fetchedUsers.filter((user) => user.role === "customer");
        setUsers(customers);
        setRestaurants(fetchedRestaurants.filter((restaurant) => restaurant.isOpen));
        if (customers[0]) {
          setSelectedUserId(customers[0].id);
        }
        if (fetchedRestaurants[0]) {
          setSelectedRestaurantId(fetchedRestaurants[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMenu = async () => {
      if (!selectedRestaurantId) {
        return;
      }
      setMenuLoading(true);
      setMenuError(undefined);
      try {
        const items = await api.getMenuItems(selectedRestaurantId);
        setMenuItems(items);
        setQuantities({});
      } catch (err) {
        setMenuError(err instanceof Error ? err.message : String(err));
        setMenuItems([]);
      } finally {
        setMenuLoading(false);
      }
    };
    loadMenu().catch(() => {});
  }, [selectedRestaurantId]);

  const totalPrice = useMemo(
    () =>
      menuItems.reduce((sum, item) => {
        const qty = quantities[item.id] ?? 0;
        return sum + qty * item.price;
      }, 0),
    [menuItems, quantities],
  );

  const selectedItems = useMemo(
    () =>
      menuItems
        .map((item) => ({
          menuItemId: item.id,
          qty: quantities[item.id] ?? 0,
        }))
        .filter((item) => item.qty > 0),
    [menuItems, quantities],
  );

  const handleQuantityChange = (menuItemId: string, qty: number) => {
    setQuantities((prev) => ({
      ...prev,
      [menuItemId]: qty,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId || !selectedRestaurantId || selectedItems.length === 0) {
      return;
    }
    setSubmitting(true);
    setCreatedOrder(undefined);
    try {
      const order = await api.createOrder({
        userId: selectedUserId,
        restaurantId: selectedRestaurantId,
        paymentChannel: "credit_card",
        items: selectedItems,
      });
      setCreatedOrder(order);
      setQuantities({});
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Preparing order builder..." />;
  }
  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>New Order</h1>
          <p>Choose a restaurant and items, then place your order. You can manage payment and track delivery from the order page.</p>
        </div>
        <Link to="/orders" className="btn btn-secondary">
          View orders
        </Link>
      </header>

      <form className="card form-stack" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="customer">Customer</label>
          <select
            id="customer"
            value={selectedUserId ?? ""}
            onChange={(event) => setSelectedUserId(event.target.value || undefined)}
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="restaurant">Restaurant</label>
          <select
            id="restaurant"
            value={selectedRestaurantId ?? ""}
            onChange={(event) => setSelectedRestaurantId(event.target.value || undefined)}
          >
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name} — rating {restaurant.rating.toFixed(1)} ★
              </option>
            ))}
          </select>
        </div>

        <fieldset className="form-group">
          <legend>Menu</legend>
          {menuLoading ? <LoadingState label="Loading menu..." /> : null}
          {menuError ? <p className="text-danger">{menuError}</p> : null}
          {menuItems.length === 0 && !menuLoading ? (
            <p className="muted">No menu items available.</p>
          ) : (
            <div className="menu-selector">
              {menuItems.map((item) => (
                <div key={item.id} className="menu-selector__item">
                  <div className="menu-selector__info">
                    <strong>{item.name}</strong>
                    <span>${item.price.toFixed(2)}</span>
                    <small className="muted">{item.stock} in stock</small>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={item.stock}
                    value={quantities[item.id] ?? 0}
                    onChange={(event) => handleQuantityChange(item.id, Number(event.target.value))}
                  />
                </div>
              ))}
            </div>
          )}
        </fieldset>

        <div className="form-summary">
          <div>
            <strong>Items:</strong> {selectedItems.length}
          </div>
          <div>
            <strong>Estimated total:</strong> ${totalPrice.toFixed(2)}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={selectedItems.length === 0 || submitting}
        >
          {submitting ? "Placing order..." : "Place order"}
        </button>

        {createdOrder ? (
          <div className="callout success">
            <p>
              Order <code>{createdOrder.id.slice(0, 8)}</code> created successfully.
            </p>
            <div className="callout-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/orders/${createdOrder.id}`)}>
                Open order
              </button>
              <button type="button" className="btn btn-link" onClick={() => setCreatedOrder(undefined)}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}
