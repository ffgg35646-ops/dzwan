import type { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  type ScopedRequest,
} from "../middleware/scope.middleware.js";
import { UserModel } from "../models/User.js";
import { StaffProfileModel } from "../models/StaffProfile.js";

const updateSchema = z.object({
  governorateId: z.string().optional().nullable(),
  areaId: z.string().optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  isAvailable: z.boolean().optional(),
});

function isObjectId(value: string | null | undefined): boolean {
  return !!value && Types.ObjectId.isValid(value);
}

function hasScopeAccess(
  req: ScopedRequest,
  governorateId: string | null | undefined,
  areaId: string | null | undefined,
): boolean {
  const user = req.scopedUser;

  if (!user) return false;

  if (user.role === "super_admin" || user.role === "admin") {
    return true;
  }

  if (user.role === "governorate_leader") {
    return !!(
      user.governorateId &&
      governorateId &&
      user.governorateId === governorateId
    );
  }

  if (user.role === "area_leader") {
    return !!(
      user.governorateId &&
      user.areaId &&
      governorateId &&
      areaId &&
      user.governorateId === governorateId &&
      user.areaId === areaId
    );
  }

  return false;
}

async function getUserLocation(
  userId: string,
): Promise<{
  governorateId: string | null;
  areaId: string | null;
} | null> {
  const user = await UserModel.findById(userId)
    .select("role governorateId areaId")
    .lean();

  if (!user) return null;

  return {
    governorateId: user.governorateId
      ? user.governorateId.toString()
      : null,
    areaId: user.areaId
      ? user.areaId.toString()
      : null,
  };
}

export async function listStaff(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const type =
        scopedReq.query.type === "captain" ||
        scopedReq.query.type === "shop"
          ? scopedReq.query.type
          : undefined;

      const filter: Record<string, unknown> = {};

      if (type) {
        filter.type = type;
      }

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

      const profiles = await StaffProfileModel.find(filter)
        .populate({
          path: "userId",
          select:
            "fullName phone email role status avatarUrl isOnline lastLoginAt governorateId areaId",
        })
        .populate({
          path: "governorateId",
          select: "_id name",
        })
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        staff: profiles,
        total: profiles.length,
      });
    });
  } catch (error) {
    console.error("List staff error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  }
}

export async function updateStaff(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const data = updateSchema.parse(scopedReq.body);

      const profile = await StaffProfileModel.findById(
        scopedReq.params.id,
      );

      if (!profile) {
        res.status(404).json({
          success: false,
          message: "بيانات الموظف غير موجودة.",
        });
        return;
      }

      const currentGovernorateId =
        profile.governorateId?.toString() ?? null;

      const currentAreaId =
        profile.areaId?.toString() ?? null;

      if (
        !hasScopeAccess(
          scopedReq,
          currentGovernorateId,
          currentAreaId,
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك إدارة هذا الحساب خارج نطاقك.",
        });
        return;
      }

      const nextGovernorateId =
        data.governorateId !== undefined
          ? data.governorateId
          : currentGovernorateId;

      const nextAreaId =
        data.areaId !== undefined
          ? data.areaId
          : currentAreaId;

      if (
        nextGovernorateId &&
        !isObjectId(nextGovernorateId)
      ) {
        res.status(400).json({
          success: false,
          message: "معرف المحافظة غير صحيح.",
        });
        return;
      }

      if (nextAreaId && !isObjectId(nextAreaId)) {
        res.status(400).json({
          success: false,
          message: "معرف المنطقة غير صحيح.",
        });
        return;
      }

      if (
        !hasScopeAccess(
          scopedReq,
          nextGovernorateId,
          nextAreaId,
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك نقل الحساب خارج نطاقك.",
        });
        return;
      }

      const updateData: Record<string, unknown> = {};

      if (data.governorateId !== undefined) {
        updateData.governorateId =
          data.governorateId
            ? new Types.ObjectId(data.governorateId)
            : null;
      }

      if (data.areaId !== undefined) {
        updateData.areaId =
          data.areaId
            ? new Types.ObjectId(data.areaId)
            : null;
      }

      if (data.address !== undefined) {
        updateData.address = data.address;
      }

      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      if (data.isAvailable !== undefined) {
        updateData.isAvailable = data.isAvailable;
      }

      const updated = await StaffProfileModel.findByIdAndUpdate(
        scopedReq.params.id,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        },
      );

      res.status(200).json({
        success: true,
        message: "تم تحديث البيانات بنجاح.",
        staff: updated,
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "البيانات المرسلة غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Update staff error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  }
}

export async function createStaffProfile(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = req as ScopedRequest;

  try {
    await loadUserScope(scopedReq, res, async () => {
      const user = await UserModel.findById(
        scopedReq.params.userId,
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: "المستخدم غير موجود.",
        });
        return;
      }

      if (user.role !== "captain" && user.role !== "shop") {
        res.status(400).json({
          success: false,
          message: "المستخدم ليس كابتن أو متجر.",
        });
        return;
      }

      const governorateId = user.governorateId
        ? user.governorateId.toString()
        : null;

      const areaId = user.areaId
        ? user.areaId.toString()
        : null;

      if (
        !hasScopeAccess(
          scopedReq,
          governorateId,
          areaId,
        )
      ) {
        res.status(403).json({
          success: false,
          message: "لا يمكنك إدارة مستخدم خارج نطاقك.",
        });
        return;
      }

      const existing = await StaffProfileModel.findOne({
        userId: user._id,
      });

      if (existing) {
        res.status(409).json({
          success: false,
          message: "بيانات المستخدم موجودة بالفعل.",
        });
        return;
      }

      const profile = await StaffProfileModel.create({
        userId: user._id,
        type: user.role,
        governorateId: user.governorateId ?? null,
        areaId: user.areaId ?? null,
      });

      res.status(201).json({
        success: true,
        message: "تم إنشاء بيانات المستخدم.",
        staff: profile,
      });
    });
  } catch (error) {
    console.error("Create staff profile error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "حدث خطأ داخلي في الخادم.",
      });
    }
  }
}
