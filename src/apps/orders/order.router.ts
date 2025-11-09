import { Router } from "express";
import { z } from "zod";
import { OrderService } from "./order.service";
import { CreateOrderSchema, OrderTransitionSchema, PaymentTransitionSchema } from "../../libs/dto/order.dto";
import { AppError } from "../../libs/common/errors";
import { DeliveryService } from "../delivery/delivery.service";
import { PaymentService } from "../payment/payment.service";
import { findDeliveryByOrderId, dataStore } from "../../infrastructure/data-store";

const router = Router();
const orderService = new OrderService();
const deliveryService = new DeliveryService();
const paymentService = new PaymentService();

const withDetails = (order: ReturnType<OrderService["getOrder"]>) => {
  const delivery = findDeliveryByOrderId(order.id);
  const payment = paymentService.findByOrder(order.id);
  const restaurant = dataStore.restaurants.get(order.restaurantId);
  const items = order.items.map((it) => {
    const menu = dataStore.menuItems.get(it.menuItemId);
    return menu ? { ...it, menuName: menu.name } : it;
  });
  return {
    ...order,
    items,
    restaurant,
    delivery,
    payment,
  };
};

router.get("/", (_req, res) => {
  const orders = orderService.listOrders().map(withDetails);
  res.json(orders);
});

router.get("/:orderId", (req, res, next) => {
  try {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const order = orderService.getOrder(orderId);
    res.json(withDetails(order));
  } catch (error) {
    next(error);
  }
});

router.post("/", (req, res, next) => {
  try {
    const input = CreateOrderSchema.parse(req.body);
    const order = orderService.createOrder(input);
    res.status(201).json(withDetails(order));
  } catch (error) {
    next(error);
  }
});

router.post("/:orderId/transition", (req, res, next) => {
  try {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const { status } = OrderTransitionSchema.parse(req.body);
    const order = orderService.transitionOrder(orderId, status);
    res.json(withDetails(order));
  } catch (error) {
    next(error);
  }
});

router.post("/:orderId/payments", (req, res, next) => {
  try {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const { status } = PaymentTransitionSchema.parse(req.body);
    const order = orderService.transitionPayment(orderId, status);
    res.json(withDetails(order));
  } catch (error) {
    next(error);
  }
});

router.post("/:orderId/delivery/start", (req, res, next) => {
  try {
    const orderId = z.string().uuid().parse(req.params.orderId);
    deliveryService.startTracking(orderId);
    res.json({ orderId, message: "Delivery tracking started" });
  } catch (error) {
    next(error);
  }
});

export { router as orderRouter };
