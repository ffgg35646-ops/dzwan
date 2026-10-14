
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

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    return null;
  }

  const permission =
    await Notifications.getPermissionsAsync();

  let status = permission.status;

  if (status !== "granted") {
    const requested =
      await Notifications.requestPermissionsAsync();

    status = requested.status;
  }

  if (status !== "granted") {
    return null;
  }

  let token: { data: string } | null = null;

  try {
    token = await Notifications.getExpoPushTokenAsync({
      projectId: "1bb77e28-798b-4b96-b924-79141ad2030a",
    });
  } catch (error) {
    console.warn(
      "Push token unavailable; continuing without push registration.",
      error,
    );
    return null;
  }

  try {
    await apiPost(
      "/notifications/register-device",
      {
        token: token.data,
        platform: Platform.OS,
      }
    );
  } catch {
    // Backend قد يستخدم مسارًا مختلفًا حاليًا.
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

  return token.data;
}
