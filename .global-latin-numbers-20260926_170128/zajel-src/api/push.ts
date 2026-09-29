
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiPost } from "./request";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushNotifications() {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) {
    return null;
  }

  let permissions =
    await Notifications.getPermissionsAsync();

  if (permissions.status !== "granted") {
    permissions =
      await Notifications.requestPermissionsAsync();
  }

  if (permissions.status !== "granted") {
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

  const token =
    await Notifications.getExpoPushTokenAsync();

  for (const path of [
    "/notifications/register-device",
    "/notifications/device",
  ]) {
    try {
      await apiPost(path, {
        token: token.data,
        platform: Platform.OS,
      });
      break;
    } catch {}
  }

  return token.data;
}
