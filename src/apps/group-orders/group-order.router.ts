import { Router } from "express";
import { z } from "zod";
import { GroupOrderService } from "./group-order.service";
import { GroupOrderAddItemsSchema, GroupOrderCheckoutSchema, GroupOrderCreateSchema } from "../../libs/dto/group-order.dto";

const router = Router();
const service = new GroupOrderService();

router.get("/", (_req, res) => {
  res.json(service.list());
});

router.post("/", (req, res, next) => {
  try {
    const input = GroupOrderCreateSchema.parse(req.body);
    const group = service.create(input.hostUserId, input.restaurantId, input.expiresAt);
    res.status(201).json(group);
  } catch (err) {
    next(err);
  }
});

router.get("/:groupOrderId", (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.groupOrderId);
    const group = service.get(id);
    res.json(group);
  } catch (err) {
    next(err);
  }
});

router.post("/:groupOrderId/participants", (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.groupOrderId);
    const input = GroupOrderAddItemsSchema.parse(req.body);
    const group = service.addItems(id, input.userId, input.items);
    res.json(group);
  } catch (err) {
    next(err);
  }
});

router.post("/:groupOrderId/checkout", (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.groupOrderId);
    const input = GroupOrderCheckoutSchema.parse(req.body);
    const order = service.checkout(id, input.paymentChannel, input.couponCode);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

export { router as groupOrderRouter };

