import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { verifyToken, type AccessTokenPayload } from "../utils/jwt.js";
import { createAuditLog } from "../services/audit-log.service.js";
import { StaffPermissionModel } from "../models/StaffPermission.js";

export interface AuthenticatedRequest extends Request {
  user?: AccessTokenPayload;
}

const ACCESS_COOKIE = "dzwan_access";

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authorization = req.headers.authorization;

  const bearerToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : null;

  const cookieToken =
    typeof req.cookies?.[ACCESS_COOKIE] === "string"
      ? req.cookies[ACCESS_COOKIE]
      : null;

  const token = bearerToken || cookieToken;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }
}

function resolveAdminPermission(
  method: string,
  url: string,
): string | null {
  const path = url.split("?")[0];

  // Pricing
  if (path === "/api/pricing" && method === "GET") {
    return "pricing.read";
  }

  if (path === "/api/pricing" && method === "POST") {
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
    method === "POST" &&
    path.match(/^\/api\/locations\/[^/]+\/areas$/)
  ) {
    return "areas.create";
  }

  if (
    path.startsWith("/api/locations/") &&
    method === "PATCH"
  ) {
    return path.includes("/areas/")
      ? "areas.update"
      : "locations.update";
  }

  if (
    path.startsWith("/api/locations/") &&
    method === "DELETE"
  ) {
    return path.includes("/areas/")
      ? "areas.delete"
      : "locations.delete";
  }

  // Captain create
  if (
    path === "/api/captains" &&
    method === "POST"
  ) {
    return "captains.create";
  }

  // Captains
  if (
    path === "/api/captains" &&
    method === "GET"
  ) {
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


  // Audit Log
  if (
    path.startsWith("/api/audit-logs") &&
    method === "GET"
  ) {
    return "audit.read";
  }

  // Captain documents
  if (
    path.startsWith("/api/captain-documents/captain/") &&
    method === "GET"
  ) {
    return "captains.read";
  }

  if (
    path.startsWith("/api/captain-documents/") &&
    method === "PATCH" &&
    path.endsWith("/review")
  ) {
    return "captains.approve";
  }

  // App versions
  if (
    path === "/api/ops/app-versions" &&
    method === "GET"
  ) {
    return "admin.all";
  }

  if (
    path === "/api/ops/app-versions" &&
    method === "POST"
  ) {
    return "admin.all";
  }

  // Security log
  if (
    path.startsWith("/api/audit") &&
    method === "GET"
  ) {
    return "audit.read";
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


export async function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  if (req.user.role !== "super_admin") {
    res.status(403).json({
      success: false,
      message: "Super Admin access required.",
    });
    return;
  }

  next();
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  if (
    req.user.role !== "admin" &&
    req.user.role !== "super_admin"
  ) {
    res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
    return;
  }

  // الـSuper Admin له كل الصلاحيات.
  if (req.user.role === "super_admin") {
    next();
    return;
  }

  const permission = resolveAdminPermission(
    req.method,
    req.originalUrl,
  );

  if (permission) {
    const userId = req.user.sub;

    if (!Types.ObjectId.isValid(userId)) {
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

    const allowed =
      permissions.includes(permission) ||
      permissions.includes(
        permission.replace(".read", ".all"),
      ) ||
      permissions.includes(
        permission.replace(".update", ".all"),
      ) ||
      permissions.includes("admin.all");

    if (!allowed) {
      res.status(403).json({
        success: false,
        message:
          "ليس لديك الصلاحية لتنفيذ هذه العملية.",
        requiredPermission: permission,
      });
      return;
    }
  }

  const method = req.method.toUpperCase();

  // نسجل فقط العمليات التي تغيّر بيانات النظام.
  const shouldAudit =
    method === "POST" ||
    method === "PUT" ||
    method === "PATCH" ||
    method === "DELETE";

  if (!shouldAudit) {
    next();
    return;
  }

  let auditSaved = false;

  res.on("finish", () => {
    if (auditSaved) return;
    auditSaved = true;

    // لا نسجل الطلبات الفاشلة كعمليات إدارية ناجحة.
    if (res.statusCode < 200 || res.statusCode >= 400) {
      return;
    }

    const actorId = req.user?.sub;

    void createAuditLog({
      actorId:
        typeof actorId === "string" &&
        Types.ObjectId.isValid(actorId)
          ? new Types.ObjectId(actorId)
          : null,
      actorRole:
        req.user?.role ?? null,
      action: `admin.${method.toLowerCase()}`,
      entityType: "HTTP",
      entityId: null,
      ip: req.ip,
      userAgent:
        req.get("user-agent") ?? null,
      description:
        `الأدمن نفّذ ${method} على ${req.originalUrl}`,
    }).catch((error) => {
      console.error(
        "Audit log error:",
        error,
      );
    });
  });

  next();
}
