import { Router } from "express";
import { z } from "zod";
import { UserService } from "./user.service";

const router = Router();
const userService = new UserService();

router.get("/", (_req, res) => {
  res.json(userService.listUsers());
});

router.get("/:userId", (req, res, next) => {
  try {
    const userId = z.string().uuid().parse(req.params.userId);
    res.json(userService.getUser(userId));
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };
