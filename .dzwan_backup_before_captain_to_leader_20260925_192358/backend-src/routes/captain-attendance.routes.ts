import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  checkIn,
  checkOut,
  myAttendance,
  adminAttendance,
} from "../controllers/captain-attendance.controller.js";

const router = Router();

router.post("/check-in", requireAuth, checkIn);
router.post("/check-out", requireAuth, checkOut);
router.get("/me", requireAuth, myAttendance);
router.get("/", requireAuth, requireAdmin, adminAttendance);

export default router;
