import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { UserModel } from "../models/User.js";

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().optional(),
  status: z
    .enum(["pending", "active", "rejected", "suspended", "inactive"])
    .optional(),
});

export async function listUsers(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const users = await UserModel.find()
      .select(
        "_id fullName email phone role status avatarUrl isOnline lastSeenAt lastLoginAt approvedAt createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("List users error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل المستخدمين.",
    });
  }
}

export async function getUser(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const user = await UserModel.findById(req.params.id)
      .select(
        "_id fullName email phone role status avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason createdAt updatedAt",
      )
      .lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل بيانات المستخدم.",
    });
  }
}

export async function updateUser(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { $set: data },
      {
        new: true,
        runValidators: true,
      },
    )
      .select(
        "_id fullName email phone role status avatarUrl isOnline lastSeenAt lastLoginAt approvedAt createdAt updatedAt",
      )
      .lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث المستخدم بنجاح.",
      user,
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

    console.error("Update user error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث المستخدم.",
    });
  }
}

export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (req.params.id === req.user?.sub) {
      res.status(400).json({
        success: false,
        message: "لا يمكن حذف حساب الأدمن الحالي.",
      });
      return;
    }

    const user = await UserModel.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "المستخدم غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "تم حذف المستخدم بنجاح.",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف المستخدم.",
    });
  }
}
