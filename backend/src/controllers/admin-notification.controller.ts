import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  sendAdminNotification,
  type AdminNotificationTarget,
} from "../services/admin-notification.service.js";

export async function sendAdminNotificationController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const { target, title, message, type } = req.body ?? {};

    if (!target || typeof target !== "object") {
      res.status(400).json({
        success: false,
        error: "NOTIFICATION_TARGET_REQUIRED",
      });
      return;
    }

    if (!["user", "all", "group"].includes(String(target.type))) {
      res.status(400).json({
        success: false,
        error: "INVALID_NOTIFICATION_TARGET_TYPE",
      });
      return;
    }

    const result = await sendAdminNotification({
      target: target as AdminNotificationTarget,
      title,
      message,
      type,
    });

    res.json({
      success: true,
      message: "تم إرسال الإشعار بنجاح.",
      ...result,
    });
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "ADMIN_NOTIFICATION_ERROR";

    const status =
      code === "NOTIFICATION_USER_NOT_FOUND"
        ? 404
        : code.includes("REQUIRED") || code.includes("INVALID")
          ? 400
          : 500;

    res.status(status).json({
      success: false,
      error: code,
    });
  }
}
