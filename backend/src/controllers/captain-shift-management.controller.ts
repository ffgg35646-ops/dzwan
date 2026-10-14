import type { Request, Response } from "express";
import { Types } from "mongoose";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import {
  createCaptainShift,
  updateCaptainShift,
  assignCaptainWeeklyShift,
  changeCaptainWeeklyShiftOnce,
  assertCaptainInsideShift,
  isWeeklyShiftAssignmentCurrent,
  getNextShiftChangeAt,
  isShiftRunning,
  getBaghdadDayBounds,
} from "../services/captain-shift-management.service.js";

export async function createShift(
  req: Request,
  res: Response
) {
  try {
    const shift =
      await createCaptainShift(
        req.body || {}
      );

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الشفت بنجاح",
      data: shift,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "تعذر إنشاء الشفت",
    });
  }
}

export async function updateShift(
  req: Request,
  res: Response
) {
  try {
    const shift =
      await updateCaptainShift(
        String(req.params.id),
        req.body || {}
      );

    return res.json({
      success: true,
      message: "تم تحديث الشفت بنجاح",
      data: shift,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "تعذر تحديث الشفت",
    });
  }
}

export async function listAdminShifts(
  _req: Request,
  res: Response
) {
  try {
    const shifts =
      await CaptainShiftModel.find({
        $and: [
          {
            $or: [
              { captainId: { $exists: false } },
              { captainId: null },
            ],
          },
          {
            $or: [
              { shiftId: { $exists: false } },
              { shiftId: null },
            ],
          },
          {
            $or: [
              { weekStart: { $exists: false } },
              { weekStart: null },
            ],
          },
        ],
      })
        .sort({
          isActive: -1,
          startTime: 1,
          name: 1,
        })
        .lean();

    return res.json({
      success: true,
      data: shifts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "تعذر تحميل شفتات الكباتن",
    });
  }
}

export async function deleteShift(
  req: Request,
  res: Response
) {
  try {
    const shiftId = String(
      req.params.id || ""
    );

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "معرف الشفت مطلوب.",
      });
    }

    const shift =
      await CaptainShiftModel.findById(
        shiftId
      );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "الشفت غير موجود.",
      });
    }

    if (
      (shift as any).captainId ||
      (shift as any).shiftId ||
      (shift as any).weekStart
    ) {
      return res.status(409).json({
        success: false,
        message:
          "لا يمكن حذف شفت مرتبط بكابتن.",
      });
    }

    await CaptainShiftModel.deleteOne({
      _id: shift._id,
    });

    return res.json({
      success: true,
      message: "تم حذف الشفت بنجاح.",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "تعذر حذف الشفت.",
    });
  }
}

export async function listAvailableShifts(
  _req: Request,
  res: Response
) {
  try {
    const shifts = await CaptainShiftModel.find({
      isActive: true,
      captainId: { $in: [null] },
      shiftId: { $in: [null] },
      weekStart: { $in: [null] },
    })
      .sort({ startTime: 1, name: 1 })
      .lean();

    return res.json({
      success: true,
      data: shifts,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || "تعذر تحميل الشفتات المتاحة",
    });
  }
}

export async function selectWeeklyShift(
  req: Request,
  res: Response
) {
  try {
    const captainId = String(
      (req as any).user?.sub ||
      req.body?.captainId ||
      ""
    );

    const result =
      await assignCaptainWeeklyShift(
        captainId,
        String(req.body?.shiftId || "")
      );

    return res.status(201).json({
      success: true,
      message:
        "تم حفظ الشفت. سيظل فعالًا حتى تغييره، ويُفتح التغيير بعد 7 أيام.",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message === "SHIFT_ALREADY_SELECTED_THIS_WEEK"
          ? "لا يمكن تغيير الشفت قبل مرور 7 أيام كاملة من وقت آخر اختيار بتوقيت العراق."
          : error?.message || "تعذر اختيار الشفت",
    });
  }
}

export async function changeWeeklyShift(
  req: Request,
  res: Response
) {
  try {
    const captainId = String(
      (req as any).user?.sub ||
      req.body?.captainId ||
      ""
    );

    const result =
      await changeCaptainWeeklyShiftOnce(
        captainId,
        String(req.body?.shiftId || "")
      );

    return res.json({
      success: true,
      message:
        "تم تغيير الشفت بنجاح، وتبدأ مدة قفل جديدة لمدة 7 أيام.",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message === "SHIFT_ALREADY_SELECTED_THIS_WEEK"
          ? "لا يمكن تغيير الشفت قبل مرور 7 أيام كاملة من وقت آخر اختيار بتوقيت العراق."
          : error?.message || "تعذر تغيير الشفت",
    });
  }
}

async function recordAutomaticAttendance(
  captainId: string,
  shiftId: unknown,
  now: Date,
) {
  try {
    const normalizedShiftId = String(shiftId || "");
    if (
      !Types.ObjectId.isValid(captainId) ||
      !Types.ObjectId.isValid(normalizedShiftId)
    ) {
      return;
    }

    const day = getBaghdadDayBounds(now);
    const captainObjectId = new Types.ObjectId(captainId);

    // One attendance record per captain per Baghdad day.
    // It is observational only: database failures must never block the shift screen.
    await CaptainAttendanceModel.updateOne(
      {
        captainId: captainObjectId,
        date: {
          $gte: day.start,
          $lt: day.end,
        },
      },
      {
        $setOnInsert: {
          captainId: captainObjectId,
          date: day.start,
          shiftId: new Types.ObjectId(normalizedShiftId),
          clockInAt: now,
          clockOutAt: null,
          durationMinutes: 0,
          status: "present",
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error(
      "Automatic attendance from active shift failed:",
      error,
    );
  }
}

export async function checkCurrentShift(
  req: Request,
  res: Response
) {
  try {
    const captainId = String((req as any).user?.sub || req.params?.captainId || "");
    if (!captainId) {
      return res.status(401).json({ success: false, allowed: false, canSelectNewShift: false, message: "حساب الكابتن غير صالح." });
    }
    const now = new Date();
    const assignment = await CaptainShiftModel.findOne({
      captainId,
      shiftId: { $exists: true, $ne: null },
      isActive: { $ne: false },
    }).sort({ changedAt: -1, updatedAt: -1, weekStart: -1 }).lean();

    if (!assignment?.shiftId) {
      return res.json({
        success: true, allowed: false, insideShift: false,
        canSelectNewShift: true, assignment: null, shift: null,
        message: "لم تختَر شفتًا بعد. يمكنك اختيار شفت.",
      });
    }
    const shift = await CaptainShiftModel.findOne({ _id: assignment.shiftId, isActive: true }).lean();
    if (!shift) {
      return res.json({
        success: true, allowed: false, insideShift: false,
        canSelectNewShift: true, assignment: null, shift: null,
        message: "الشفت السابق غير فعال. يمكنك اختيار شفت آخر.",
      });
    }
    // Keep the selected shift active every day during its time window.
    // Seven days restrict changing the selected shift, not using it.
    const insideShift = isShiftRunning(
      String(shift.startTime),
      String(shift.endTime),
      now,
    );

    // Opening the captain app during an active shift records attendance automatically.
    // No check-in button is required, and logging failure never blocks the app.
    if (insideShift) {
      // Attendance is observational. Record it asynchronously so a slow write
      // never delays shift state, order loading, or captain navigation.
      void recordAutomaticAttendance(
        captainId,
        shift._id,
        now,
      );
    }

    return res.json({
      success: true, allowed: insideShift, insideShift,
      canSelectNewShift: !isWeeklyShiftAssignmentCurrent(assignment, now), assignment, shift,
      nextChangeAt: getNextShiftChangeAt(assignment)?.toISOString() ?? null,
      message: insideShift ? "أنت داخل وقت الشفت." : "تم اختيار الشفت، لكنك خارج وقت الشفت حاليًا.",
    });
  } catch (error: any) {
    console.error("Check current shift error:", error);
    return res.status(500).json({
      success: false, allowed: false, insideShift: false,
      message: error?.message || "تعذر فحص الشفت الحالي.",
    });
  }
}
