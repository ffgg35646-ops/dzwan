import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

import {
  addWorkArea,
  listWorkAreas,
  toggleWorkArea,
  deleteWorkArea,
} from "../controllers/captain-work-area.controller.js";

import {
  defaultCoverage,
  captainSearch,
  captainCoverage,
  addArea,
  removeArea,
  applyDefault,
} from "../controllers/captain-coverage.controller.js";

const router = Router();

/* تغطية المناطق */
router.get(
  "/coverage/default",
  requireAuth,
  requireAdmin,
  defaultCoverage,
);

router.put(
  "/coverage/default",
  requireAuth,
  requireAdmin,
  defaultCoverage,
);

router.get(
  "/coverage/captains",
  requireAuth,
  requireAdmin,
  captainSearch,
);

router.get(
  "/coverage/captains/:captainId",
  requireAuth,
  requireAdmin,
  captainCoverage,
);

router.post(
  "/coverage/captains/:captainId/areas",
  requireAuth,
  requireAdmin,
  addArea,
);

router.delete(
  "/coverage/captains/:captainId/areas/:workAreaId",
  requireAuth,
  requireAdmin,
  removeArea,
);

router.post(
  "/coverage/captains/:captainId/apply-default",
  requireAuth,
  requireAdmin,
  applyDefault,
);

/* مناطق العمل القديمة */
router.post("/me", requireAuth, addWorkArea);
router.get("/me", requireAuth, listWorkAreas);

router.post(
  "/:captainId",
  requireAuth,
  requireAdmin,
  addWorkArea,
);

router.get(
  "/:captainId",
  requireAuth,
  requireAdmin,
  listWorkAreas,
);

router.patch(
  "/:id/toggle",
  requireAuth,
  requireAdmin,
  toggleWorkArea,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteWorkArea,
);

export default router;
