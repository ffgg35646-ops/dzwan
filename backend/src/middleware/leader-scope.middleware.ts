import type { NextFunction, Response } from "../http/express-compat.js";
import type { ScopedRequest } from "./scope.middleware.js";

export function requireLeaderManagement(
  req: ScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  const user = req.scopedUser;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  if (
    user.role !== "super_admin" &&
    user.role !== "admin" &&
    user.role !== "governorate_leader" &&
    user.role !== "area_leader"
  ) {
    res.status(403).json({
      success: false,
      message: "ليس لديك صلاحية إدارة القادة.",
    });
    return;
  }

  next();
}
