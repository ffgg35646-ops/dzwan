import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import { assertInsideShift } from "./r11-shift-guard.service.js";

export async function clockInCaptain(
  captainId: string,
  shift: { startTime: string; endTime: string },
  now = new Date()
) {
  assertInsideShift(shift, now);

  const day = new Date(now);
  day.setHours(0, 0, 0, 0);

  const existing =
    await CaptainAttendanceModel.findOne({
      captainId,
      date: day,
    });

  if (existing?.clockInAt) {
    throw new Error("ALREADY_CLOCKED_IN");
  }

  return CaptainAttendanceModel.findOneAndUpdate(
    { captainId, date: day },
    {
      $set: {
        shiftId: null,
        clockInAt: now,
        status: "present",
      },
    },
    { upsert: true, new: true }
  );
}

export async function clockOutCaptain(
  captainId: string,
  now = new Date()
) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);

  const attendance =
    await CaptainAttendanceModel.findOne({
      captainId,
      date: day,
    });

  if (!attendance?.clockInAt) {
    throw new Error("NOT_CLOCKED_IN");
  }

  if (attendance.clockOutAt) {
    throw new Error("ALREADY_CLOCKED_OUT");
  }

  const duration = Math.max(
    0,
    Math.floor(
      (now.getTime() -
        attendance.clockInAt.getTime()) /
        60000
    )
  );

  attendance.clockOutAt = now;
  attendance.durationMinutes = duration;
  attendance.status = "closed";

  await attendance.save();
  return attendance;
}
