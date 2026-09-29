import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  getDispatchSettings,
  updateDispatchSettings,
  createCaptainShift,
  listCaptainShifts,
  deleteCaptainShift,
  listDispatchQueue,
  listAssignments,
  manualDispatch,
  captainAcceptAssignment,
  processDispatch,
} from "../controllers/dispatch.controller.js";

const router = Router();

router.get(
  "/settings",
  requireAuth,
  requireAdmin,
  getDispatchSettings,
);

router.patch(
  "/settings",
  requireAuth,
  requireAdmin,
  updateDispatchSettings,
);

router.post(
  "/shifts",
  requireAuth,
  requireAdmin,
  createCaptainShift,
);

router.get(
  "/shifts",
  requireAuth,
  requireAdmin,
  listCaptainShifts,
);

router.delete(
  "/shifts/:id",
  requireAuth,
  requireAdmin,
  deleteCaptainShift,
);

router.get(
  "/queue",
  requireAuth,
  requireAdmin,
  listDispatchQueue,
);

router.get(
  "/assignments",
  requireAuth,
  requireAdmin,
  listAssignments,
);

router.post(
  "/orders/:id/dispatch",
  requireAuth,
  requireAdmin,
  manualDispatch,
);

router.post(
  "/orders/:id/accept",
  requireAuth,
  captainAcceptAssignment,
);

router.post(
  "/process",
  requireAuth,
  requireAdmin,
  processDispatch,
);

export default router;
