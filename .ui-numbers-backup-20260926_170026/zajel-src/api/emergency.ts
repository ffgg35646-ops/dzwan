
import { apiPost } from "./request";

export async function sendEmergency(orderId?: string) {
  const candidates = [
    orderId
      ? `/requirements-30-46/orders/${orderId}/emergency`
      : "",
    "/requirements-30-46/emergency",
    "/emergency",
  ].filter(Boolean);

  let lastError: unknown = null;

  for (const path of candidates) {
    try {
      return await apiPost(path, {
        orderId,
        message: "تنبيه طوارئ من تطبيق الكابتن.",
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ??
    new Error("تعذر إرسال تنبيه الطوارئ.")
  );
}
