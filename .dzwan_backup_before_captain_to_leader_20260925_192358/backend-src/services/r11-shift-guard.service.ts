export interface ShiftWindow {
  startTime: string;
  endTime: string;
}

function minutes(value: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!m) throw new Error("INVALID_SHIFT_TIME");
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isInsideShift(
  shift: ShiftWindow,
  now = new Date()
) {
  const start = minutes(shift.startTime);
  const end = minutes(shift.endTime);
  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

export function assertInsideShift(
  shift: ShiftWindow,
  now = new Date()
) {
  if (!isInsideShift(shift, now)) {
    throw new Error("CAPTAIN_OUTSIDE_SHIFT");
  }
  return true;
}
