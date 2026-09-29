import mongoose from "mongoose";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import { UserModel } from "../models/User.js";

function objectId(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new Error("INVALID_ID");
  }
  return new mongoose.Types.ObjectId(id);
}

function parseTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw new Error("INVALID_SHIFT_TIME");
  }

  const [hours, minutes] =
    value.split(":").map(Number);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("INVALID_SHIFT_TIME");
  }

  return hours * 60 + minutes;
}

const BAGHDAD_TIME_ZONE = "Asia/Baghdad";

function getBaghdadParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAGHDAD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value: Record<string, number> = {};

  for (const part of parts) {
    if (
      part.type === "year" ||
      part.type === "month" ||
      part.type === "day" ||
      part.type === "hour" ||
      part.type === "minute"
    ) {
      value[part.type] = Number(part.value);
    }
  }

  return value;
}

export function getBaghdadMinutes(date = new Date()) {
  const parts = getBaghdadParts(date);

  return (
    Number(parts.hour || 0) * 60 +
    Number(parts.minute || 0)
  );
}

export function getWeekStart(date = new Date()) {
  const parts = getBaghdadParts(date);

  const baghdadDate = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      12,
      0,
      0,
      0,
    ),
  );

  const day = baghdadDate.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;

  baghdadDate.setUTCDate(
    baghdadDate.getUTCDate() + diff,
  );

  /*
   * العراق UTC+3 حاليًا.
   * هذا يمثل الاثنين 00:00 بتوقيت بغداد.
   */
  return new Date(
    Date.UTC(
      baghdadDate.getUTCFullYear(),
      baghdadDate.getUTCMonth(),
      baghdadDate.getUTCDate(),
      -3,
      0,
      0,
      0,
    ),
  );
}

export async function createCaptainShift(input: {
  name: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}) {
  const name = String(input.name || "").trim();

  if (!name) {
    throw new Error("SHIFT_NAME_REQUIRED");
  }

  parseTime(input.startTime);
  parseTime(input.endTime);

  if (
    input.dayOfWeek !== undefined &&
    (!Number.isInteger(Number(input.dayOfWeek)) ||
      Number(input.dayOfWeek) < 0 ||
      Number(input.dayOfWeek) > 6)
  ) {
    throw new Error("INVALID_SHIFT_DAY");
  }

  return CaptainShiftModel.create({
    name,
    dayOfWeek:
      input.dayOfWeek === undefined
        ? undefined
        : Number(input.dayOfWeek),
    startTime: input.startTime,
    endTime: input.endTime,
    isActive:
      input.isActive === undefined
        ? true
        : Boolean(input.isActive),
  });
}

export async function updateCaptainShift(
  shiftId: string,
  input: {
    name?: string;
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  }
) {
  const shift =
    await CaptainShiftModel.findOne({
      _id: objectId(shiftId),
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
    });

  if (!shift) {
    throw new Error("SHIFT_NOT_FOUND");
  }

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) {
      throw new Error("SHIFT_NAME_REQUIRED");
    }
    (shift as any).name = name;
  }

  if (input.startTime !== undefined) {
    parseTime(input.startTime);
    (shift as any).startTime =
      input.startTime;
  }

  if (input.endTime !== undefined) {
    parseTime(input.endTime);
    (shift as any).endTime =
      input.endTime;
  }

  if (input.isActive !== undefined) {
    (shift as any).isActive =
      Boolean(input.isActive);
  }

  await shift.save();
  return shift;
}

export async function assignCaptainWeeklyShift(
  captainId: string,
  shiftId: string,
  weekStart?: Date
) {
  const captainObjectId = objectId(captainId);
  const shiftObjectId = objectId(shiftId);

  const captain = await UserModel.findOne({
    _id: captainObjectId,
    role: "captain",
    status: "active",
  })
    .select("_id")
    .lean();

  if (!captain) {
    throw new Error("CAPTAIN_NOT_ACTIVE");
  }

  const shift = await CaptainShiftModel.findOne({
    _id: shiftObjectId,
    isActive: true,
    captainId: { $exists: false },
    shiftId: { $exists: false },
    weekStart: { $exists: false },
  });

  if (!shift) {
    throw new Error("SHIFT_NOT_FOUND_OR_INACTIVE");
  }

  const start = new Date(weekStart || new Date());
  start.setMilliseconds(0);

  const previousAssignment =
    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true },
    }).sort({ weekStart: -1 });

  if (previousAssignment?.weekStart) {
    const expiresAt =
      new Date(previousAssignment.weekStart).getTime() +
      7 * 24 * 60 * 60 * 1000;

    if (start.getTime() < expiresAt) {
      throw new Error(
        "SHIFT_ALREADY_SELECTED_THIS_WEEK"
      );
    }

    previousAssignment.shiftId = shiftObjectId;
    previousAssignment.weekStart = start;
    previousAssignment.changedAt = new Date();
    previousAssignment.changeCount = 0;
    previousAssignment.isActive = true;

    return previousAssignment.save();
  }

  return CaptainShiftModel.create({
    captainId: captainObjectId,
    shiftId: shiftObjectId,
    weekStart: start,
    changedAt: new Date(),
    changeCount: 0,
    isActive: true,
  });
}

export async function changeCaptainWeeklyShiftOnce(
  captainId: string,
  newShiftId: string,
  weekStart?: Date
) {
  const captainObjectId = objectId(captainId);
  const shiftObjectId = objectId(newShiftId);

  const now = new Date(weekStart || new Date());
  now.setMilliseconds(0);

  const windowStart = new Date(
    now.getTime() -
      7 * 24 * 60 * 60 * 1000,
  );

  const assignment =
    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true },
      weekStart: {
        $gt: windowStart,
        $lte: now,
      },
    }).sort({ weekStart: -1 });

  if (!assignment) {
    throw new Error(
      "NO_WEEKLY_SHIFT_SELECTED"
    );
  }

  if (
    Number(
      (assignment as any).changeCount || 0
    ) >= 1
  ) {
    throw new Error(
      "WEEKLY_SHIFT_CHANGE_LIMIT_REACHED"
    );
  }

  const shift =
    await CaptainShiftModel.findOne({
      _id: shiftObjectId,
      isActive: true,
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
    });

  if (!shift) {
    throw new Error(
      "SHIFT_NOT_FOUND_OR_INACTIVE"
    );
  }

  const updatedAssignment =
    await CaptainShiftModel.findOneAndUpdate(
      {
        _id: assignment._id,
        captainId: captainObjectId,
        weekStart: {
          $gt: windowStart,
          $lte: now,
        },
        changeCount: { $lt: 1 },
      },
      {
        $set: {
          shiftId: shiftObjectId,
          changedAt: new Date(),
        },
        $inc: {
          changeCount: 1,
        },
      },
      { new: true },
    );

  if (!updatedAssignment) {
    throw new Error(
      "WEEKLY_SHIFT_CHANGE_LIMIT_REACHED"
    );
  }

  return updatedAssignment;
}

export function isShiftRunning(
  startTime: string,
  endTime: string,
  now = new Date()
) {
  const toMinutes = (value: string) => {
    const [h, m] =
      value.split(":").map(Number);

    return h * 60 + m;
  };

  const start =
    toMinutes(startTime);

  const end =
    toMinutes(endTime);

  const current =
    getBaghdadMinutes(now);

  if (start === end) {
    return true;
  }

  if (start < end) {
    return (
      current >= start &&
      current < end
    );
  }

  return (
    current >= start ||
    current < end
  );
}

export async function assertCaptainInsideShift(
  captainId: string,
  now = new Date()
) {
  const captainObjectId =
    objectId(captainId);

  const start =
    getWeekStart(now);

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 7
  );

  const assignment =
    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true },
      weekStart: {
        $gte: start,
        $lt: end,
      },
    });

  if (!assignment) {
    throw new Error(
      "CAPTAIN_HAS_NO_WEEKLY_SHIFT"
    );
  }

  const shift =
    await CaptainShiftModel.findById(
      (assignment as any).shiftId
    );

  if (!shift || !(shift as any).isActive) {
    throw new Error(
      "CAPTAIN_SHIFT_INACTIVE"
    );
  }

  if (
    !isShiftRunning(
      String((shift as any).startTime),
      String((shift as any).endTime),
      now
    )
  ) {
    throw new Error(
      "CAPTAIN_OUTSIDE_SHIFT"
    );
  }

  return {
    assignment,
    shift,
  };
}
