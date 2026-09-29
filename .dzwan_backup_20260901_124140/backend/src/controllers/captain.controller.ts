import type { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  type ScopedRequest,
} from "../middleware/scope.middleware.js";
import { UserModel } from "../models/User.js";

const updateCaptainSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().optional(),
  status: z
    .enum(["pending", "active", "rejected", "suspended", "inactive"])
    .optional(),
});

function hasCaptainScope(
  req: ScopedRequest,
  governorateId: string | null | undefined,
  areaId: string | null | undefined,
): boolean {
  const scope = req.scopedUser;

  if (!scope) return false;

  if (scope.role === "super_admin" || scope.role === "admin") {
    return true;
  }

  if (scope.role === "governorate_leader") {
    return !!(
      scope.governorateId &&
      governorateId &&
      scope.governorateId === governorateId
    );
  }

  if (scope.role === "area_leader") {
    return !!(
      scope.governorateId &&
      scope.areaId &&
      governorateId &&
      areaId &&
      scope.governorateId === governorateId &&
      scope.areaId === areaId
    );
  }

  return false;
}

async function getCaptainLocation(userId: string) {
  const captain = await UserModel.findOne({
    _id: userId,
    role: "captain",
  })
    .select("governorateId areaId")
    .lean();

  if (!captain) return null;

  return {
    governorateId: captain.governorateId?.toString() ?? null,
    areaId: captain.areaId?.toString() ?? null,
  };
}

export async function listCaptains(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const filter: Record<string, unknown> = {
        role: "captain",
      };

      const scope = scopedReq.scopedUser;

      if (
        scope?.role === "governorate_leader" &&
        scope.governorateId
      ) {
        filter.governorateId = new Types.ObjectId(
          scope.governorateId,
        );
      }

      if (
        scope?.role === "area_leader" &&
        scope.governorateId &&
        scope.areaId
      ) {
        filter.governorateId = new Types.ObjectId(
          scope.governorateId,
        );
        filter.areaId = new Types.ObjectId(scope.areaId);
      }

      const captains = await UserModel.find(filter)
        .select(
          "_id fullName email phone role status avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason governorateId areaId createdAt updatedAt",
        )
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        captains,
      });
    });
  } catch (error) {
    console.error("List captains error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحميل الكباتن.",
      });
    }
  }
}

export async function getCaptain(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const captain = await UserModel.findOne({
        _id: String(scopedReq.params.id),
        role: "captain",
      })
        .select(
          "_id fullName email phone role status avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason governorateId areaId createdAt updatedAt",
        )
        .lean();

      if (!captain) {
        res.status(404).json({
          success: false,
          message: "الكابتن غير موجود.",
        });
        return;
      }

      if (
        !hasCaptainScope(
          scopedReq,
          captain.governorateId?.toString(),
          captain.areaId?.toString(),
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك الوصول إلى كابتن خارج نطاقك.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        captain,
      });
    });
  } catch (error) {
    console.error("Get captain error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحميل بيانات الكابتن.",
      });
    }
  }
}

export async function updateCaptain(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const data = updateCaptainSchema.parse(scopedReq.body);

      const captain = await UserModel.findOne({
        _id: String(scopedReq.params.id),
        role: "captain",
      });

      if (!captain) {
        res.status(404).json({
          success: false,
          message: "الكابتن غير موجود.",
        });
        return;
      }

      if (
        !hasCaptainScope(
          scopedReq,
          captain.governorateId?.toString(),
          captain.areaId?.toString(),
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك تعديل كابتن خارج نطاقك.",
        });
        return;
      }

      if (data.fullName !== undefined) {
        captain.fullName = data.fullName;
      }

      if (data.phone !== undefined) {
        captain.phone = data.phone;
      }

      if (data.email !== undefined) {
        captain.email = data.email.toLowerCase();
      }

      if (data.status !== undefined) {
        captain.status = data.status;
      }

      await captain.save();

      res.status(200).json({
        success: true,
        message: "تم تحديث بيانات الكابتن بنجاح.",
        captain,
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات الكابتن غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Update captain error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء تحديث الكابتن.",
      });
    }
  }
}

export async function approveCaptain(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const location = await getCaptainLocation(
        String(scopedReq.params.id),
      );

      if (!location) {
        res.status(404).json({
          success: false,
          message: "الكابتن غير موجود.",
        });
        return;
      }

      if (
        !hasCaptainScope(
          scopedReq,
          location.governorateId,
          location.areaId,
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك قبول كابتن خارج نطاقك.",
        });
        return;
      }

      const captain = await UserModel.findOneAndUpdate(
        {
          _id: String(scopedReq.params.id),
          role: "captain",
        },
        {
          $set: {
            status: "active",
            approvedAt: new Date(),
            approvedBy: scopedReq.user?.sub,
            rejectionReason: null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
        .select(
          "_id fullName email phone role status avatarUrl approvedAt approvedBy governorateId areaId",
        )
        .lean();

      res.status(200).json({
        success: true,
        message: "تم قبول الكابتن وتفعيله.",
        captain,
      });
    });
  } catch (error) {
    console.error("Approve captain error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء قبول الكابتن.",
      });
    }
  }
}

export async function rejectCaptain(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const reason =
        typeof scopedReq.body?.reason === "string"
          ? scopedReq.body.reason.trim()
          : "";

      const location = await getCaptainLocation(
        String(scopedReq.params.id),
      );

      if (!location) {
        res.status(404).json({
          success: false,
          message: "الكابتن غير موجود.",
        });
        return;
      }

      if (
        !hasCaptainScope(
          scopedReq,
          location.governorateId,
          location.areaId,
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك رفض كابتن خارج نطاقك.",
        });
        return;
      }

      const captain = await UserModel.findOneAndUpdate(
        {
          _id: String(scopedReq.params.id),
          role: "captain",
        },
        {
          $set: {
            status: "rejected",
            rejectionReason: reason || null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
        .select(
          "_id fullName email phone role status rejectionReason governorateId areaId",
        )
        .lean();

      res.status(200).json({
        success: true,
        message: "تم رفض الكابتن.",
        captain,
      });
    });
  } catch (error) {
    console.error("Reject captain error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء رفض الكابتن.",
      });
    }
  }
}

export async function deleteCaptain(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const location = await getCaptainLocation(
        String(scopedReq.params.id),
      );

      if (!location) {
        res.status(404).json({
          success: false,
          message: "الكابتن غير موجود.",
        });
        return;
      }

      if (
        !hasCaptainScope(
          scopedReq,
          location.governorateId,
          location.areaId,
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك حذف كابتن خارج نطاقك.",
        });
        return;
      }

      await UserModel.findOneAndDelete({
        _id: String(scopedReq.params.id),
        role: "captain",
      });

      res.status(200).json({
        success: true,
        message: "تم حذف الكابتن بنجاح.",
      });
    });
  } catch (error) {
    console.error("Delete captain error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ أثناء حذف الكابتن.",
      });
    }
  }
}
