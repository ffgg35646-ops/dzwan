import type { NextFunction, Request, Response } from "express";
import { verifyToken, type AccessTokenPayload } from "../utils/jwt.js";

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

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
    return;
  }

  next();
}
