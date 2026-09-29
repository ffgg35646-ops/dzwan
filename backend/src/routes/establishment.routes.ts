import { Router, type NextFunction, type Response } from "express";
import type { ScopedRequest } from "../middleware/scope.middleware.js";
import {
  suspendEstablishmentCore,
  reactivateEstablishmentCore,
  updateEstablishmentLocationCore,
} from "../controllers/core11-establishment.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";

import {
  approveEstablishment,
  createEstablishment,
  deleteEstablishment,
  getEstablishment,
  listEstablishments,
  rejectEstablishment,
  updateEstablishment,
} from "../controllers/establishment.controller.js";

const router = Router();

function requireEstablishmentAccess(
  req: ScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  const role = req.scopedUser?.role;

  if (!role) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  if (
    role === "super_admin" ||
    role === "admin" ||
    role === "governorate_leader" ||
    role === "area_leader" ||
    role === "shop"
  ) {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: "ليس لديك صلاحية الوصول إلى المنشأة.",
  });
}

router.use(
  requireAuth,
  loadUserScope,
);

/*
 * قراءة وتعديل المنشأة:
 * shop مسموح له،
 * والـcontroller يتحقق أن المنشأة تخصه.
 */
router.get("/", requireManagementRole, listEstablishments);
router.post("/", requireManagementRole, createEstablishment);

router.get(
  "/:id",
  requireEstablishmentAccess,
  getEstablishment,
);

router.patch(
  "/:id",
  requireEstablishmentAccess,
  updateEstablishment,
);

/*
 * عمليات إدارية فقط.
 */
router.post(
  "/:id/approve",
  requireManagementRole,
  approveEstablishment,
);

router.post(
  "/:id/reject",
  requireManagementRole,
  rejectEstablishment,
);

router.delete(
  "/:id",
  requireManagementRole,
  deleteEstablishment,
);

router.post(
  "/:id/suspend",
  requireManagementRole,
  suspendEstablishmentCore,
);

router.post(
  "/:id/reactivate",
  requireManagementRole,
  reactivateEstablishmentCore,
);

router.patch(
  "/:id/location",
  requireEstablishmentAccess,
  updateEstablishmentLocationCore,
);

export default router;
