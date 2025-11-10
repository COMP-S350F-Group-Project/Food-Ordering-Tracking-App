import { Link } from "react-router-dom";

export function OverviewPage() {
  return (
    <div className="stack gap-lg">
      <section className="hero">
        <h1>Order food, delivered fast</h1>
        <p>
          Browse nearby restaurants, place your order in seconds, and track your delivery in real time.
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/restaurants">
            Browse restaurants
          </Link>
          <Link className="btn btn-secondary" to="/orders/new">
            Start a new order
          </Link>
          <a
            className="btn btn-link"
            href="https://github.com/COMP-S350F-Group-Project/Food-Ordering-Tracking-App"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Great restaurants</h2>
          <ul>
            <li>Clear menus with live stock</li>
            <li>Ratings and opening hours</li>
          </ul>
        </article>
        <article className="card">
          <h2>Secure payments</h2>
          <ul>
            <li>Multiple payment options</li>
            <li>Instant confirmation</li>
          </ul>
        </article>
        <article className="card">
          <h2>Live tracking</h2>
          <ul>
            <li>Real-time courier updates</li>
            <li>Accurate ETA</li>
          </ul>
        </article>
      </section>

      <section className="card">
        <h2>Get started</h2>
        <ol className="ol-steps">
          <li>Pick a restaurant and explore the menu</li>
          <li>Add items to your order and proceed to payment</li>
          <li>Track your delivery with live updates and ETA</li>
        </ol>
      </section>
    </div>
  );
}

