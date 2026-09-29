import { SystemSettingsModel } from "../models/SystemSettings.js";
import {
  cacheGet,
  cacheSet,
  cacheDelete,
} from "./cache.service.js";

const CACHE_KEY = "system-settings";

export async function getSystemSettings() {
  const cached = cacheGet<Record<string, unknown>>(CACHE_KEY);

  if (cached) return cached;

  const settings =
    (await SystemSettingsModel.findOne().lean()) ??
    (await SystemSettingsModel.create({})).toObject();

  return cacheSet(
    CACHE_KEY,
    settings,
    30_000,
  );
}

export async function updateSystemSettings(
  data: Record<string, unknown>,
) {
  const settings =
    (await SystemSettingsModel.findOne()) ??
    new SystemSettingsModel();

  Object.assign(settings, data);

  await settings.save();

  cacheDelete(CACHE_KEY);

  return settings.toObject();
}
