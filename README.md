# Food Ordering & Tracking App (TypeScript Backend Demo)

This repository hosts a TypeScript backend prototype that realises the specification for the Food Ordering & Tracking course project. It focuses on the engineering aspects requested in the brief — requirements execution, modular architecture, implementation, validation hooks, and evolution paths — while remaining lightweight enough to demo without external dependencies.

## Features at a Glance

- Seeded data model reflecting customers, restaurants, menu items, orders, payments, deliveries, and courier locations (`src/infrastructure/data-store.ts`).
- Modular services for requirements-aligned capabilities:
  - Users & catalog (`src/apps/users`, `src/apps/catalog`)
  - Orders, payments, and delivery orchestration with state machines (`src/apps/orders`, `src/apps/payment`, `src/apps/delivery`)
  - Real-time order tracking via WebSocket broadcast (`src/apps/tracking/tracking.gateway.ts`, `src/server.ts`)
- REST API covering the must-have flows: create order, manage payment state, advance order lifecycle, and observe delivery progress.
- In-memory telemetry simulation that periodically publishes courier coordinates once a delivery starts.
- Sample HTTP workflows (`docs/sample-requests.http`) for quick demos or inclusion in accompanying PPT/report.
- **NEW** React/TypeScript frontend in `frontend/` for visualising catalog, creating orders, and watching live delivery updates.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm (bundled with Node.js)

### Install & Run (Backend API)

```bash
npm install
npm run dev      # or npm run dev:backend — starts the API server with hot reload on http://localhost:3000
```

Build for production (outputs compiled JS in `dist/`):

```bash
npm run build
npm start
```

When the server boots it seeds sample data (customer, courier, restaurants, menu items, and an in-progress delivery) for immediate testing.

### Frontend Companion (Vite + React)

```bash
cd frontend
npm install
npm run dev      # launches the UI on http://localhost:5173 by default
```

The UI expects the backend API to run locally on port 3000. Override endpoints via environment variables in `frontend/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

To create a production build of the UI:

```bash
cd frontend
npm run build
```

### Start Backend & Frontend Together

From the project root you can spin up both servers with one command (requires the steps above at least once so dependencies are installed):

```bash
npm run dev:all
```

This runs the backend on port 3000 and the Vite dev server on port 5173 concurrently. Stop both with `Ctrl+C`.

### Single-Server (API + Frontend)

You can build both backend and frontend and serve the UI from the same Express server:

```bash
npm install
npm run build:all
npm start
# open http://localhost:3000
```

The server will automatically serve `frontend/dist` if it exists (override with `FRONTEND_DIST=/custom/path`).

### 本地数据库假设（In-memory）

本项目默认使用内存数据存储（即“本地数据库假设”），无需安装任何外部数据库即可运行。数据会在服务启动时自动播种（seed），并在进程退出后丢失（便于演示和开发）。

- 启动单进程（API + 前端）：
  ```bash
  npm install
  npm run build:all
  npm start
  # 打开 http://localhost:3000
  ```
- 若需要自定义前端构建目录，可设置环境变量：
  ```bash
  FRONTEND_DIST=/your/custom/path npm start
  ```

> 提示：未知的 API 路由不会被 SPA 回退吞掉，浏览器直达非 /api 路径时仍会返回前端的 index.html。

## API Surface

Base URL: `http://localhost:3000`

| Method | Endpoint                                         | Purpose                                                               |
| ------ | ------------------------------------------------ | --------------------------------------------------------------------- |
| `GET`  | `/healthz`                                       | Service health probe                                                  |
| `GET`  | `/api/v1/users`                                  | List seeded users (customer/courier/admin)                            |
| `GET`  | `/api/v1/catalog/restaurants`                    | Retrieve restaurants                                                  |
| `GET`  | `/api/v1/catalog/restaurants/:restaurantId/menu` | Menu items & stock                                                    |
| `POST` | `/api/v1/orders`                                 | Create an order (validates stock & NFR hooks)                         |
| `POST` | `/api/v1/orders/:orderId/payments`               | Transition payment status (`PAID`, `FAILED`, `REFUNDED`)              |
| `POST` | `/api/v1/orders/:orderId/transition`             | Advance order workflow (e.g., `PREPARING`, `DELIVERING`, `COMPLETED`) |
| `POST` | `/api/v1/orders/:orderId/delivery/start`         | Kick off simulated real-time tracking                                 |
| `GET`  | `/api/v1/deliveries/:orderId`                    | Delivery snapshot (courier, ETA, status)                              |

Refer to `docs/sample-requests.http` for executable examples that can be pasted into REST clients such as VS Code REST Client, Insomnia, or Postman.

## Real-time Tracking

The server exposes a Socket.IO endpoint on the same base URL. To subscribe to tracking events:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");
socket.emit("joinOrder", { orderId: "..." }); // use the order id from the REST response
socket.on("tracking", (update) => {
  console.log("Tracking update:", update);
});
```

Trigger tracking via `POST /api/v1/orders/:orderId/delivery/start`. The backend simulates courier movement and broadcasts `tracking` payloads (lat/lng, ETA, status) every ~2 seconds until delivery completion.

## Architecture Notes

- **Requirements Engineering**: Encoded through validation schemas (`src/libs/dto`) and NFR-friendly checks (stock, restaurant availability, idempotent payment handling).
- **System Design**: Layered folders (`src/apps`, `src/libs`, `src/infrastructure`) mirror the proposed services (orders, delivery, payment, catalog, users).
- **Implementation**: Type-safe services capture state machines and idempotent flows (`src/apps/orders/order.service.ts`, `src/apps/payment/payment.service.ts`, `src/apps/delivery/delivery.service.ts`).
- **Verification Hooks**: Build passes strict TypeScript checks (`npm run build`). Sample request collection and deterministic seed data enable repeatable manual tests.
- **Evolution**: Service boundaries, event gateway (`src/apps/tracking`) and logger stubs prepare for Kafka/Webhook integration, external persistence, and CI/CD expansion.

## Next Steps & Extensions

1. Persist entities in PostgreSQL/Redis following the schema outlined in the project brief.
2. Plug in real payment providers and couriers by substituting the in-memory adapters with external APIs.
3. Extend the testing pyramid (unit/integration/E2E) using Jest + Supertest and Cypress/Appium for mobile flows.

## Repository Guide

- `src/server.ts` – Express + Socket.IO bootstrap, error handling, and route registration.
- `src/apps/**` – Feature modules aligned with the architectural blueprint.
- `src/infrastructure/data-store.ts` – In-memory store & seeders modelling the key tables (`orders`, `order_items`, `deliveries`, etc.).
- `docs/sample-requests.http` – Copy-ready demo scenarios for PPT/live presentation.
- `frontend/` – React/Vite companion UI with pages for overview, catalog browsing, order creation, and real-time tracking.

## 前后端一起跑（开发，支持手机访问）

```bash
npm install
npm run dev:all
# 在手机同一局域网中打开： http://<你的电脑IP>:5173
```

Vite 已开启局域网访问并代理到 http://localhost:3000。若端口占用，可设置前端 PORT 环境变量（如 5174）。

在生产或统一端口下，可限制跨域来源（建议在部署时设置）：

```bash
# 允许前端来源
CORS_ORIGIN=https://your.domain.com
# 反向代理下启用
TRUST_PROXY=1
```

## 单进程部署（生产，移动端自适应）

```bash
npm run start:all
# 浏览器/手机： http://<主机IP>:3000
```

后端会托管 frontend/dist（可用 FRONTEND_DIST 覆盖路径）。UI 与表格在移动端自动适配，导航支持折叠。

This setup should give the team a concrete base to showcase during the course presentation while leaving ample room for future enhancements outlined in the submission package.
# Food-Ordering-Tracking-App
