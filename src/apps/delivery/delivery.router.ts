import { Router } from "express";
import { z } from "zod";
import { DeliveryService } from "./delivery.service";
import { ManualLocationUpdateSchema } from "../../libs/dto/delivery.dto";

const router = Router();
const deliveryService = new DeliveryService();

router.get("/:orderId", (req, res, next) => {
  try {
    const orderId = z.string().uuid().parse(req.params.orderId);
    const delivery = deliveryService.getDelivery(orderId);
    res.json(delivery);
  } catch (error) {
    next(error);
  }
});

router.post("/location", (req, res, next) => {
  try {
    const input = ManualLocationUpdateSchema.parse(req.body);
    deliveryService.recordLocation(input);
    res.status(202).json({ message: "Location update accepted" });
  } catch (error) {
    next(error);
  }
});

export { router as deliveryRouter };
