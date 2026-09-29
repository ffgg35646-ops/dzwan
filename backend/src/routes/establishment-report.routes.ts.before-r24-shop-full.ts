import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { getEstablishmentReportController } from "../controllers/establishment-report.controller.js";

const router = Router();

router.get(
  "/establishments/:establishmentId",
  requireAuth,
  requireAdmin,
  getEstablishmentReportController,
);

export default router;
