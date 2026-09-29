import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { UserModel, type UserRole } from "../models/User.js";

export interface ScopedUser {
  id: string;
  role: UserRole;
  status: string;
  governorateId: string | null;
  areaId: string | null;
}

export interface ScopedRequest extends AuthenticatedRequest {
  scopedUser?: ScopedUser;
}

export async function loadUserScope(
  req: ScopedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.sub) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const user = await UserModel.findById(req.user.sub)
      .select("_id role status governorateId areaId")
      .lean();

    if (!user) {
      res.status(401).json({
        success: false,
        message: "الحساب غير موجود.",
      });
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({
        success: false,
        message: "الحساب غير مفعل.",
      });
      return;
    }

    req.scopedUser = {
      id: user._id.toString(),
      role: user.role,
      status: user.status,
      governorateId: user.governorateId
        ? user.governorateId.toString()
        : null,
      areaId: user.areaId
        ? user.areaId.toString()
        : null,
    };

    next();
  } catch (error) {
    console.error("Load user scope error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل صلاحيات الحساب.",
    });
  }
}

export function requireManagementRole(
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
    role !== "super_admin" &&
    role !== "admin" &&
    role !== "governorate_leader" &&
    role !== "area_leader"
  ) {
    res.status(403).json({
      success: false,
      message: "ليس لديك صلاحية الإدارة.",
    });
    return;
  }

  next();
}

export function requireFullAdminScope(
  req: ScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  const role = req.scopedUser?.role;

  if (role !== "super_admin" && role !== "admin") {
    res.status(403).json({
      success: false,
      message: "هذه العملية متاحة للأدمن فقط.",
    });
    return;
  }

  next();
}
