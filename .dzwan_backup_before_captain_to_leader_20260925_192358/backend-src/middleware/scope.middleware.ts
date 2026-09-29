import type { NextFunction, Response } from "express";
import { Types } from "mongoose";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import { UserModel, type UserRole } from "../models/User.js";
import { StaffPermissionModel } from "../models/StaffPermission.js";

export interface ScopedUser {
  id: string;
  role: UserRole;
  status: string;
  governorateId: string | null;
  areaId: string | null;
  areaIds: string[];
  permissions: string[];
  permissionGovernorateIds: string[];
  permissionAreaIds: string[];
  permissionEstablishmentIds: string[];
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
      .select("_id role status governorateId areaId areaIds")
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

    const staffPermission =
      user.role === "admin"
        ? await StaffPermissionModel.findOne({
            userId: user._id,
          })
            .select(
              "permissions governorateIds areaIds establishmentIds",
            )
            .lean()
        : null;

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

      // Backward compatible:
      // old area leaders may still have only areaId.
      areaIds:
        (user.areaIds?.length
          ? user.areaIds
          : user.areaId
            ? [user.areaId]
            : []
        ).map((id) => id.toString()),

      permissions:
        staffPermission?.permissions ?? [],

      permissionGovernorateIds:
        (staffPermission?.governorateIds ?? []).map(
          (id) => id.toString(),
        ),

      permissionAreaIds:
        (staffPermission?.areaIds ?? []).map(
          (id) => id.toString(),
        ),

      permissionEstablishmentIds:
        (staffPermission?.establishmentIds ?? []).map(
          (id) => id.toString(),
        ),
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

function getManagementPermission(
  method: string,
  url: string,
): string | null {
  const path = url.split("?")[0];

  // Captain create
  if (
    path === "/api/captains" &&
    method === "POST"
  ) {
    return "captains.create";
  }

  // Captains
  if (path === "/api/captains" && method === "GET") {
    return "captains.read";
  }

  if (path.startsWith("/api/captains/")) {
    if (method === "GET") return "captains.read";
    if (method === "PATCH") return "captains.update";
    if (method === "DELETE") return "captains.delete";

    if (
      method === "POST" &&
      path.endsWith("/approve")
    ) {
      return "captains.approve";
    }

    if (
      method === "POST" &&
      path.endsWith("/reject")
    ) {
      return "captains.reject";
    }
  }

  // Establishments
  if (
    path === "/api/establishments" &&
    method === "GET"
  ) {
    return "establishments.read";
  }

  if (
    path === "/api/establishments" &&
    method === "POST"
  ) {
    return "establishments.create";
  }

  if (path.startsWith("/api/establishments/")) {
    if (method === "GET") return "establishments.read";
    if (method === "PATCH") return "establishments.update";
    if (method === "DELETE") return "establishments.delete";

    if (
      method === "POST" &&
      path.endsWith("/approve")
    ) {
      return "establishments.approve";
    }

    if (
      method === "POST" &&
      path.endsWith("/reject")
    ) {
      return "establishments.reject";
    }
  }

  // Pricing
  if (
    path === "/api/pricing" &&
    method === "GET"
  ) {
    return "pricing.read";
  }

  if (
    path === "/api/pricing" &&
    method === "POST"
  ) {
    return "pricing.create";
  }

  if (
    path.startsWith("/api/pricing/") &&
    method === "PATCH"
  ) {
    return "pricing.update";
  }

  if (
    path.startsWith("/api/pricing/") &&
    method === "DELETE"
  ) {
    return "pricing.delete";
  }

  // Locations / Areas
  if (
    path === "/api/locations" &&
    method === "GET"
  ) {
    return "locations.read";
  }

  if (
    path === "/api/locations" &&
    method === "POST"
  ) {
    return "locations.create";
  }

  if (
    path.startsWith("/api/locations/") &&
    method === "PATCH"
  ) {
    if (path.includes("/areas/")) {
      return "areas.update";
    }

    return "locations.update";
  }

  if (
    path.startsWith("/api/locations/") &&
    method === "DELETE"
  ) {
    if (path.includes("/areas/")) {
      return "areas.delete";
    }

    return "locations.delete";
  }

  // إضافة منطقة
  if (
    method === "POST" &&
    path.match(/^\/api\/locations\/[^/]+\/areas$/)
  ) {
    return "areas.create";
  }

  // Reports
  if (
    path.startsWith("/api/reports") &&
    method === "GET"
  ) {
    return "reports.read";
  }

  // Orders
  if (
    path.startsWith("/api/orders") &&
    method === "GET"
  ) {
    return "orders.read";
  }

  if (
    path.startsWith("/api/orders") &&
    method !== "GET"
  ) {
    return "orders.update";
  }

  return null;
}

function hasStaffPermission(
  permissions: string[],
  required: string,
): boolean {
  return (
    permissions.includes(required) ||
    permissions.includes("admin.all") ||
    permissions.includes(
      required.replace(".read", ".all"),
    ) ||
    permissions.includes(
      required.replace(".update", ".all"),
    )
  );
}

export async function requireManagementRole(
  req: ScopedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

  // Super Admin له كل الصلاحيات.
  if (role === "super_admin") {
    next();
    return;
  }

  // القادة الإقليميون يعتمدون على منطق النطاق الموجود أصلًا.
  if (
    role === "governorate_leader" ||
    role === "area_leader"
  ) {
    next();
    return;
  }

  const requiredPermission =
    getManagementPermission(
      req.method,
      req.originalUrl,
    );

  // لو الراوت غير مربوط بصلاحية دقيقة، لا نمنع العملية هنا.
  if (!requiredPermission) {
    next();
    return;
  }

  const userId = req.scopedUser?.id;

  if (!userId || !Types.ObjectId.isValid(userId)) {
    res.status(403).json({
      success: false,
      message: "حساب الأدمن غير صالح.",
    });
    return;
  }

  const staffPermission =
    await StaffPermissionModel.findOne({
      userId: new Types.ObjectId(userId),
    })
      .select("permissions")
      .lean();

  const permissions =
    staffPermission?.permissions ?? [];

  if (
    !hasStaffPermission(
      permissions,
      requiredPermission,
    )
  ) {
    res.status(403).json({
      success: false,
      message:
        "ليس لديك الصلاحية لتنفيذ هذه العملية.",
      requiredPermission,
    });
    return;
  }

  next();
}

export function requireProductManagementRole(
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
    role !== "area_leader" &&
    role !== "shop"
  ) {
    res.status(403).json({
      success: false,
      message: "ليس لديك صلاحية إدارة المنتجات.",
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
