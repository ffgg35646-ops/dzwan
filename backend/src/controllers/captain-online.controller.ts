
import { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  assertCaptainInsideShift,
} from "../services/r11-strict-shift-runtime.service.js";
import { UserModel } from "../models/User.js";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import { getBaghdadDayBounds } from "../services/captain-shift-management.service.js";
import { Types } from "mongoose";

// A daily attendance entry is inferred from authenticated work activity.
// Failure to write an observational record must never block work or orders.
async function recordAttendanceWithoutBlocking(captainId: string) {
  try {
    const now = new Date();
    const day = getBaghdadDayBounds(now);
    const captainObjectId = new Types.ObjectId(captainId);
    const assignment = await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true, $ne: null },
      isActive: { $ne: false },
    })
      .sort({ changedAt: -1, updatedAt: -1, weekStart: -1 })
      .select("shiftId")
      .lean();

    await CaptainAttendanceModel.updateOne(
      {
        captainId: captainObjectId,
        date: { $gte: day.start, $lt: day.end },
      },
      {
        $setOnInsert: {
          captainId: captainObjectId,
          date: day.start,
          shiftId: assignment?.shiftId || null,
          clockInAt: now,
          clockOutAt: null,
          durationMinutes: 0,
          status: "present",
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("Automatic attendance log failed:", error);
  }
}

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

    // Log automatically after work activation; attendance is never a gate.
    if (online) await recordAttendanceWithoutBlocking(captainId);

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

    // Returning already-online captains also log their first authenticated
    // activity of the new day, but only while their shift is running.
    const isOnline = Boolean((captain as any).online ?? (captain as any).isOnline ?? false);
    if (isOnline) {
      try {
        await assertCaptainInsideShift(captainId);
        await recordAttendanceWithoutBlocking(captainId);
      } catch {
        // Reading presence never changes online state or blocks the app.
      }
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
