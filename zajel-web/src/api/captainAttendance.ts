
import { apiGet, apiPost } from "./request";

export async function getAttendance() {
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

export async function checkIn() {
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

export async function checkOut() {
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
