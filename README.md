# Food Ordering & Live Tracking (TypeScript)

End-to-end demo of a modern food ordering system with real-time delivery tracking. The repository includes a TypeScript Express API with Socket.IO and a React/Vite frontend. It is self-contained (in-memory data), fast to run locally, and structured to scale into production.

## Highlights

- Domain model: users, restaurants, menu items, orders, payments, deliveries, courier locations (`src/infrastructure/data-store.ts`).
- Clear service boundaries: catalog, users, orders, payments, delivery, tracking (`src/apps/*`).
- Robust workflows: order and payment state machines with validation (Zod DTOs in `src/libs/dto/*`).
- Real-time tracking: simulated courier movement with Socket.IO broadcasts (`src/apps/tracking/tracking.gateway.ts`, `src/server.ts`).
- Production-minded API server: Express v5, Helmet, compression, rate limiting, structured error responses.
- Companion UI: React + Vite app in `frontend/` to browse restaurants, create orders, and watch live updates.
- Ready-to-run examples: `docs/sample-requests.http` for quick API exploration.

## Tech Stack

- Backend: Node.js, TypeScript, Express v5, Socket.IO, Zod, Day.js
- Frontend: React, Vite, React Router, Socket.IO client, TypeScript
- Tooling: ts-node-dev, TypeScript compiler, ESLint, Concurrently

## Project Structure

```
src/
  apps/
    catalog/           # Restaurant and menu APIs
    delivery/          # Delivery orchestration + tracking loop
    orders/            # Order creation and state transitions
    payment/           # Payment lifecycle management
    tracking/          # Simple event gateway for Socket.IO
    users/             # User listing and lookup
  infrastructure/
    data-store.ts      # In-memory store and seed data
  libs/
    common/            # Errors, logger, shared types
    dto/               # Zod DTOs and validators
  server.ts            # Express/Socket.IO bootstrap
frontend/              # React + Vite UI
docs/sample-requests.http
```

## Quick Start

Prerequisites: Node.js 18+ and npm.

1. Install dependencies (root and frontend):

```bash
npm install
```

2. Start the API (http://localhost:3000):

```bash
npm run dev        # or: npm run dev:backend
```

3. Start the frontend UI (http://localhost:5173):

```bash
npm run dev:frontend
```

Or run both concurrently from the root:

```bash
npm run dev:all
```

On start, the API seeds sample data (customer, courier, restaurants, menu items, orders, payment, initial delivery) so the system is immediately usable.

## Build & Single-Server Mode

Build backend and frontend, then serve the production UI from Express:

```bash
npm run build:all
npm start
# open http://localhost:3000
```

By default, static assets are served from `frontend/dist`. Override with `FRONTEND_DIST=/custom/path`.

## Configuration

- Backend (server):
  - `PORT` (default `3000`)
  - `FRONTEND_DIST` (directory to serve static UI from; default `frontend/dist` if present)
- Frontend (Vite): define in `frontend/.env.local`
  - `VITE_API_BASE_URL` (default `http://localhost:3000/api/v1` via origin)
  - `VITE_SOCKET_URL` (default `http://localhost:3000` via origin)

Example `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

## API Overview

Base URL: `http://localhost:3000`

- `GET /healthz` — Health probe
- `GET /api/v1/users` — List users
- `GET /api/v1/catalog/restaurants` — List restaurants
- `GET /api/v1/catalog/restaurants/:restaurantId/menu` — Menu and stock
- `POST /api/v1/orders` — Create order
- `POST /api/v1/orders/:orderId/payments` — Update payment (`PAID`, `FAILED`, `REFUNDED`)
- `POST /api/v1/orders/:orderId/transition` — Advance order (`CONFIRMED`, `PREPARING`, `PICKED_UP`, `DELIVERING`, `DELIVERED`, `COMPLETED`, etc.)
- `POST /api/v1/orders/:orderId/delivery/start` — Begin simulated tracking
- `GET /api/v1/deliveries/:orderId` — Current delivery snapshot

See runnable examples in `docs/sample-requests.http`.

### Real-time Events (Socket.IO)

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

The UI provides:

- Overview page with key actions
- Restaurant browser with live stock (`frontend/src/pages/RestaurantsPage.tsx`)
- Order builder (`frontend/src/pages/OrderBuilderPage.tsx`)
- Orders list (`frontend/src/pages/OrdersPage.tsx`)
- Order details with controls and live tracking (`frontend/src/pages/OrderDetailPage.tsx`)

Dev server proxies API and WebSocket to the backend (`frontend/vite.config.ts`).

## Development Scripts

Root scripts:

- `dev` / `dev:backend` — Start API with hot reload
- `dev:frontend` — Start Vite dev server
- `dev:all` — Run backend and frontend together
- `build` — Compile backend to `dist/`
- `build:frontend` — Build UI
- `build:all` — Build backend and UI
- `start` — Run compiled API
- `start:all` — Build everything and start API

Frontend scripts (`frontend/`): `dev`, `build`, `preview`, `lint`.

## Security & Operational Notes

- Express v5 with Helmet, compression, request logging (morgan) and basic rate limiting on `/api/*`.
- CORS is permissive for local dev; restrict origins in production.
- Centralized error handling with consistent JSON shapes for validation and domain errors.
- SPA fallback serves `index.html` for non-API routes when the UI is built.

## Roadmap

- Replace in-memory store with Postgres/Redis and persistence layer.
- Integrate real payment gateways and courier APIs.
- Add automated tests (unit/integration/E2E) and CI.

## Troubleshooting

- Port already in use: set `PORT=3001` (server) or `PORT=5174` (frontend) or stop the conflicting process.
- WebSocket not connecting: ensure you access the frontend over the same host/port as the API or set `VITE_SOCKET_URL`.
- No UI at `/`: build the frontend first (`npm run build:frontend`) or run both in dev (`npm run dev:all`).

## Repository Guide

- `src/server.ts` — Express + Socket.IO setup and routing
- `src/apps/**` — Feature modules (orders, delivery, payment, catalog, users, tracking)
- `src/infrastructure/data-store.ts` — In-memory store and seed data
- `docs/sample-requests.http` — Copy-ready API scenarios
- `frontend/` — React/Vite app with pages for overview, catalog, order creation, and live tracking
