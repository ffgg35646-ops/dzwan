
import { apiGet, apiPatch, apiPost } from "./request";

export async function getOnlineState() {
  for (const path of [
    "/captains/me/online",
    "/captain/online",
    "/captains/online",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return null;
}

export async function changeOnlineState(
  online: boolean
) {
  const body = { online };

  for (const path of [
    "/captains/me/online",
    "/captain/online",
    "/captains/online",
  ]) {
    try {
      return await apiPatch(path, body);
    } catch {}

    try {
      return await apiPost(path, body);
    } catch {}
  }

  throw new Error(
    "تعذر تغيير حالة الاتصال."
  );
}
