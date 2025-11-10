import { randomUUID } from "node:crypto";
import dayjs from "dayjs";
import { dataStore } from "../../infrastructure/data-store";
import { Coupon } from "../../libs/common/types";

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  finalTotal: number;
  reason?: string;
  coupon?: Coupon;
}

export class CouponService {
  list(): Coupon[] {
    return Array.from(dataStore.coupons.values());
  }

  create(input: Omit<Coupon, "id" | "createdAt" | "usedCount">): Coupon {
    const id = randomUUID();
    const coupon: Coupon = { id, createdAt: new Date(), usedCount: 0, ...input };
    dataStore.coupons.set(id, coupon);
    return coupon;
  }

  findByCode(code: string): Coupon | undefined {
    return Array.from(dataStore.coupons.values()).find((c) => c.code.toUpperCase() === code.toUpperCase());
  }

  validate(restaurantId: string, total: number, code: string): CouponValidationResult {
    const coupon = this.findByCode(code);
    if (!coupon) return { valid: false, discount: 0, finalTotal: total, reason: "Coupon not found" };
    return this.validateOnly(restaurantId, total, coupon);
  }

  apply(restaurantId: string, total: number, code: string): CouponValidationResult {
    const coupon = this.findByCode(code);
    if (!coupon) return { valid: false, discount: 0, finalTotal: total, reason: "Coupon not found" };
    // Reuse validate to check
    const v = this.validateOnly(restaurantId, total, coupon);
    if (!v.valid || !v.coupon) return v;
    const discount = v.discount;
    const finalTotal = Math.max(total - discount, 0);
    // increment usage count for demo
    v.coupon.usedCount = (v.coupon.usedCount ?? 0) + 1;
    dataStore.coupons.set(v.coupon.id, v.coupon);
    return { valid: true, discount, finalTotal, coupon: v.coupon };
  }

  private validateOnly(
    restaurantId: string,
    total: number,
    coupon: Coupon,
  ): CouponValidationResult {
    if (!coupon.active) return { valid: false, discount: 0, finalTotal: total, reason: "Coupon inactive" };
    if (coupon.validFrom && dayjs().isBefore(coupon.validFrom))
      return { valid: false, discount: 0, finalTotal: total, reason: "Coupon not yet valid" };
    if (coupon.validTo && dayjs().isAfter(coupon.validTo))
      return { valid: false, discount: 0, finalTotal: total, reason: "Coupon expired" };
    if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit)
      return { valid: false, discount: 0, finalTotal: total, reason: "Usage limit reached" };
    if (coupon.restaurantId && coupon.restaurantId !== restaurantId)
      return { valid: false, discount: 0, finalTotal: total, reason: "Coupon not valid for restaurant" };
    if (coupon.minOrderAmount && total < coupon.minOrderAmount)
      return { valid: false, discount: 0, finalTotal: total, reason: "Order below minimum amount" };

    let discount = 0;
    if (coupon.type === "PERCENT") {
      discount = Math.round((total * coupon.value) / 100 * 100) / 100;
    } else {
      discount = coupon.value;
    }
    const finalTotal = Math.max(total - discount, 0);
    return { valid: true, discount, finalTotal, coupon };
  }
}
