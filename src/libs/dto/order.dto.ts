import { z } from "zod";

export const OrderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  qty: z.number().int().positive(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  paymentChannel: z.enum(["credit_card", "apple_pay", "google_pay"]),
  items: z.array(OrderItemInputSchema).min(1),
});

export const OrderTransitionSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "PREPARING",
    "PICKED_UP",
    "DELIVERING",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REFUNDED",
  ]),
});

export const PaymentTransitionSchema = z.object({
  status: z.enum(["PAID", "FAILED", "REFUNDED"]),
});
