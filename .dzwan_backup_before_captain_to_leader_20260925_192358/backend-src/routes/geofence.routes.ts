import { Router } from "express";
import {
  listGeofences,
  createGeofence,
  updateGeofence,
  deleteGeofence,
} from "../controllers/geofence.controller.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listGeofences);
router.post("/", createGeofence);
router.patch("/:id", updateGeofence);
router.delete("/:id", deleteGeofence);

export default router;
