import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";
import {
  assignCaptain,
  createOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
);

router.get("/", listOrders);
router.post("/", createOrder);
router.get("/:id", getOrder);
router.patch("/:id/status", updateOrderStatus);
router.post("/:id/assign-captain", assignCaptain);

export default router;
