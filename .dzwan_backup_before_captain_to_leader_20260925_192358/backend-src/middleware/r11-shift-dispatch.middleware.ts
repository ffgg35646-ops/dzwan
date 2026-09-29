
import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware.js";
import {
  assertCaptainInsideShift,
} from "../services/r11-strict-shift-runtime.service.js";

export async function requireCaptainInsideShiftForDispatch(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const captainId =
      String(
        (req as any).captainId ??
        (req.user as any)?.captainId ??
        (req.user as any)?.id ??
        (req.user as any)?._id ??
        "",
      );

    if (!captainId) {
      return res.status(401).json({
        success: false,
        message: "لم يتم تحديد الكابتن.",
      });
    }

    await assertCaptainInsideShift(
      captainId,
    );

    next();
  } catch (error: any) {
    if (
      error?.code === "OUTSIDE_SHIFT" ||
      error?.code === "NO_ACTIVE_SHIFT"
    ) {
      return res.status(403).json({
        success: false,
        code: error.code,
        message:
          "الكابتن غير مسموح له بالعمل خارج الشفت.",
      });
    }

    next(error);
  }
}
