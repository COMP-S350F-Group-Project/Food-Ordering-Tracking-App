import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { MenuItem, Restaurant, User } from "../types";
import { LoadingState, ErrorState } from "../components/StateIndicators";

type QuantityMap = Record<string, number>;

export function GroupOrderPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [hostUserId, setHostUserId] = useState<string | undefined>(undefined);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [couponCode, setCouponCode] = useState<string>("");
  const [paymentChannel, setPaymentChannel] = useState<any>("credit_card");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [fetchedUsers, fetchedRestaurants] = await Promise.all([api.getUsers(), api.getRestaurants()]);
        const customers = fetchedUsers.filter((u) => u.role === "customer");
        setUsers(customers);
        setRestaurants(fetchedRestaurants);
        setSelectedRestaurantId(fetchedRestaurants[0]?.id);
        setHostUserId(customers[0]?.id);
        setSelectedUserId(customers[0]?.id);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadMenu = async () => {
      if (!selectedRestaurantId) return;
      const items = await api.getMenuItems(selectedRestaurantId);
      setMenuItems(items);
      setQuantities({});
    };
    loadMenu().catch(() => {});
  }, [selectedRestaurantId]);

  const selectedItems = useMemo(() =>
    menuItems
      .map((item) => ({ menuItemId: item.id, qty: quantities[item.id] ?? 0 }))
      .filter((it) => it.qty > 0),
  [menuItems, quantities]);

  const addParticipantItems = async () => {
    if (!groupId || !selectedUserId || selectedItems.length === 0) return;
    await api.addGroupOrderItems(groupId, { userId: selectedUserId, items: selectedItems });
    setMessage(`Added ${selectedItems.length} item(s) for participant.`);
    setQuantities({});
  };

  const createGroup = async () => {
    if (!hostUserId || !selectedRestaurantId) return;
    const group = await api.createGroupOrder({ hostUserId, restaurantId: selectedRestaurantId });
    setGroupId(group.id);
    setMessage(`Group order created: ${group.id.slice(0, 8)}`);
  };

  const checkout = async () => {
    if (!groupId) return;
    const order = await api.checkoutGroupOrder(groupId, { paymentChannel, couponCode: couponCode || undefined });
    setMessage(`Checked out group order. New order ${order.id.slice(0, 8)}`);
  };

  if (loading) return <LoadingState label="Loading group order..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>Group Order</h1>
          <p>Create a shared order, collect items from multiple participants, and checkout as host.</p>
        </div>
      </header>

      <section className="card form-stack">
        <div className="form-group">
          <label htmlFor="host">Host</label>
          <select id="host" value={hostUserId} onChange={(e) => setHostUserId(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="restaurant">Restaurant</label>
          <select id="restaurant" value={selectedRestaurantId} onChange={(e) => setSelectedRestaurantId(e.target.value)}>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={createGroup} disabled={!hostUserId || !selectedRestaurantId}>Create Group</button>
          {groupId ? <code>Group: {groupId.slice(0, 8)}</code> : null}
        </div>
      </section>

      <section className="card form-stack">
        <h2>Participants</h2>
        <div className="form-group">
          <label htmlFor="participant">Participant</label>
          <select id="participant" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <fieldset className="form-group">
          <legend>Menu</legend>
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
                  onChange={(e) => setQuantities((q) => ({ ...q, [item.id]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <div className="row">
          <button className="btn btn-secondary" onClick={addParticipantItems} disabled={!groupId || selectedItems.length === 0}>Add Items</button>
        </div>
      </section>

      <section className="card form-stack">
        <h2>Checkout</h2>
        <div className="form-group">
          <label htmlFor="pay">Payment</label>
          <select id="pay" value={paymentChannel} onChange={(e) => setPaymentChannel(e.target.value)}>
            <option value="credit_card">Credit Card</option>
            <option value="apple_pay">Apple Pay</option>
            <option value="google_pay">Google Pay</option>
            <option value="paypal">PayPal</option>
            <option value="wechat_pay">WeChat Pay</option>
            <option value="cash_on_delivery">Cash on Delivery</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="coupon">Coupon</label>
          <input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Optional" />
        </div>
        <button className="btn btn-primary" onClick={checkout} disabled={!groupId}>Checkout Group Order</button>
      </section>

      {message ? <div className="callout success">{message}</div> : null}
    </div>
  );
}

