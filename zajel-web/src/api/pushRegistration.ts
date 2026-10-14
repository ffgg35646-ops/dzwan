
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiPost } from "./request";

export async function registerPushToken() {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) {
    return null;
  }

  const current =
    await Notifications.getPermissionsAsync();

  let status = current.status;

  if (status !== "granted") {
    const requested =
      await Notifications.requestPermissionsAsync();

    status = requested.status;
  }

  if (status !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      "default",
      {
        name: "زاجل",
        importance:
          Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      }
    );
  }

  let token: { data: string } | null = null;

  try {
    token = await Notifications.getExpoPushTokenAsync({
      projectId: "1bb77e28-798b-4b96-b924-79141ad2030a",
    });
  } catch (error) {
    console.warn(
      "Push token unavailable; continuing registration without push token.",
      error,
    );
    return null;
  }

  const payload = {
    token: token.data,
    platform: Platform.OS,
  };

  for (const path of [
    "/notifications/register-device",
    "/notifications/device",
  ]) {
    try {
      await apiPost(path, payload);
      break;
    } catch {}
  }

  return token.data;
}
