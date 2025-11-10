import { useEffect, useState } from "react";
import { api, setAdminApiKey } from "../lib/api";
import type { Coupon, MetricsSnapshot } from "../types";
import { LoadingState, ErrorState } from "../components/StateIndicators";

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [form, setForm] = useState({ code: "WELCOME10", type: "PERCENT", value: 10, active: true });
  const [adminKey, setAdminKey] = useState<string>(localStorage.getItem("adminApiKey") || "demo-admin-key");

  useEffect(() => {
    const load = async () => {
      try {
        const [m, c] = await Promise.all([api.getMetrics(), api.listCoupons()]);
        setMetrics(m);
        setCoupons(c);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadAnalytics = async () => {
    try {
      setAdminApiKey(adminKey);
      const [s, f] = await Promise.all([api.getAnalyticsSummary(), api.getForecast(60)]);
      setSummary(s);
      setForecast(f);
    } catch (err) {
      setError(err as Error);
    }
  };

  const createCoupon = async () => {
    try {
      setAdminApiKey(adminKey);
      const c = await api.createCoupon({ ...(form as any) });
      setCoupons((prev) => [c, ...prev]);
    } catch (err) {
      setError(err as Error);
    }
  };

  if (loading) return <LoadingState label="Loading admin dashboard..." />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Operational metrics, analytics, and promotions management for the demo.</p>
        </div>
      </header>

      <section className="card">
        <h2>Admin Access</h2>
        <div className="form-group">
          <label htmlFor="admkey">API Key</label>
          <input id="admkey" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} />
          <small className="muted">Header x-api-key; default demo key is "demo-admin-key".</small>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { setAdminApiKey(adminKey); }}>Save Key</button>
          <button className="btn btn-secondary" onClick={loadAnalytics}>Load Analytics</button>
        </div>
      </section>

      <section className="card">
        <h2>Metrics</h2>
        {metrics ? (
          <ul>
            {Object.entries(metrics).map(([k, v]) => (
              <li key={k}>
                <strong>{k}</strong>: {String(v)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No metrics yet.</p>
        )}
      </section>

      <section className="card">
        <h2>Coupons</h2>
        <div className="form-inline">
          <input placeholder="Code" value={form.code as any} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <select value={form.type as any} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="PERCENT">PERCENT</option>
            <option value="AMOUNT">AMOUNT</option>
          </select>
          <input
            type="number"
            placeholder="Value"
            value={form.value as any}
            onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
          />
          <button className="btn btn-primary" onClick={createCoupon}>Create</button>
        </div>
        <ul>
          {coupons.map((c) => (
            <li key={c.id}>
              <code>{c.code}</code> – {c.type === "PERCENT" ? `${c.value}%` : `$${c.value.toFixed(2)}`} {c.active ? "(active)" : "(inactive)"}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Analytics</h2>
        {summary ? (
          <>
            <div><strong>Total Orders:</strong> {summary.totals.orders} | <strong>Revenue:</strong> ${summary.totals.revenue.toFixed(2)}</div>
            <h3>By Restaurant</h3>
            <ul>
              {summary.byRestaurant.map((r: any) => (
                <li key={r.restaurantId}>
                  {r.restaurantName} ({r.city}) – {r.orders} orders, ${r.revenue.toFixed(2)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="muted">Load analytics to view summary.</p>
        )}

        {forecast ? (
          <>
            <h3>Forecast (next {forecast.horizonMinutes} min)</h3>
            <p>Expected average orders/min: {forecast.perMinute.toFixed(2)}</p>
          </>
        ) : null}
      </section>
    </div>
  );
}

