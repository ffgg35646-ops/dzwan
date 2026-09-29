
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import {
  listPriceOverrides,
  createPriceOverride,
  updatePriceOverride,
  deletePriceOverride,
} from "../controllers/delivery-price-override.controller.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireAdmin,
  listPriceOverrides,
);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createPriceOverride,
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  updatePriceOverride,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deletePriceOverride,
);

export default router;
