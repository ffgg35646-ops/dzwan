import { Router } from "../http/express-compat.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import {
  shiftCheck,
  captainOnline,
  captainCapacity,
  attendanceIn,
  attendanceOut,
  orderEvent,
  orderTimeline,
  cash,
  cashStatement,
  rating,
  ratingSummary,
  kpi,
  establishmentReport,
  adminReport,
  dashboard,
  workAreas,
  complaint,
  complaintDetails,
} from "../controllers/requirements-11-29.controller.js";

const router = Router();

router.get(
  "/shift/check",
  shiftCheck
);

router.patch(
  "/captains/:captainId/online",
  captainOnline
);

router.get(
  "/captains/:captainId/capacity",
  captainCapacity
);

router.post(
  "/captains/:captainId/attendance/in",
  attendanceIn
);

router.post(
  "/captains/:captainId/attendance/out",
  attendanceOut
);

router.get(
  "/captains/:captainId/work-areas",
  workAreas
);

router.get(
  "/captains/:captainId/cash-statement",
  cashStatement
);

router.get(
  "/captains/:captainId/rating",
  ratingSummary
);

router.get(
  "/captains/:captainId/kpi",
  kpi
);

router.post(
  "/orders/:orderId/events",
  orderEvent
);

router.get(
  "/orders/:orderId/timeline",
  orderTimeline
);

router.get(
  "/orders/:orderId/timeline/full",
  orderTimeline
);

router.post(
  "/orders/:orderId/cash/:captainId",
  cash
);

router.post(
  "/orders/:orderId/rating",
  requireAuth,
  rating
);

router.post(
  "/complaints",
  requireAuth,
  complaint
);

router.get(
  "/complaints/:id",
  requireAuth,
  complaintDetails
);

router.get(
  "/reports/establishments/:establishmentId",
  requireAuth,
  establishmentReport
);

router.get(
  "/reports/admin",
  adminReport
);

router.get(
  "/dashboard/operations",
  requireAuth,
  requireAdmin,
  dashboard
);

export default router;
