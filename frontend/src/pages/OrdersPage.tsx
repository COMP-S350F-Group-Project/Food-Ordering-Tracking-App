import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../hooks/useAsync";
import { ErrorState, LoadingState } from "../components/StateIndicators";
import {
  OrderStatusBadge,
  PayStatusBadge,
} from "../components/OrderStatusBadge";
import { dayjs } from "../lib/dayjs";

export function OrdersPage() {
  const {
    data: orders,
    loading,
    error,
    execute,
  } = useAsync(api.listOrders.bind(api), []);

  if (loading && !orders) {
    return <LoadingState label="Loading orders..." />;
  }
  if (error) {
    return <ErrorState error={error} retry={execute} />;
  }

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>Orders</h1>
          <p>View your orders, payments and delivery updates in one place.</p>
        </div>
        <Link to="/orders/new" className="btn btn-primary">
          New order
        </Link>
      </header>
      {!orders || orders.length === 0 ? (
        <div className="card">
          <h2>No orders yet</h2>
          <p>Use the “Create order” button to generate a new flow based on the seeded data.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Last Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders!.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Order ID">
                      <code>{order.id.slice(0, 8)}</code>
                    </td>
                    <td data-label="Status">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td data-label="Payment">
                      <PayStatusBadge status={order.payStatus} />
                    </td>
                    <td data-label="Total">${order.total.toFixed(2)}</td>
                    <td data-label="Last Updated">
                      {dayjs(order.updatedAt).format("MMM D, HH:mm")}
                    </td>
                    <td data-label="Actions">
                      <Link className="btn btn-link" to={`/orders/${order.id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
