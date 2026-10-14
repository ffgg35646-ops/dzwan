
import * as Location from "expo-location";
import { apiGet, apiPost, apiPatch } from "./request";

export async function registerShop(payload: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}) {
  if (!payload.name.trim()) {
    throw new Error("اسم المحل مطلوب.");
  }

  if (!payload.phone.trim()) {
    throw new Error("رقم الهاتف مطلوب.");
  }

  return apiPost("/establishments", {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || undefined,
    address: payload.address?.trim() || undefined,
    latitude: payload.latitude,
    longitude: payload.longitude,
  });
}

export async function getCurrentShopLocation() {
  const permission =
    await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    throw new Error("يجب السماح باستخدام الموقع.");
  }

  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
}

export async function saveShopLocation(
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

export async function getMyShop() {
  for (const path of [
    "/establishments/me",
    "/establishments/my",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return null;
}
