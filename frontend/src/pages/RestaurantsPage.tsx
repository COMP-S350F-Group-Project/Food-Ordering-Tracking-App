import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAsync } from "../hooks/useAsync";
import type { MenuItem, Restaurant } from "../types";
import { ErrorState, LoadingState } from "../components/StateIndicators";

type MenuLookup = Record<string, MenuItem[]>;

export function RestaurantsPage() {
  const { data: restaurants, loading, error, execute } = useAsync(api.getRestaurants.bind(api), []);
  const [menuItems, setMenuItems] = useState<MenuLookup>({});
  const [menuLoading, setMenuLoading] = useState<Record<string, boolean>>({});
  const [menuError, setMenuError] = useState<Record<string, string | undefined>>({});

  const handleViewMenu = async (restaurant: Restaurant) => {
    if (menuItems[restaurant.id]) {
      return;
    }
    setMenuLoading((prev) => ({ ...prev, [restaurant.id]: true }));
    try {
      const items = await api.getMenuItems(restaurant.id);
      setMenuItems((prev) => ({ ...prev, [restaurant.id]: items }));
      setMenuError((prev) => ({ ...prev, [restaurant.id]: undefined }));
    } catch (err) {
      setMenuError((prev) => ({
        ...prev,
        [restaurant.id]: err instanceof Error ? err.message : String(err),
      }));
    } finally {
      setMenuLoading((prev) => ({ ...prev, [restaurant.id]: false }));
    }
  };

  const openRestaurants = useMemo(
    () => (restaurants ?? []).filter((r) => r.isOpen),
    [restaurants],
  );

  if (loading && !restaurants) {
    return <LoadingState label="Loading restaurants..." />;
  }
  if (error) {
    return <ErrorState error={error} retry={execute} />;
  }

  return (
    <div className="stack gap-lg">
      <header className="page-header">
        <div>
          <h1>Restaurants</h1>
          <p>Browse available venues, explore their menus and stock, and place your order.</p>
        </div>
        <Link to="/orders/new" className="btn btn-primary">
          New order
        </Link>
      </header>

      <section className="grid">
        {openRestaurants.map((restaurant) => (
          <article key={restaurant.id} className="card card--restaurant">
            <header className="card-header">
              <h2>{restaurant.name}</h2>
              <span className="badge primary">{restaurant.rating.toFixed(1)} ★</span>
            </header>
            <dl className="meta-list">
              <div>
                <dt>Open Hours</dt>
                <dd>{restaurant.openHours}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>
                  {restaurant.lat.toFixed(3)}, {restaurant.lng.toFixed(3)}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleViewMenu(restaurant)}
              disabled={!!menuItems[restaurant.id] || menuLoading[restaurant.id]}
            >
              {menuLoading[restaurant.id] ? "Loading menu..." : menuItems[restaurant.id] ? "Menu" : "Browse menu"}
            </button>
            {menuError[restaurant.id] ? <p className="text-danger">{menuError[restaurant.id]}</p> : null}
            {menuItems[restaurant.id] ? (
              <ul className="menu-list">
                {menuItems[restaurant.id].map((item) => (
                  <li key={item.id} className={item.stock > 0 ? "" : "muted"}>
                    <div>
                      <strong>{item.name}</strong>
                      {item.options ? (
                        <small className="muted">
                          Options: {Object.keys(item.options).join(", ")}
                        </small>
                      ) : null}
                    </div>
                    <div className="menu-meta">
                      <span>${item.price.toFixed(2)}</span>
                      <span>{item.stock} in stock</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      {openRestaurants.length === 0 ? (
        <div className="card">
          <h2>No restaurants currently open</h2>
          <p>Please check back later.</p>
        </div>
      ) : null}

      {restaurants && restaurants.length > openRestaurants.length ? (
        <section className="card">
          <h2>Closed now</h2>
          <p>These restaurants are currently closed.</p>
          <ul>
            {restaurants
              .filter((r) => !r.isOpen)
              .map((r) => (
                <li key={r.id}>
                  {r.name} (hours: {r.openHours})
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
