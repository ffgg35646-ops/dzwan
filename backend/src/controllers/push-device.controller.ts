import type { Response } from "express";
import { PushDeviceModel } from "../models/PushDevice.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function registerPushDevice(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.sub) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const token = String(req.body?.token || "").trim();
    const platform = String(
      req.body?.platform || "unknown"
    ).trim();

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Push token is required.",
      });
      return;
    }

    const device = await PushDeviceModel.findOneAndUpdate(
      { token },
      {
        userId: req.user.sub,
        token,
        platform,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    res.json({
      success: true,
      message: "تم تسجيل جهاز الإشعارات بنجاح.",
      device: {
        id: device?._id,
        platform: device?.platform,
      },
    });
  } catch (error) {
    console.error(
      "Register push device error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "تعذر تسجيل جهاز الإشعارات.",
    });
  }
}
