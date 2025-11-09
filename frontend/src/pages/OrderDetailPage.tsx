import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api, SOCKET_URL } from "../lib/api";
import { useAsync } from "../hooks/useAsync";
import { ErrorState, LoadingState } from "../components/StateIndicators";
import {
  OrderStatusBadge,
  PayStatusBadge,
} from "../components/OrderStatusBadge";
import type { Order, OrderStatus, PayStatus, TrackingUpdate, DeliveryStatus } from "../types";
import { dayjs } from "../lib/dayjs";

const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["DELIVERING", "CANCELLED"],
  DELIVERING: ["DELIVERED", "FAILED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
  FAILED: [],
};

const PAYMENT_FLOW: Record<PayStatus, PayStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

const ORDER_LABELS: Record<OrderStatus, string> = {
  CREATED: "Created",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  PICKED_UP: "Picked up",
  DELIVERING: "Delivering",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

const PAY_LABELS: Record<PayStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  ASSIGNED: "Assigned",
  EN_ROUTE_PICKUP: "En route to pickup",
  AT_RESTAURANT: "At restaurant",
  PICKED_UP: "Picked up",
  DELIVERING: "Delivering",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
};

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    data: order,
    loading,
    error,
    execute,
    setData,
  } = useAsync<Order | undefined>(() => {
    if (!orderId) throw new Error("Order id required");
    return api.getOrder(orderId);
  }, [orderId]);
  const [trackingLog, setTrackingLog] = useState<TrackingUpdate[]>([]);
  const [actionError, setActionError] = useState<string | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const instance = io(SOCKET_URL);
    instance.emit("joinOrder", { orderId });
    instance.on("tracking", (payload: TrackingUpdate) => {
      if (payload.orderId !== orderId) return;
      const normalised: TrackingUpdate = {
        ...payload,
        updatedAt: new Date(payload.updatedAt).toISOString(),
      };
      setTrackingLog((prev) => [normalised, ...prev].slice(0, 10));
      setData((prev) =>
        prev
          ? {
              ...prev,
              etaMinutes: normalised.etaMinutes,
              delivery: prev.delivery
                ? {
                    ...prev.delivery,
                    status: normalised.status,
                    dropoffEta: normalised.etaMinutes
                      ? dayjs()
                          .add(normalised.etaMinutes, "minute")
                          .toISOString()
                      : prev.delivery.dropoffEta,
                  }
                : prev.delivery,
            }
          : prev
      );
    });
    return () => {
      instance.disconnect();
    };
  }, [orderId, setData]);

  useEffect(() => {
    if (!orderId) return;
    let mounted = true;
    api
      .getDelivery(orderId)
      .then((delivery) => {
        if (mounted) {
          setData((prev) => (prev ? { ...prev, delivery } : prev));
        }
      })
      .catch(() => {
        /* delivery may not exist yet */
      });
    return () => {
      mounted = false;
    };
  }, [orderId, setData]);

  const availableOrderTransitions = useMemo(
    () => (order ? ORDER_FLOW[order.status] : []),
    [order]
  );
  const availablePaymentTransitions = useMemo(
    () => (order ? PAYMENT_FLOW[order.payStatus] : []),
    [order]
  );

  const handlePaymentTransition = async (status: PayStatus) => {
    if (!orderId) return;
    setActionLoading(true);
    setActionError(undefined);
    try {
      const updated = await api.transitionPayment(orderId, status);
      setData(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOrderTransition = async (status: OrderStatus) => {
    if (!orderId) return;
    setActionLoading(true);
    setActionError(undefined);
    try {
      const updated = await api.transitionOrder(orderId, status);
      setData(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTracking = async () => {
    if (!orderId) return;
    setTrackingLoading(true);
    setActionError(undefined);
    try {
      await api.startDelivery(orderId);
      await execute();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setTrackingLoading(false);
    }
  };

  if (loading && !order) {
    return <LoadingState label="Loading order details..." />;
  }
  if (error) {
    return <ErrorState error={error} retry={execute} />;
  }
  if (!order) {
    return (
      <div className="card">
        <p>Order not found.</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/orders")}
        >
          Back to orders
        </button>
      </div>
    );
  }

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>
            Order <code>{order.id.slice(0, 8)}</code>
          </h1>
          <p>
            Created {dayjs(order.createdAt).format("MMM D, HH:mm")} · Last update {dayjs(order.updatedAt).fromNow()}
          </p>
        </div>
        <div className="stack">
          <span>
            Order status: <OrderStatusBadge status={order.status} />
          </span>
          <span>
            Payment status: <PayStatusBadge status={order.payStatus} />
          </span>
        </div>
      </header>

      {actionError ? <div className="callout danger">{actionError}</div> : null}

      <section className="grid grid--two">
        <article className="card">
          <h2>Order items</h2>
          <ul className="data-list">
            {order.items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>
                    {item.menuName ?? item.menuItemId.slice(0, 6)}
                  </strong>
                  <small className="muted">Qty {item.qty}</small>
                </div>
                <div>${(item.price * item.qty).toFixed(2)}</div>
              </li>
            ))}
          </ul>
          <footer className="card-footer">
            <strong>Total:</strong> ${order.total.toFixed(2)}
        </footer>
        </article>

        <article className="card">
          <h2>Actions</h2>
          <div className="stack">
            <div>
              <h3>Payment</h3>
              {availablePaymentTransitions.length === 0 ? (
                <p className="muted">No further payment transitions available.</p>
              ) : (
                <div className="action-group">
                  {availablePaymentTransitions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handlePaymentTransition(status)}
                      disabled={actionLoading}
                    >
                      Set to {PAY_LABELS[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3>Order progress</h3>
              {availableOrderTransitions.length === 0 ? (
                <p className="muted">Order reached a terminal state.</p>
              ) : (
                <div className="action-group">
                  {availableOrderTransitions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOrderTransition(status)}
                      disabled={actionLoading}
                    >
                      Advance to {ORDER_LABELS[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3>Live tracking</h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartTracking}
                disabled={trackingLoading}
              >
                {trackingLoading ? "Starting..." : "Start delivery"}
              </button>
              <p className="muted">Begin delivery and receive live courier updates and ETA.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid--two">
        <article className="card">
          <h2>Delivery</h2>
          {order.delivery ? (
            <dl className="meta-list">
              <div>
                <dt>Status</dt>
                <dd>{DELIVERY_LABELS[order.delivery.status]}</dd>
              </div>
              <div>
                <dt>Courier</dt>
                <dd>{order.delivery.courierId.slice(0, 8)}</dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>{order.etaMinutes !== null ? `${order.etaMinutes} min` : "—"}</dd>
              </div>
              <div>
                <dt>Pickup ETA</dt>
                <dd>
                  {order.delivery.pickupEta
                    ? dayjs(order.delivery.pickupEta).format("HH:mm")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Dropoff ETA</dt>
                <dd>
                  {order.delivery.dropoffEta
                    ? dayjs(order.delivery.dropoffEta).format("HH:mm")
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Delivery will appear once the order is accepted and paid.</p>
          )}
        </article>

        <article className="card">
          <h2>Live updates</h2>
          {trackingLog.length === 0 ? (
            <p className="muted">No live updates yet. Start delivery to see courier location and ETA.</p>
          ) : (
            <ul className="data-list">
              {trackingLog.map((entry) => (
                <li key={entry.updatedAt} className="data-list__item">
                  <div>
                    <strong>{DELIVERY_LABELS[entry.status]}</strong>
                    <small className="muted">
                      {dayjs(entry.updatedAt).format("HH:mm:ss")}
                    </small>
                  </div>
                  <div>
                    <span>
                      Lat {entry.lat.toFixed(3)}, Lng {entry.lng.toFixed(3)}
                    </span>
                    <small className="muted">ETA {entry.etaMinutes} min</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
