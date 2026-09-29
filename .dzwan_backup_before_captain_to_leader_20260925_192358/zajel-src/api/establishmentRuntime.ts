
import * as Location from "expo-location";
import { apiGet, apiPost, apiPatch } from "./request";

export async function registerEstablishment(payload: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}) {
  return apiPost("/establishments", payload);
}

export async function getMyEstablishment() {
  const paths = [
    "/establishments/me",
    "/establishments/my",
    "/establishments",
  ];

  for (const path of paths) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return null;
}

export async function updateEstablishmentLocation(
  latitude: number,
  longitude: number
) {
  const body = { latitude, longitude };

  for (const path of [
    "/establishments/me/location",
    "/establishments/location",
  ]) {
    try {
      return await apiPatch(path, body);
    } catch {}
  }

  return null;
}

export async function getShopLocation() {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("يجب السماح باستخدام الموقع.");
  }

  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}
