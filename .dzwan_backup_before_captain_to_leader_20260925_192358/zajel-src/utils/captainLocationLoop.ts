
import { AppState } from "react-native";
import { getCurrentLocation, sendCaptainLocation } from "../api/location";

let timer: ReturnType<typeof setInterval> | null = null;

export function startCaptainLocationLoop() {
  stopCaptainLocationLoop();

  const send = async () => {
    try {
      const location = await getCurrentLocation();

      await sendCaptainLocation(
        location.coords.latitude,
        location.coords.longitude
      );
    } catch {
      // تجاهل فشل تحديث الموقع المؤقت
    }
  };

  send();

  timer = setInterval(send, 30000);

  const subscription = AppState.addEventListener(
    "change",
    (state) => {
      if (state === "active") send();
    }
  );

  return () => {
    stopCaptainLocationLoop();
    subscription.remove();
  };
}

export function stopCaptainLocationLoop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
