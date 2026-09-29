import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

async function getCurrentCaptainShift(captainId: string) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * DAY_MS);

  return CaptainShiftModel.findOne({
    captainId: new Types.ObjectId(captainId),
    shiftId: {
      $exists: true,
      $ne: null,
    },
    weekStart: {
      $gt: windowStart,
      $lte: now,
    },
    isActive: true,
  })
    .sort({ weekStart: -1 })
    .lean();
}

function attendanceRow(item: any) {
  const captain =
    item.captainId &&
    typeof item.captainId === "object"
      ? item.captainId
      : null;

  const shift =
    item.shiftId &&
    typeof item.shiftId === "object"
      ? item.shiftId
      : null;

  return {
    _id: item._id,

    captainId:
      captain?._id ||
      item.captainId ||
      null,

    captainName:
      captain?.fullName ||
      "كابتن",

    captainPhone:
      captain?.phone ||
      "",

    date: item.date
      ? new Date(item.date).toISOString()
      : "",

    shiftId:
      shift?._id ||
      item.shiftId ||
      null,

    shiftName:
      shift?.name ||
      (
        shift?.startTime || shift?.endTime
          ? `${shift?.startTime || "--"} - ${shift?.endTime || "--"}`
          : "—"
      ),

    startTime:
      shift?.startTime ||
      "",

    endTime:
      shift?.endTime ||
      "",

    clockInAt:
      item.clockInAt
        ? new Date(item.clockInAt).toISOString()
        : "",

    clockOutAt:
      item.clockOutAt
        ? new Date(item.clockOutAt).toISOString()
        : "",

    checkIn:
      item.clockInAt
        ? new Date(item.clockInAt).toISOString()
        : "",

    checkOut:
      item.clockOutAt
        ? new Date(item.clockOutAt).toISOString()
        : "",

    durationMinutes:
      Number(item.durationMinutes || 0),

    status:
      item.status ||
      "present",
  };
}

export async function checkIn(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    if (!captainId) {
      return res.status(401).json({
        message: "غير مصرح.",
      });
    }

    const dayStart = startOfToday();
    const dayEnd = endOfToday();

    const existing =
      await CaptainAttendanceModel.findOne({
        captainId: new Types.ObjectId(captainId),
        date: {
          $gte: dayStart,
          $lt: dayEnd,
        },
      });

    if (existing) {
      return res.status(409).json({
        message: "تم تسجيل الحضور اليوم بالفعل.",
        attendance: existing,
      });
    }

    const assignment =
      await getCurrentCaptainShift(captainId);

    if (!assignment?.shiftId) {
      return res.status(400).json({
        message:
          "لا يوجد شفت محدد للكابتن خلال مدة الـ7 أيام الحالية.",
      });
    }

    const now = new Date();

    const attendance =
      await CaptainAttendanceModel.create({
        captainId: new Types.ObjectId(captainId),
        shiftId: assignment.shiftId,
        date: dayStart,
        clockInAt: now,
        clockOutAt: null,
        durationMinutes: 0,
        status: "present",
      });

    return res.status(201).json({
      message: "تم تسجيل الحضور بنجاح.",
      attendance,
    });
  } catch (error) {
    console.error("checkIn error:", error);

    return res.status(500).json({
      message:
        "حدث خطأ أثناء تسجيل الحضور.",
    });
  }
}

export async function checkOut(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    if (!captainId) {
      return res.status(401).json({
        message: "غير مصرح.",
      });
    }

    const dayStart = startOfToday();
    const dayEnd = endOfToday();

    const attendance =
      await CaptainAttendanceModel.findOne({
        captainId: new Types.ObjectId(captainId),
        date: {
          $gte: dayStart,
          $lt: dayEnd,
        },
        status: "present",
      });

    if (!attendance) {
      return res.status(404).json({
        message:
          "لا يوجد حضور مفتوح لليوم.",
      });
    }

    const now = new Date();

    attendance.clockOutAt = now;
    attendance.status = "closed";

    attendance.durationMinutes =
      attendance.clockInAt
        ? Math.max(
            0,
            Math.round(
              (
                now.getTime() -
                attendance.clockInAt.getTime()
              ) / 60000,
            ),
          )
        : 0;

    await attendance.save();

    return res.json({
      message:
        "تم تسجيل الانصراف بنجاح.",
      attendance,
    });
  } catch (error) {
    console.error(
      "checkOut error:",
      error,
    );

    return res.status(500).json({
      message:
        "حدث خطأ أثناء تسجيل الانصراف.",
    });
  }
}

export async function myAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    if (!captainId) {
      return res.status(401).json({
        message: "غير مصرح.",
      });
    }

    const rows =
      await CaptainAttendanceModel.find({
        captainId:
          new Types.ObjectId(captainId),
      })
        .populate(
          "shiftId",
          "name startTime endTime",
        )
        .sort({ date: -1 })
        .limit(100)
        .lean();

    return res.json({
      attendance:
        rows.map(attendanceRow),
    });
  } catch (error) {
    console.error(
      "myAttendance error:",
      error,
    );

    return res.status(500).json({
      message:
        "تعذر تحميل سجل الحضور.",
    });
  }
}

export async function adminAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId =
      typeof req.query.captainId === "string"
        ? req.query.captainId
        : "";

    const from =
      typeof req.query.from === "string"
        ? req.query.from
        : "";

    const to =
      typeof req.query.to === "string"
        ? req.query.to
        : "";

    const requestedDate =
      typeof req.query.date === "string"
        ? req.query.date
        : "";

    const filter: Record<string, any> = {};

    if (
      captainId &&
      Types.ObjectId.isValid(captainId)
    ) {
      filter.captainId =
        new Types.ObjectId(captainId);
    }

    if (requestedDate) {
      const start = new Date(
        `${requestedDate}T00:00:00`,
      );

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      filter.date = {
        $gte: start,
        $lt: end,
      };
    } else if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte = new Date(
          `${from}T00:00:00`,
        );
      }

      if (to) {
        const end = new Date(
          `${to}T00:00:00`,
        );

        end.setDate(end.getDate() + 1);

        filter.date.$lt = end;
      }
    }

    const rows =
      await CaptainAttendanceModel.find(filter)
        .populate(
          "captainId",
          "fullName phone email",
        )
        .populate(
          "shiftId",
          "name startTime endTime",
        )
        .sort({
          date: -1,
          clockInAt: -1,
        })
        .limit(500)
        .lean();

    return res.json({
      attendance:
        rows.map(attendanceRow),
    });
  } catch (error) {
    console.error(
      "adminAttendance error:",
      error,
    );

    return res.status(500).json({
      message:
        "تعذر تحميل حضور الكباتن.",
    });
  }
}
