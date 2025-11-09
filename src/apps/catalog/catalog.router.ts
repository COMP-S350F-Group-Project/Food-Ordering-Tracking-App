import { Router } from "express";
import { z } from "zod";
import { CatalogService } from "./catalog.service";

const router = Router();
const catalogService = new CatalogService();

router.get("/restaurants", (_req, res) => {
  res.json(catalogService.listRestaurants());
});

router.get("/restaurants/:restaurantId", (req, res, next) => {
  try {
    const restaurantId = z.string().uuid().parse(req.params.restaurantId);
    const restaurant = catalogService.getRestaurant(restaurantId);
    const menu = catalogService.listMenuItems(restaurantId);
    res.json({ ...restaurant, menu });
  } catch (error) {
    next(error);
  }
});

router.get("/restaurants/:restaurantId/menu", (req, res, next) => {
  try {
    const restaurantId = z.string().uuid().parse(req.params.restaurantId);
    res.json(catalogService.listMenuItems(restaurantId));
  } catch (error) {
    next(error);
  }
});

export { router as catalogRouter };
