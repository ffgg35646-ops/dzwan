
import * as Location from "expo-location";
import {
  apiPatch,
  apiPost,
} from "./request";

export async function getCaptainLocation() {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error(
      "يجب السماح باستخدام الموقع للكابتن."
    );
  }

  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

export async function publishCaptainLocation(
  latitude: number,
  longitude: number
) {
  const payload = {
    latitude,
    longitude,
  };

  const paths = [
    "/captains/me/location",
  ];

  for (const path of paths) {
    try {
      return await apiPatch(path, payload);
    } catch {
      try {
        return await apiPost(path, payload);
      } catch {
        // try next
      }
    }
  }

  throw new Error(
    "لم يتم العثور على مسار API لتحديث موقع الكابتن."
  );
}
