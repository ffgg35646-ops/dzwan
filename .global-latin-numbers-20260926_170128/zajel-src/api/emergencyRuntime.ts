
import { apiPost } from "./request";

export async function sendCaptainEmergency(
  orderId?: string,
  message?: string
) {
  const payload = {
    orderId,
    message:
      message?.trim() ||
      "تم إرسال تنبيه طوارئ من تطبيق الكابتن.",
  };

  const candidates = [
    orderId
      ? `/requirements-30-46/orders/${orderId}/emergency`
      : null,
    "/requirements-30-46/emergency",
    "/emergency",
  ].filter(Boolean) as string[];

  let lastError: unknown = null;

  for (const path of candidates) {
    try {
      return await apiPost(path, payload);
    } catch (error) {
      lastError = error;
    }
  }

  throw (
    lastError ??
    new Error("تعذر إرسال تنبيه الطوارئ.")
  );
}
