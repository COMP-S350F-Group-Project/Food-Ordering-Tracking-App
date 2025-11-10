import { z } from "zod";

export const CouponCreateSchema = z.object({
  code: z.string().trim().min(3).max(64),
  type: z.enum(["PERCENT", "AMOUNT"]),
  value: z.number().positive(),
  restaurantId: z.string().uuid().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  usageLimit: z.number().int().positive().optional(),
  active: z.boolean().default(true),
});

export const CouponValidateSchema = z.object({
  restaurantId: z.string().uuid(),
  total: z.number().nonnegative(),
  code: z.string().trim().min(1),
});

