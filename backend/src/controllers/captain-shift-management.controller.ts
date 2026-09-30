import type { Request, Response } from "../http/express-compat.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import {
  createCaptainShift,
  updateCaptainShift,
  assignCaptainWeeklyShift,
  changeCaptainWeeklyShiftOnce,
  assertCaptainInsideShift,
  getWeekStart,
  getBaghdadMinutes,
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
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
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
        "تم اختيار شفت هذا الأسبوع",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "تعذر اختيار الشفت",
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
        "تم تغيير شفت هذا الأسبوع",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "تعذر تغيير الشفت",
    });
  }
}

export async function checkCurrentShift(
  req: Request,
  res: Response
) {
  try {
    const captainId = String(
      (req as any).user?.sub ||
      req.params?.captainId ||
      ""
    );

    if (!captainId) {
      return res.status(401).json({
        success: false,
        allowed: false,
        message: "حساب الكابتن غير صالح.",
      });
    }

    const now = new Date();

    const assignment =
      await CaptainShiftModel.findOne({
        captainId,
        shiftId: {
          $exists: true,
          $ne: null,
        },
        isActive: true,
      })
        .sort({ updatedAt: -1 })
        .lean();

    if (!assignment?.shiftId) {
      return res.json({
        success: true,
        allowed: false,
        insideShift: false,
        assignment: null,
        shift: null,
        message: "لم يتم اختيار شفت لهذا الأسبوع.",
      });
    }

    const shift =
      await CaptainShiftModel.findOne({
        _id: assignment.shiftId,
        isActive: true,
      }).lean();

    if (!shift) {
      return res.json({
        success: true,
        allowed: false,
        insideShift: false,
        assignment,
        shift: null,
        message: "الشفت المختار غير فعال حاليًا.",
      });
    }

    const toMinutes = (value: string) => {
      const [h, m] = String(value)
        .split(":")
        .map(Number);

      return h * 60 + m;
    };

    const start = toMinutes(
      String(shift.startTime)
    );

    const end = toMinutes(
      String(shift.endTime)
    );

    const current =
      getBaghdadMinutes(now);

    let insideShift = false;

    if (start === end) {
      insideShift = true;
    } else if (start < end) {
      insideShift =
        current >= start &&
        current < end;
    } else {
      insideShift =
        current >= start ||
        current < end;
    }

    return res.json({
      success: true,
      allowed: insideShift,
      insideShift,
      assignment,
      shift,
      message: insideShift
        ? "أنت داخل وقت الشفت."
        : "تم اختيار الشفت، لكنك خارج وقت الشفت حاليًا.",
    });
  } catch (error: any) {
    console.error(
      "Check current shift error:",
      error
    );

    return res.status(500).json({
      success: false,
      allowed: false,
      insideShift: false,
      message:
        error?.message ||
        "تعذر فحص الشفت الحالي.",
    });
  }
}

