import type { Request, Response } from "../http/express-compat.js";
import mongoose from "mongoose";
import { getSystemSettings } from "../services/system-settings.service.js";

export async function getSettings(
  _req: Request,
  res: Response,
) {
  try {
    const environment = process.env.NODE_ENV || "development";
    const systemSettings = await getSystemSettings();

    const loginMaxFailedAttempts =
      systemSettings.loginMaxFailedAttempts === 10 ? 10 : 5;

    process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS =
      String(loginMaxFailedAttempts);

    return res.json({
      success: true,
      data: {
        environment,
        api: {
          status: "online",
          version: process.env.npm_package_version || "1.0.0",
        },
        database: {
          status:
            mongoose.connection.readyState === 1
              ? "online"
              : mongoose.connection.readyState === 2
                ? "connecting"
                : "offline",
        },
        security: {
          authentication: "JWT",
          loginRateLimit: true,
          loginMaxFailedAttempts,
          helmet: true,
          malformedJsonProtection: true,
          json404Protection: true,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "تعذر تحميل إعدادات النظام حاليًا.",
    });
  }
}
