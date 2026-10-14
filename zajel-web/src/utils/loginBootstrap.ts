
import { registerPushNotifications } from "../api/push";
import { startCaptainLocationService } from "./captainLocationService";

export async function bootstrapLogin(
  role: "captain" | "shop" | "governorate_leader" | "area_leader"
) {
  try {
    await registerPushNotifications();
  } catch {
    // عدم منع الدخول إذا رفض المستخدم الإشعارات.
  }

  if (role === "captain") {
    try {
      await startCaptainLocationService();
    } catch {
      // الموقع يُفعّل عندما يسمح به المستخدم.
    }
  }
}
