import { Router } from "express";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middleware/auth.middleware.js";

import {
  createCaptainRating,
  captainRatings,
  myCaptainRatings,
  captainRatingSummaries,
  addCashTransaction,
  captainCash,
  captainKpi,
  auditLogs,
  auditLog,
  getOperationsSettings,
  updateOperationsSettings,
  listNotificationRules,
  upsertNotificationRule,
  createSubAdmin,
  listSubAdmins,
  updateSubAdmin,
} from "../controllers/completion.controller.js";

const router = Router();

// التقييم
router.post(
  "/ratings",
  requireAuth,
  createCaptainRating,
);

router.get(
  "/ratings/me",
  requireAuth,
  myCaptainRatings,
);

router.get(
  "/ratings/captains",
  requireAuth,
  requireAdmin,
  captainRatingSummaries,
);

router.get(
  "/ratings/me",
  requireAuth,
  myCaptainRatings,
);

router.get(
  "/ratings/captains",
  requireAuth,
  requireAdmin,
  captainRatingSummaries,
);

router.get(
  "/ratings/:captainId",
  requireAuth,
  requireAdmin,
  captainRatings,
);

// الكاش
router.post(
  "/cash",
  requireAuth,
  requireAdmin,
  addCashTransaction,
);

router.get(
  "/cash/:captainId",
  requireAuth,
  requireAdmin,
  captainCash,
);

// KPI
router.get(
  "/kpi/captains/:captainId",
  requireAuth,
  requireAdmin,
  captainKpi,
);

// Audit
router.get(
  "/audit",
  requireAuth,
  requireAdmin,
  auditLogs,
);

router.post(
  "/audit",
  requireAuth,
  requireAdmin,
  auditLog,
);

// الإعدادات المركزية
router.get(
  "/settings",
  requireAuth,
  requireAdmin,
  getOperationsSettings,
);

router.patch(
  "/settings",
  requireAuth,
  requireAdmin,
  updateOperationsSettings,
);

// قواعد الإشعارات
router.get(
  "/notification-rules",
  requireAuth,
  requireAdmin,
  listNotificationRules,
);

router.put(
  "/notification-rules/:event",
  requireAuth,
  requireAdmin,
  upsertNotificationRule,
);

// الأدمنات الفرعية
router.post(
  "/sub-admins",
  requireAuth,
  requireSuperAdmin,
  createSubAdmin,
);

router.get(
  "/sub-admins",
  requireAuth,
  requireSuperAdmin,
  listSubAdmins,
);

router.patch(
  "/sub-admins/:id",
  requireAuth,
  requireSuperAdmin,
  updateSubAdmin,
);

export default router;
