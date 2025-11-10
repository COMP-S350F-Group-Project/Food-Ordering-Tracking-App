# Food Ordering & Live Tracking — Enterprise-Grade Demo (TypeScript)

End-to-end demo of a modern food delivery platform with real-time tracking. The project is built to feel production-grade while staying self-contained and easy to run locally. It showcases robust domain boundaries, stateful workflows, promotions, smart dispatch, observability, analytics, and an integrated React UI.

- Backend: Node.js, TypeScript, Express v5, Socket.IO, Zod, Day.js
- Frontend: React, Vite, React Router, Socket.IO client, TypeScript
- Ops: Helmet, compression, rate limiting, structured logging, request IDs, metrics, Docker (multi-stage)

Published Demo: https://fot.hiko.dev/

Repository (open source): https://github.com/COMP-S350F-Group-Project/Food-Ordering-Tracking-App

## Highlights

- Clear domains: catalog, users, orders, payment, delivery, tracking, promotions, group orders, analytics
- Real-time tracking: simulated courier movement broadcast via Socket.IO
- Promotions & coupons: percent/amount discounts with validation + admin management
- Group orders: collaborative ordering sessions with host checkout
- Additional payments: credit card, Apple/Google Pay, PayPal, WeChat Pay, Cash on Delivery (simulated)
- Smart dispatch & multi-city routing: city-aware ETA heuristic and load-aware courier selection
- Observability: request IDs, JSON metrics, concise structured logs
- Analytics & forecasting: order/revenue summary and a naive short-term forecast
- Cross-platform: SPA with PWA manifest, responsive layout
- Self-contained data: in-memory store with rich seed data (multi-city users, couriers, restaurants)

## Table of Contents

- Quick Start
- Project Structure
- Domain & Workflows
- API Overview
- Real-time Events
- Frontend UI
- Configuration
- Observability & Security
- Docker (Local build, NAS deploy)
- Troubleshooting
- Roadmap

## Quick Start

Prerequisites: Node.js 18+ and npm.

- Install dependencies (Windows users: prefer Command Prompt `cmd`):
  - `npm run setup`  (installs backend and frontend deps)

- Concurrent dev (hot reload):
  - `npm run dev:all`
  - Backend API: http://localhost:3000
  - Frontend UI: http://localhost:5173 (dev proxy to API/WebSocket)

- Single-server mode (Express serves built UI):
  - `npm run build:all`
  - `npm start`
  - App: http://localhost:3000

On start, the API seeds sample data (customer, multiple couriers across cities, restaurants, menu items, sample orders, payments, deliveries, and coupons) so the system is immediately usable.

## Project Structure

```
src/
  apps/
    analytics/         # Summary + naive forecast endpoints
    catalog/           # Restaurants and menu APIs
    delivery/          # Delivery orchestration + tracking loop + smart dispatch
    group-orders/      # Group order creation, participation, checkout
    orders/            # Order creation and state transitions
    payment/           # Payment lifecycle management (simulated)
    promotions/        # Coupons (validation, admin create)
    tracking/          # Socket.IO gateway
    observability/     # Metrics counters
    users/             # User listing and lookup
  infrastructure/
    data-store.ts      # In-memory store and seed data
  libs/
    common/            # Errors, logger, shared types
    dto/               # Zod DTOs and validators
  server.ts            # Express/Socket.IO bootstrap + static SPA
frontend/
  public/              # Static assets + PWA manifest
  src/                 # React app (pages/components/hooks/lib)
  vite.config.ts       # Dev proxy and build config
Dockerfile             # Multi-stage build (front+back)
.dockerignore          # Lean Docker context
```

## Domain & Workflows

- Orders: strict transitions (CREATED -> CONFIRMED -> PREPARING -> PICKED_UP -> DELIVERING -> DELIVERED -> COMPLETED; plus CANCELLED/REFUNDED/FAILED)
- Payment: PENDING -> PAID/FAILED (simulated); refund supported
- Delivery: ASSIGNED -> EN_ROUTE_PICKUP/AT_RESTAURANT/PICKED_UP -> DELIVERING -> DELIVERED (simulated path)
- Smart dispatch: city-aware ETA heuristic (Haversine + per-city avg speed) and courier load penalty
- Promotions: percent/amount coupons with constraints (time window, min amount, restaurant scope, usage limits)
- Group orders: host creates, participants add items, host checks out into single order

## API Overview

Base URL: `http://localhost:3000`

Core
- `GET /healthz` – Health probe
- `GET /api/v1/users` – List users
- `GET /api/v1/catalog/restaurants` – List restaurants
- `GET /api/v1/catalog/restaurants/:restaurantId/menu` – Menu and stock
- `POST /api/v1/orders` – Create order (supports couponCode, paymentChannel)
- `POST /api/v1/orders/:orderId/payments` – Update payment (`PAID`, `FAILED`, `REFUNDED`)
- `POST /api/v1/orders/:orderId/transition` – Advance order (`CONFIRMED`, `PREPARING`, `PICKED_UP`, `DELIVERING`, `DELIVERED`, `COMPLETED`, etc.)
- `POST /api/v1/orders/:orderId/delivery/start` – Begin simulated tracking
- `GET /api/v1/deliveries/:orderId` – Current delivery snapshot

Promotions
- `GET /api/v1/promotions/coupons` – List coupons
- `POST /api/v1/promotions/coupons` – Create coupon (admin; header `x-api-key`)
- `POST /api/v1/promotions/validate` – Validate coupon for restaurant+total

Group Orders
- `POST /api/v1/group-orders` – Create group order session
- `GET /api/v1/group-orders/:id` – Group order details
- `POST /api/v1/group-orders/:id/participants` – Add participant items
- `POST /api/v1/group-orders/:id/checkout` – Checkout -> creates an order

Observability & Analytics
- `GET /api/v1/metrics` – Operational counters for the demo
- `GET /api/v1/analytics/summary` – Orders & revenue by restaurant (admin)
- `GET /api/v1/analytics/forecast?minutes=60` – Naive order forecast (admin)

Copy-ready examples: `docs/sample-requests.http`.

## Real-time Events (Socket.IO)

- Connect to the same origin as the API.
- Join an order room, then receive `tracking` updates with courier position and ETA.

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");
socket.emit("joinOrder", { orderId: "..." });
socket.on("tracking", (update) => {
  console.log(update); // { orderId, courierId, lat, lng, status, etaMinutes, updatedAt }
});
```

Start emitting updates by calling `POST /api/v1/orders/:orderId/delivery/start`.

## Frontend UI

- Overview page with key actions
- Restaurant browser with live stock (`frontend/src/pages/RestaurantsPage.tsx`)
- Order builder with coupons + payment options (`frontend/src/pages/OrderBuilderPage.tsx`)
- Orders list + details with live tracking (`frontend/src/pages/OrdersPage.tsx`, `frontend/src/pages/OrderDetailPage.tsx`)
- Group orders (create/join/checkout) (`frontend/src/pages/GroupOrderPage.tsx`)
- Restaurant staff dashboard (progress orders) (`frontend/src/pages/StaffDashboardPage.tsx`)
- Admin dashboard (metrics, coupons, analytics) (`frontend/src/pages/AdminDashboardPage.tsx`)

Dev server proxies API and WebSocket to the backend (`frontend/vite.config.ts`). PWA manifest included.

## Configuration

Backend (server)
- `PORT` (default `3000`)
- `FRONTEND_DIST` (directory to serve static UI from; default auto-detects `frontend/dist` when present)
- `DEMO_ADMIN_KEY` (admin API key for promotions/analytics; default `demo-admin-key`)

Frontend (Vite) — optional; defaults point to the same origin
- `VITE_API_BASE_URL` (default `http://localhost:3000/api/v1` via origin)
- `VITE_SOCKET_URL` (default `http://localhost:3000` via origin)

Example `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

## Observability & Security

- Request IDs: every request receives/returns `x-request-id` and logs include it.
- Metrics: `GET /api/v1/metrics` exposes counters (orders_created, payments_paid/failed, dispatch_assignments, group_orders_created/checked_out, coupons_redeemed, ws_connections).
- Security: Helmet, compression, morgan logging, and rate limiting on `/api/*`.
- CORS: permissive for local dev; restrict in production.
- Errors: Zod validation and domain errors returned as structured JSON.
- SPA fallback: non-API routes serve `index.html` when the UI is built.

## Docker (Local build -> Upload to NAS)

Multi-stage Dockerfile builds frontend and backend, then runs as a single service serving both API and UI.

Build (x86_64):
```bash
docker build -t food-ordering-tracking:latest .
```

Build (ARM64, common for NAS) using buildx:
```bash
docker buildx create --use   # first time only
docker buildx build --platform linux/arm64 -t food-ordering-tracking:arm64 --load .
```

Test locally:
```bash
docker run -d --name food-demo -p 3000:3000 \
  -e NODE_ENV=production -e DEMO_ADMIN_KEY=demo-admin-key \
  food-ordering-tracking:latest
# open http://localhost:3000
```

Export -> upload -> load on NAS:
```bash
# export
docker save -o food-demo_arm64.tar food-ordering-tracking:arm64
# on NAS
docker load -i /path/to/food-demo_arm64.tar
# run
docker run -d --name food-demo -p 3000:3000 \
  -e NODE_ENV=production -e DEMO_ADMIN_KEY=demo-admin-key \
  food-ordering-tracking:arm64
```

Compose (optional): see `docker-compose.yml` for a ready-to-use service exposing port 3000.

## Troubleshooting

- Root `/` returns 404:
  - Build frontend first (`npm run build:frontend`) or use dev mode (`npm run dev:all`).
  - Ensure server logs "Serving frontend static assets ...".
- Windows npm issues (locks/EPERM or PATH shims):
  - Try `npm run setup`, or install separately (`npm ci --ignore-scripts` + `npm --prefix frontend ci`).
  - Prefer Command Prompt (`cmd`) over PowerShell for npm on Windows.
  - If PATH shim is corrupted, run npm via: `node "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js" run setup`.
- WebSocket not connecting:
  - Access frontend via the same host/port as the API, or set `VITE_SOCKET_URL`.
- Ports in use:
  - Change server `PORT` or Vite `--port` (e.g. 5174).

## Roadmap

- Replace in-memory store with Postgres/Redis and a proper persistence layer
- Real payment/courier integrations
- Automated tests (unit/integration/E2E) and CI
- Richer analytics & dashboards

---

- Server entrypoint: `src/server.ts`
- Feature modules: `src/apps/**`
- In-memory data & seed: `src/infrastructure/data-store.ts`
- Sample API flows: `docs/sample-requests.http`
- React app: `frontend/`

## License

This project is open source under the MIT License. See `LICENSE` for details.

Copyright (c) 2025 Li Yanpei
