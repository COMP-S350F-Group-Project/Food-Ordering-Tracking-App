import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import http from "node:http";
import { Server } from "socket.io";
import { ZodError } from "zod";
import { orderRouter } from "./apps/orders/order.router";
import { catalogRouter } from "./apps/catalog/catalog.router";
import { deliveryRouter } from "./apps/delivery/delivery.router";
import { userRouter } from "./apps/users/user.router";
import { AppError } from "./libs/common/errors";
import { seedData } from "./infrastructure/data-store";
import { trackingGateway } from "./apps/tracking/tracking.gateway";
import { logger } from "./libs/common/logger";
import fs from "node:fs";
import path from "node:path";

// Seed mock data for demo and local development
seedData();

const app = express();

// Trust the first proxy (needed for correct IPs when behind reverse proxies)
app.set("trust proxy", 1);

// Security + perf middleware suitable for real deployments
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Allow CORS in dev; in prod, you'd narrow this to known origins
app.use(cors());
app.use(express.json());

// Lightweight API rate limiting (protects public demo endpoints)
app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300, // 300 req/min per IP
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/catalog", catalogRouter);
app.use("/api/v1/deliveries", deliveryRouter);
app.use("/api/v1/users", userRouter);

// Serve frontend build if available (single-server mode)
const FRONTEND_DIST = process.env.FRONTEND_DIST ?? path.resolve(process.cwd(), "frontend/dist");
if (fs.existsSync(FRONTEND_DIST)) {
  logger.info("Serving frontend static assets", { dir: FRONTEND_DIST });
  // Do not auto-serve index.html for all; we'll control SPA fallback below.
  app.use(express.static(FRONTEND_DIST, { index: false }));
  // Express v5: avoid "*"; use a regex route that excludes API, health, and socket paths
  app.get(/^(?!\/(api|healthz|socket\.io)\/).*/, (req, res, next) => {
    const accept = String(req.headers.accept ?? "");
    if (!accept.includes("text/html")) return next();
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  logger.warn("Frontend dist not found; running in API-only mode", { dir: FRONTEND_DIST });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "ValidationError",
      message: err.message,
      issues: err.issues,
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
  }
  logger.error("Unhandled error", { err });
  return res.status(500).json({ error: "InternalServerError", message: "Unexpected error" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  logger.info("Socket connected", { socketId: socket.id });
  socket.on("joinOrder", (payload: { orderId: string }) => {
    if (!payload?.orderId) return;
    const room = `order:${payload.orderId}`;
    socket.join(room);
    logger.info("Socket joined order room", { socketId: socket.id, room });
  });
  socket.on("disconnect", () => {
    logger.info("Socket disconnected", { socketId: socket.id });
  });
});

trackingGateway.onUpdate((update) => {
  const room = `order:${update.orderId}`;
  io.to(room).emit("tracking", update);
});

const PORT = Number(process.env.PORT || 3000);

server.listen(PORT, () => {
  logger.info(`API server listening on http://localhost:${PORT}`);
});
