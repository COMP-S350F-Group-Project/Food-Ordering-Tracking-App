import { Router } from "express";
import { z } from "zod";
import { CouponService } from "./coupon.service";
import { CouponCreateSchema, CouponValidateSchema } from "../../libs/dto/promotion.dto";

const router = Router();
const service = new CouponService();

// Simple admin-key guard for demo
const requireAdminKey = (req: any, res: any, next: any) => {
  const key = req.get("x-api-key");
  const expected = process.env.DEMO_ADMIN_KEY || "demo-admin-key";
  if (key !== expected) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing or invalid admin API key" });
  }
  next();
};

router.get("/coupons", (_req, res) => {
  res.json(service.list());
});

router.post("/coupons", requireAdminKey, (req, res, next) => {
  try {
    const input = CouponCreateSchema.parse(req.body);
    const coupon = service.create({ ...input });
    res.status(201).json(coupon);
  } catch (err) {
    next(err);
  }
});

router.post("/validate", (req, res, next) => {
  try {
    const input = CouponValidateSchema.parse(req.body);
    const result = service.validate(input.restaurantId, input.total, input.code);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as promotionRouter };

