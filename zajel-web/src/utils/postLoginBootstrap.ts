
import { registerPushNotifications } from "../api/push";
import { startCaptainLocationService } from "./captainLocationService";

export async function postLoginBootstrap(
  role: "captain" | "shop" | "governorate_leader" | "area_leader"
) {
  try {
    await registerPushNotifications();
  } catch {}

  if (role === "captain") {
    try {
      await startCaptainLocationService();
    } catch {}
  }
}
