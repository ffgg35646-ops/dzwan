
import { apiGet, apiPost } from "./request";

export async function getShiftInfo() {
  try {
    return await apiGet(
      "/captain-shifts/current/check"
    );
  } catch {
    return null;
  }
}

export async function getAttendanceHistory() {
  for (const path of [
    "/captain-attendance/me",
    "/captains/me/attendance",
    "/attendance/me",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return [];
}

export async function checkInCaptain() {
  for (const path of [
    "/captain-attendance/check-in",
    "/attendance/check-in",
  ]) {
    try {
      return await apiPost(path);
    } catch {}
  }

  throw new Error("تعذر تسجيل الحضور.");
}

export async function checkOutCaptain() {
  for (const path of [
    "/captain-attendance/check-out",
    "/attendance/check-out",
  ]) {
    try {
      return await apiPost(path);
    } catch {}
  }

  throw new Error("تعذر تسجيل الانصراف.");
}
