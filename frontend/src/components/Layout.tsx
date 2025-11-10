import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/restaurants", label: "Restaurants" },
  { to: "/orders/new", label: "New Order" },
  { to: "/orders", label: "Orders" },
  { to: "/group-order", label: "Group Order" },
  { to: "/staff", label: "Staff" },
  { to: "/admin", label: "Admin" },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-title">Food Ordering & Tracking</span>
          <span className="app-subtitle">Order food. Track delivery live.</span>
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((v) => !v)}
        >
          ☰ Menu
        </button>
        <nav>
          <ul id="primary-nav" className={`app-nav ${open ? "is-open" : ""}`}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "nav-link nav-link--active" : "nav-link"
                  }
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>
          © 2025 Food Ordering & Tracking • Open source under MIT by Li Yanpei •
          {" "}
          <a
            href="https://github.com/COMP-S350F-Group-Project/Food-Ordering-Tracking-App"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </span>
      </footer>
    </div>
  );
}
