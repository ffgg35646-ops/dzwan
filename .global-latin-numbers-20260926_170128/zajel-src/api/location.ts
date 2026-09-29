import * as clientModule from "./client";

const client: any =
  (clientModule as any).client ??
  (clientModule as any).apiClient ??
  (clientModule as any).axiosClient ??
  (clientModule as any).default;

if (!client) {
  throw new Error("لم يتم العثور على API client داخل src/api/client.ts");
}


import * as Location from "expo-location";
export async function requestLocationPermission() {
  const result = await Location.requestForegroundPermissionsAsync();

  if (result.status !== "granted") {
    throw new Error("لم يتم السماح باستخدام الموقع.");
  }

  return true;
}

export async function getCurrentLocation() {
  await requestLocationPermission();

  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

export async function sendCaptainLocation(
  latitude: number,
  longitude: number
) {
  const candidates = [
    "/captains/location",
    "/captain/location",
    "/captains/me/location",
  ];

  for (const path of candidates) {
    try {
      return await client.patch(path, {
        latitude,
        longitude,
      });
    } catch {
      // جرّب المسار التالي
    }
  }

  return null;
}
