
import { Response } from "../http/express-compat.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  assertCaptainInsideShift,
} from "../services/r11-strict-shift-runtime.service.js";
import { UserModel } from "../models/User.js";

export async function setCaptainOnline(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId =
      String(
        (req.user as any)?.sub ??
        "",
      );

    if (!captainId) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح.",
      });
    }

    const online =
      Boolean(
        (req.body as any)?.online
      );

    if (online) {
      await assertCaptainInsideShift(
        captainId,
      );
    }

    const captain =
      await UserModel.findByIdAndUpdate(
        captainId,
        {
          $set: {
            online,
            isOnline: online,
          },
        },
        {
          new: true,
        },
      );

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: "الكابتن غير موجود.",
      });
    }

    return res.json({
      success: true,
      online,
      message: online
        ? "تم تفعيل حالة العمل."
        : "تم إيقاف حالة العمل.",
    });
  } catch (error: any) {
    const code =
      error?.code;

    if (code === "OUTSIDE_SHIFT") {
      return res.status(403).json({
        success: false,
        code,
        message:
          "لا يمكنك بدء العمل خارج وقت الشفت المحدد.",
      });
    }

    if (code === "NO_ACTIVE_SHIFT") {
      return res.status(403).json({
        success: false,
        code,
        message:
          "لا يوجد شفت فعال لك حاليًا.",
      });
    }

    console.error(
      "setCaptainOnline:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "تعذر تغيير حالة العمل.",
    });
  }
}

export async function getCaptainOnline(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId =
      String(
        (req.user as any)?.sub ??
        "",
      );

    const captain =
      await UserModel.findById(
        captainId,
      ).lean();

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: "الكابتن غير موجود.",
      });
    }

    return res.json({
      success: true,
      online: Boolean(
        (captain as any).online ??
        (captain as any).isOnline ??
        false,
      ),
    });
  } catch (error) {
    console.error(
      "getCaptainOnline:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "تعذر قراءة حالة العمل.",
    });
  }
}
