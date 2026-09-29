import { Types } from "mongoose";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import {
  DispatchSettingsModel,
} from "../models/DispatchSettings.js";
import {
  CaptainShiftModel,
} from "../models/CaptainShift.js";
import {
  DispatchQueueModel,
} from "../models/DispatchQueue.js";
import {
  DispatchAssignmentModel,
} from "../models/DispatchAssignment.js";
import {
  dispatchOrder,
  acceptAssignment,
  expireAssignments,
  processDispatchQueue,
} from "../services/dispatch-manager.service.js";
import { UserModel } from "../models/User.js";

function validObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

export async function getDispatchSettings(
  _req: AuthenticatedRequest,
  res: Response,
) {
  const settings =
    (await DispatchSettingsModel.findOne().lean()) ??
    (await DispatchSettingsModel.create({})).toObject();

  res.json({
    success: true,
    data: settings,
  });
}

export async function updateDispatchSettings(
  req: AuthenticatedRequest,
  res: Response,
) {
  const allowed = [
    "autoDispatchEnabled",
    "queueEnabled",
    "maxActiveOrdersPerCaptain",
    "assignmentTimeoutSeconds",
    "maxAssignmentAttempts",
    "onlineOnly",
    "requireSameArea",
    "requireSameGovernorate",
    "requireCaptainShift",
  ] as const;

  const update: Record<string, unknown> = {};

  for (const key of allowed) {
    if (req.body?.[key] !== undefined) {
      update[key] = req.body[key];
    }
  }

  const settings =
    await DispatchSettingsModel.findOneAndUpdate(
      {},
      { $set: update },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    ).lean();

  res.json({
    success: true,
    message: "تم تحديث إعدادات التوزيع بنجاح.",
    data: settings,
  });
}

export async function createCaptainShift(
  req: AuthenticatedRequest,
  res: Response,
) {
  const {
    captainId,
    dayOfWeek,
    startTime,
    endTime,
    isActive,
  } = req.body ?? {};

  if (
    typeof captainId !== "string" ||
    !validObjectId(captainId) ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    typeof startTime !== "string" ||
    typeof endTime !== "string" ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime)
  ) {
    res.status(400).json({
      success: false,
      message: "بيانات الشفت غير صالحة.",
    });
    return;
  }

  const captain = await UserModel.findOne({
    _id: captainId,
    role: "captain",
  }).select("_id");

  if (!captain) {
    res.status(404).json({
      success: false,
      message: "الكابتن غير موجود.",
    });
    return;
  }

  const [startHour, startMinute] =
    startTime.split(":").map(Number);
  const [endHour, endMinute] =
    endTime.split(":").map(Number);

  if (
    startHour > 23 ||
    startMinute > 59 ||
    endHour > 23 ||
    endMinute > 59
  ) {
    res.status(400).json({
      success: false,
      message: "وقت الشفت غير صالح.",
    });
    return;
  }

  const shift =
    await CaptainShiftModel.create({
      captainId,
      dayOfWeek,
      startTime,
      endTime,
      isActive:
        typeof isActive === "boolean"
          ? isActive
          : true,
    });

  res.status(201).json({
    success: true,
    message: "تم إنشاء الشفت بنجاح.",
    data: shift,
  });
}

export async function listCaptainShifts(
  _req: AuthenticatedRequest,
  res: Response,
) {
  const shifts =
    await CaptainShiftModel.find()
      .sort({
        captainId: 1,
        dayOfWeek: 1,
        startTime: 1,
      })
      .lean();

  res.json({
    success: true,
    data: shifts,
  });
}

export async function deleteCaptainShift(
  req: AuthenticatedRequest,
  res: Response,
) {
  const id = String(req.params.id ?? "");

  if (!validObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "المعرف المرسل غير صحيح.",
    });
    return;
  }

  const deleted =
    await CaptainShiftModel.findByIdAndDelete(id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: "الشفت غير موجود.",
    });
    return;
  }

  res.json({
    success: true,
    message: "تم حذف الشفت بنجاح.",
  });
}

export async function listDispatchQueue(
  _req: AuthenticatedRequest,
  res: Response,
) {
  const queue =
    await DispatchQueueModel.find()
      .sort({
        status: 1,
        priority: -1,
        createdAt: 1,
      })
      .limit(200)
      .lean();

  res.json({
    success: true,
    data: queue,
  });
}

export async function listAssignments(
  _req: AuthenticatedRequest,
  res: Response,
) {
  const assignments =
    await DispatchAssignmentModel.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

  res.json({
    success: true,
    data: assignments,
  });
}

export async function manualDispatch(
  req: AuthenticatedRequest,
  res: Response,
) {
  const id = String(req.params.id ?? "");

  if (!validObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "المعرف المرسل غير صحيح.",
    });
    return;
  }

  const result = await dispatchOrder(
    new Types.ObjectId(id),
  );

  res.json({
    success: true,
    message: result.assigned
      ? "تم إسناد الطلب إلى كابتن."
      : "تمت معالجة الطلب ووضعه في الطابور عند الحاجة.",
    data: result,
  });
}

export async function captainAcceptAssignment(
  req: AuthenticatedRequest,
  res: Response,
) {
  const id = String(req.params.id ?? "");
  const captainId = req.user?.sub;

  if (
    !validObjectId(id) ||
    typeof captainId !== "string" ||
    !validObjectId(captainId)
  ) {
    res.status(400).json({
      success: false,
      message: "بيانات الطلب غير صالحة.",
    });
    return;
  }

  const captain = await UserModel.findOne({
    _id: captainId,
    role: "captain",
  }).select("_id");

  if (!captain) {
    res.status(403).json({
      success: false,
      message: "هذه العملية متاحة للكابتن فقط.",
    });
    return;
  }

  try {
    const assignment =
      await acceptAssignment(
        new Types.ObjectId(id),
        new Types.ObjectId(captainId),
      );

    res.json({
      success: true,
      message: "تم قبول الطلب بنجاح.",
      data: assignment,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "تعذر قبول الإسناد.";

    res.status(400).json({
      success: false,
      message,
    });
  }
}

export async function processDispatch(
  _req: AuthenticatedRequest,
  res: Response,
) {
  const expired =
    await expireAssignments();

  const processed =
    await processDispatchQueue();

  res.json({
    success: true,
    message: "تمت معالجة التوزيع والطابور.",
    data: {
      expired,
      processed,
    },
  });
}
