
import { CaptainShiftModel } from "../models/CaptainShift.js";

export type StrictShiftResult = {
  allowed: boolean;
  reason:
    | "NO_SHIFT"
    | "OUTSIDE_SHIFT"
    | "IN_SHIFT";
  shiftId?: string;
};

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);

  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return -1;
  }

  return h * 60 + m;
}

function isInsideShift(
  nowMinutes: number,
  start: string,
  end: string,
): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes < 0 || endMinutes < 0) {
    return false;
  }

  // نفس الوقت يعني شفت 24 ساعة
  if (startMinutes === endMinutes) {
    return true;
  }

  // شفت عادي داخل نفس اليوم
  if (startMinutes < endMinutes) {
    return (
      nowMinutes >= startMinutes &&
      nowMinutes < endMinutes
    );
  }

  // شفت يعبر منتصف الليل
  return (
    nowMinutes >= startMinutes ||
    nowMinutes < endMinutes
  );
}

function getCurrentDayIndex(date: Date): number {
  return date.getDay();
}

export async function checkStrictShift(
  captainId: string,
  date = new Date(),
): Promise<StrictShiftResult> {
  const dayIndex = getCurrentDayIndex(date);

  const shifts = await CaptainShiftModel.find({
    captainId,
    isActive: true,
  }).lean();

  if (!shifts.length) {
    return {
      allowed: false,
      reason: "NO_SHIFT",
    };
  }

  const nowMinutes =
    date.getHours() * 60 +
    date.getMinutes();

  for (const assignment of shifts) {
    // CaptainShift يحتوي على نوعين من السجلات:
    // 1) تعريف الشفت نفسه.
    // 2) تعيين الشفت للكابتن ويحتوي على shiftId.
    // عند وجود shiftId نقرأ تعريف الشفت الحقيقي.
    const shift =
      (assignment as any).shiftId
        ? await CaptainShiftModel.findById(
            (assignment as any).shiftId,
          ).lean()
        : assignment;

    if (!shift) {
      continue;
    }

    // الشفت المفتوح لا يعتمد على اليوم أو الوقت.
    if ((shift as any).isOpen === true) {
      return {
        allowed: true,
        reason: "IN_SHIFT",
        shiftId: String(shift._id),
      };
    }

    const rawShiftDay =
      (shift as any).dayOfWeek ??
      (shift as any).day ??
      null;

    if (
      rawShiftDay !== null &&
      rawShiftDay !== undefined &&
      rawShiftDay !== ""
    ) {
      const numericShiftDay = Number(rawShiftDay);

      if (Number.isInteger(numericShiftDay)) {
        if (numericShiftDay !== dayIndex) {
          continue;
        }
      } else {
        const names = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];

        if (
          String(rawShiftDay).toLowerCase() !==
          names[dayIndex]
        ) {
          continue;
        }
      }
    }

    const start =
      String(
        (shift as any).startTime ??
        (shift as any).start ??
        "",
      );

    const end =
      String(
        (shift as any).endTime ??
        (shift as any).end ??
        "",
      );

    if (
      isInsideShift(
        nowMinutes,
        start,
        end,
      )
    ) {
      return {
        allowed: true,
        reason: "IN_SHIFT",
        shiftId: String(shift._id),
      };
    }
  }

  return {
    allowed: false,
    reason: "OUTSIDE_SHIFT",
  };
}

export async function assertCaptainInsideShift(
  captainId: string,
  date = new Date(),
) {
  const result =
    await checkStrictShift(
      captainId,
      date,
    );

  if (!result.allowed) {
    const error =
      new Error(
        result.reason === "NO_SHIFT"
          ? "لا يوجد شفت فعال للكابتن."
          : "لا يمكن للكابتن العمل خارج وقت الشفت.",
      );

    (error as any).code =
      result.reason === "NO_SHIFT"
        ? "NO_ACTIVE_SHIFT"
        : "OUTSIDE_SHIFT";

    throw error;
  }

  return result;
}
