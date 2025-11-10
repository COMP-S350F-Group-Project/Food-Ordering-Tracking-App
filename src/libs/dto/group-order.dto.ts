import { z } from "zod";

export const GroupOrderCreateSchema = z.object({
  hostUserId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  expiresAt: z.coerce.date().optional(),
});

export const GroupOrderAddItemsSchema = z.object({
  userId: z.string().uuid(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        qty: z.number().int().positive(),
        options: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1),
});

export const GroupOrderCheckoutSchema = z.object({
  paymentChannel: z.enum([
    "credit_card",
    "apple_pay",
    "google_pay",
    "paypal",
    "cash_on_delivery",
    "wechat_pay",
  ]),
  couponCode: z.string().trim().min(1).optional(),
});

