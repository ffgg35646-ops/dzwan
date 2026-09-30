import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  getEstablishmentReportController,
  getMyEstablishmentReportController,
} from "../controllers/establishment-report.controller.js";

const router = Router();

/**
 * تقرير المنشأة للحساب المسجل كمالك للمنشأة.
 * لا نأخذ establishmentId من التطبيق حتى لا يستطيع صاحب محل
 * طلب بيانات محل آخر.
 */
router.get(
  "/establishments/me",
  requireAuth,
  getMyEstablishmentReportController,
);

/**
 * تقرير منشأة محددة للأدمن فقط.
 */
router.get(
  "/establishments/:establishmentId",
  requireAuth,
  requireAdmin,
  getEstablishmentReportController,
);

export default router;
