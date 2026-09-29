import mongoose from "mongoose";
import CoreOperationsSettingsModel from "../models/CoreOperationsSettings.js";
import { LocationModel } from "../models/Location.js";

export type PricingMode =
  | "area_to_area"
  | "geofencing";

export interface OrderGeoInput {
  governorateId?: string | null;
  areaId?: string | null;
  establishmentLatitude?: number | null;
  establishmentLongitude?: number | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
}

function id(value: unknown) {
  if (!value) return null;
  const s = String(value);
  return mongoose.isValidObjectId(s)
    ? new mongoose.Types.ObjectId(s)
    : null;
}

export async function getCoreSettings() {
  let settings =
    await CoreOperationsSettingsModel.findOne();

  if (!settings) {
    settings =
      await CoreOperationsSettingsModel.create({});
  }

  return settings;
}

export async function assertLocationActive(
  governorateId: string,
  areaId?: string | null
) {
  const gov = await LocationModel.findById(
    id(governorateId)
  );

  if (!gov) {
    throw new Error("GOVERNORATE_NOT_FOUND");
  }

  if (!(gov as any).isActive) {
    throw new Error("GOVERNORATE_INACTIVE");
  }

  if (areaId) {
    const area = (gov as any).areas?.find(
      (x: any) =>
        String(x._id) === String(areaId)
    );

    if (!area) {
      throw new Error("AREA_NOT_FOUND");
    }

    if (!area.isActive) {
      throw new Error("AREA_INACTIVE");
    }
  }

  return gov;
}

export function assertCoordinates(
  latitude: unknown,
  longitude: unknown
) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    throw new Error("INVALID_COORDINATES");
  }

  if (lat < -90 || lat > 90) {
    throw new Error("INVALID_LATITUDE");
  }

  if (lng < -180 || lng > 180) {
    throw new Error("INVALID_LONGITUDE");
  }

  return {
    latitude: lat,
    longitude: lng,
  };
}

export async function resolvePricingMode(): Promise<PricingMode> {
  const settings =
    await getCoreSettings();

  return settings.pricingMode;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;
  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;
  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.asin(Math.sqrt(a))
  );
}
