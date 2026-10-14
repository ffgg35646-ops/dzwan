
import {
  getCaptainLocation,
  publishCaptainLocation,
} from "../api/captainLocation";

let timer: ReturnType<typeof setInterval> | null = null;

async function sendLocation() {
  try {
    const location = await getCaptainLocation();

    await publishCaptainLocation(
      location.coords.latitude,
      location.coords.longitude
    );
  } catch {
    // الموقع قد يكون مغلقًا أو API غير متاح.
  }
}

export async function startCaptainLocationService() {
  stopCaptainLocationService();

  await sendLocation();

  timer = setInterval(
    sendLocation,
    30000
  );
}

export function stopCaptainLocationService() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
