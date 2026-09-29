export interface ShiftWindow {
  startTime: string;
  endTime: string;
}

function parseTime(value: string) {
  const match =
    /^([01]\d|2[0-3]):([0-5]\d)$/.exec(
      value
    );

  if (!match) {
    throw new Error("INVALID_SHIFT_TIME");
  }

  return (
    Number(match[1]) * 60 +
    Number(match[2])
  );
}

function currentMinutes(date: Date) {
  return (
    date.getHours() * 60 +
    date.getMinutes()
  );
}

export function isNowInsideShift(
  shift: ShiftWindow,
  now = new Date()
) {
  const start = parseTime(
    shift.startTime
  );

  const end = parseTime(
    shift.endTime
  );

  const current = currentMinutes(now);

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

export function assertCaptainAllowedToWork(
  shift: ShiftWindow,
  strict = true,
  now = new Date()
) {
  if (!strict) {
    return true;
  }

  if (!isNowInsideShift(shift, now)) {
    throw new Error(
      "CAPTAIN_OUTSIDE_SHIFT"
    );
  }

  return true;
}
