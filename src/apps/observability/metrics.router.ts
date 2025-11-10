import { Router } from "express";
import { metrics } from "./metrics";

const router = Router();

router.get("/metrics", (_req, res) => {
  res.json(metrics.snapshot());
});

export { router as observabilityRouter };

