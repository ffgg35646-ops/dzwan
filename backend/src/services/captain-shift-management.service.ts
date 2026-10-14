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

export function getBaghdadDayBounds(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BAGHDAD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      value[part.type] = Number(part.value);
    }
  }
  // Baghdad's civil day currently begins at 21:00 UTC on the preceding date.
  const start = new Date(Date.UTC(value.year, value.month - 1, value.day, -3, 0, 0, 0));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function getBaghdadMinutes(date = new Date()) {
  const parts = getBaghdadParts(date);
  return Number(parts.hour || 0) * 60 + Number(parts.minute || 0);
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

function getShiftSelectionTimestamp(assignment: any): number {
  const explicitChange = new Date(assignment?.changedAt ?? NaN).getTime();
  if (Number.isFinite(explicitChange)) return explicitChange;

  // Legacy assignments may have only weekStart/createdAt/updatedAt.
  // Use the most recent valid timestamp so a legacy calendar-week value
  // does not keep the lock closed longer than intended.
  const fallbacks = [
    assignment?.weekStart,
    assignment?.createdAt,
    assignment?.updatedAt,
  ]
    .map((value) => new Date(value ?? NaN).getTime())
    .filter((value) => Number.isFinite(value));
  return fallbacks.length ? Math.max(...fallbacks) : NaN;
}

export function getNextShiftChangeAt(assignment: any): Date | null {
  if (!assignment) return null;
  const selectedAt = getShiftSelectionTimestamp(assignment);
  return Number.isFinite(selectedAt)
    ? new Date(selectedAt + 7 * 24 * 60 * 60 * 1000)
    : null;
}

// This helper represents the change-lock only. It does not expire the selected shift.
export function isWeeklyShiftAssignmentCurrent(
  assignment: any,
  now = new Date(),
) {
  const unlockAt = getNextShiftChangeAt(assignment);
  return Boolean(unlockAt && now.getTime() < unlockAt.getTime());
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
      captainId: { $in: [null] },
      shiftId: { $in: [null] },
      weekStart: { $in: [null] },
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
    captainId: { $in: [null] },
    shiftId: { $in: [null] },
    weekStart: { $in: [null] },
  });

  if (!shift) {
    throw new Error("SHIFT_NOT_FOUND_OR_INACTIVE");
  }

  const start = new Date(weekStart || new Date());

  const previousAssignment =
    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true, $ne: null },
    }).sort({ changedAt: -1, updatedAt: -1, weekStart: -1 });

  if (previousAssignment) {
    if (isWeeklyShiftAssignmentCurrent(previousAssignment, start)) {
      throw new Error("SHIFT_ALREADY_SELECTED_THIS_WEEK");
    }
    previousAssignment.shiftId = shiftObjectId;
    previousAssignment.weekStart = start;
    previousAssignment.changedAt = new Date();
    previousAssignment.changeCount = 0;
    previousAssignment.isActive = true;
    previousAssignment.isOpen = true;
    return previousAssignment.save();
  }

  return CaptainShiftModel.create({
    captainId: captainObjectId,
    shiftId: shiftObjectId,
    weekStart: start,
    changedAt: new Date(),
    changeCount: 0,
    isActive: true,
    isOpen: true,
  });
}

// Both shift endpoints enforce the same seven-day lock. The chosen shift never expires.
export async function changeCaptainWeeklyShiftOnce(captainId: string, newShiftId: string) {
  return assignCaptainWeeklyShift(captainId, newShiftId);
}

export function isShiftRunning(
  startTime: string,
  endTime: string,
  now = new Date(),
  dayOfWeek?: number | string | null,
) {
  const toMinutes = (value: string) => {
    if (!/^\d{1,2}:\d{2}$/.test(String(value))) return NaN;
    const [h, m] = String(value).split(":").map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? h * 60 + m : NaN;
  };
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

  const current = getBaghdadMinutes(now);
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: BAGHDAD_TIME_ZONE,
    weekday: "long",
  }).format(now).toLowerCase();
  const weekdayIndex: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const currentDay = weekdayIndex[dayName];

  if (dayOfWeek !== null && dayOfWeek !== undefined && String(dayOfWeek).trim() !== "") {
    const expectedDay = Number.isInteger(Number(dayOfWeek))
      ? Number(dayOfWeek)
      : weekdayIndex[String(dayOfWeek).toLowerCase()];
    if (!Number.isInteger(expectedDay) || expectedDay < 0 || expectedDay > 6) return false;

    // After midnight, an overnight shift belongs to the day it started.
    const correctDay = start > end && current < end
      ? (expectedDay + 1) % 7 === currentDay
      : expectedDay === currentDay;
    if (!correctDay) return false;
  }

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export async function assertCaptainInsideShift(
  captainId: string,
  now = new Date()
) {
  const captainObjectId = objectId(captainId);
  const assignment = await CaptainShiftModel.findOne({
    captainId: captainObjectId,
    shiftId: { $exists: true, $ne: null },
    isActive: { $ne: false },
  }).sort({ changedAt: -1, updatedAt: -1, weekStart: -1 });

  if (!assignment) {
    throw new Error("CAPTAIN_HAS_NO_WEEKLY_SHIFT");
  }
  const shift = await CaptainShiftModel.findById((assignment as any).shiftId);
  if (!shift || !(shift as any).isActive) {
    throw new Error("CAPTAIN_SHIFT_INACTIVE");
  }
  if (!isShiftRunning(String((shift as any).startTime), String((shift as any).endTime), now, (shift as any).dayOfWeek)) {
    throw new Error("CAPTAIN_OUTSIDE_SHIFT");
  }
  return { assignment, shift };
}
