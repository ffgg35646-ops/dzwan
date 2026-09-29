import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../services/system-settings.service.js";

export async function getSettings(
  req: AuthenticatedRequest,
  res: Response,
) {
  const settings = await getSystemSettings();

  return res.json({
    settings,
  });
}

export async function updateSettings(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const allowed = [
      "requireDeliveryOtp",
      "requireDeliveryPhoto",
      "deliveryOtpExpirationMinutes",
      "deliveryOtpMaxAttempts",
      "requireCaptainWorkArea",
      "loginMaxFailedAttempts",
    ];

    const data: Record<string, unknown> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key];
      }
    }

    const settings = await updateSystemSettings(data);

    process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS =
      String(settings.loginMaxFailedAttempts ?? 5);

    return res.json({
      message: "تم تحديث إعدادات النظام.",
      settings,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الإعدادات.",
    });
  }
}
