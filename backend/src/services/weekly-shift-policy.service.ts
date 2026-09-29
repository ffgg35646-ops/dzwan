export function assertWeeklyShiftChangeAllowed(
  changeCount: number
) {
  if (Number(changeCount || 0) >= 2) {
    throw new Error(
      "WEEKLY_SHIFT_CHANGE_LIMIT_REACHED"
    );
  }

  return true;
}
