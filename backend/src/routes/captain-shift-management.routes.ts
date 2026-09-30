import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

import {
  createShift,
  listAvailableShifts,
  listAdminShifts,
  updateShift,
  deleteShift,
  selectWeeklyShift,
  changeWeeklyShift,
  checkCurrentShift,
} from "../controllers/captain-shift-management.controller.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createShift
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  updateShift
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteShift
);

router.get(
  "/admin",
  requireAuth,
  requireAdmin,
  listAdminShifts
);

router.get(
  "/available",
  requireAuth,
  listAvailableShifts
);

router.post(
  "/weekly/select",
  requireAuth,
  selectWeeklyShift
);

router.post(
  "/weekly/change",
  requireAuth,
  changeWeeklyShift
);

router.get(
  "/current/check",
  requireAuth,
  checkCurrentShift
);

export default router;
