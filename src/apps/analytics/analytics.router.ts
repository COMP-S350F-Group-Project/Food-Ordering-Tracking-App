import { Router } from "express";
import { AnalyticsService } from "./analytics.service";

const router = Router();
const service = new AnalyticsService();

const requireAdminKey = (req: any, res: any, next: any) => {
  const key = req.get("x-api-key");
  const expected = process.env.DEMO_ADMIN_KEY || "demo-admin-key";
  if (key !== expected) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing or invalid admin API key" });
  }
  next();
};

router.get("/summary", requireAdminKey, (_req, res) => {
  res.json(service.summary());
});

router.get("/forecast", requireAdminKey, (req, res) => {
  const minutes = Number(req.query.minutes ?? 60);
  res.json(service.forecastOrders(Number.isFinite(minutes) ? minutes : 60));
});

export { router as analyticsRouter };

