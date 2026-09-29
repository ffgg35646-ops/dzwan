import type { Response } from "express";
import { Types } from "mongoose";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  type ScopedRequest,
} from "../middleware/scope.middleware.js";
import { LocationModel } from "../models/Location.js";

export async function getScopedLocations(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const scope = scopedReq.scopedUser;

      if (!scope) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      if (
        scope.role === "super_admin" ||
        scope.role === "admin"
      ) {
        const locations = await LocationModel.find()
          .sort({ name: 1 })
          .lean();

        res.status(200).json({
          success: true,
          locations,
        });
        return;
      }

      if (
        scope.role !== "governorate_leader" &&
        scope.role !== "area_leader"
      ) {
        res.status(403).json({
          success: false,
          message: "ليس لديك صلاحية الوصول للمناطق.",
        });
        return;
      }

      if (
        !scope.governorateId ||
        !Types.ObjectId.isValid(scope.governorateId)
      ) {
        res.status(403).json({
          success: false,
          message: "الحساب غير مرتبط بمحافظة.",
        });
        return;
      }

      const location = await LocationModel.findById(
        scope.governorateId,
      ).lean();

      if (!location) {
        res.status(404).json({
          success: false,
          message: "المحافظة غير موجودة.",
        });
        return;
      }

      if (scope.role === "governorate_leader") {
        res.status(200).json({
          success: true,
          locations: [location],
        });
        return;
      }

      if (
        !scope.areaId ||
        !Types.ObjectId.isValid(scope.areaId)
      ) {
        res.status(403).json({
          success: false,
          message: "الحساب غير مرتبط بمنطقة.",
        });
        return;
      }

      const area = location.areas.find(
        (item) => item._id.toString() === scope.areaId,
      );

      if (!area) {
        res.status(404).json({
          success: false,
          message: "المنطقة غير موجودة.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        locations: [
          {
            ...location,
            areas: [area],
          },
        ],
      });
    });
  } catch (error) {
    console.error("Scoped locations error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحميل المناطق.",
      });
    }
  }
}
