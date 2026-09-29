import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import * as c from "../controllers/requirements-30-46.controller.js";

const router = Router();

router.get("/orders/:orderId/timeline", requireAuth, c.orderTimeline);
router.post("/orders/:orderId/events", requireAuth, c.event);
router.post("/orders/:orderId/reassign", requireAuth, requireAdmin, c.reassign);
router.post("/orders/:orderId/cancel", requireAuth, c.cancel);

router.get("/stuck-orders", requireAuth, requireAdmin, c.stuck);

router.post("/emergencies", requireAuth, c.emergency);
router.patch("/emergencies/:id", requireAuth, requireAdmin, c.emergencyStatus);

router.post("/security-log", requireAuth, c.security);

router.get("/versions/:app", c.version);

router.get("/settings", requireAuth, requireAdmin, c.settings);
router.put("/settings", requireAuth, requireAdmin, c.updateSetting);

router.get("/maintenance", c.maintenance);

router.get("/geofence/resolve", requireAuth, c.geofence);

router.post("/complaints", requireAuth, c.complaint);

export default router;
