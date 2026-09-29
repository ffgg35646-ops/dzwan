
import { Platform } from "react-native";
import Constants from "expo-constants";
import {
  apiGet,
} from "./request";

export type RuntimeState = {
  maintenance: boolean;
  maintenanceMessage?: string;
  forceUpdate: boolean;
  minimumVersion?: string;
  latestVersion?: string;
};

function compareVersions(a: string, b: string) {
  const aa = a.split(".").map((x) => Number(x) || 0);
  const bb = b.split(".").map((x) => Number(x) || 0);

  for (let i = 0; i < 3; i++) {
    const x = aa[i] ?? 0;
    const y = bb[i] ?? 0;

    if (x > y) return 1;
    if (x < y) return -1;
  }

  return 0;
}

async function firstWorking<T>(
  paths: string[]
): Promise<T | null> {
  for (const path of paths) {
    try {
      return await apiGet(path);
    } catch {
      // continue
    }
  }

  return null;
}

export async function getMaintenance() {
  const data: any = await firstWorking([
    "/requirements-30-46/maintenance",
    "/system/maintenance",
    "/settings/maintenance",
  ]);

  if (!data) {
    return {
      enabled: false,
    };
  }

  return {
    enabled: Boolean(
      data.enabled ??
      data.maintenance ??
      data.maintenanceMode ??
      false
    ),
    message:
      data.message ??
      data.maintenanceMessage ??
      "النظام تحت الصيانة حاليًا.",
  };
}

export async function getRuntimeState(
  role: "captain" | "shop"
): Promise<RuntimeState> {
  const maintenance = await getMaintenance();

  const versionData: any = await firstWorking([
    `/requirements-30-46/versions/${role}`,
    `/app-versions/${role}`,
    `/versions/${role}`,
  ]);

  const currentVersion =
    Constants.expoConfig?.version ?? "1.0.0";

  const minimumVersion =
    versionData?.minimumVersion ??
    versionData?.minVersion ??
    versionData?.minimum_supported_version;

  const latestVersion =
    versionData?.latestVersion ??
    versionData?.currentVersion ??
    versionData?.version;

  const forceUpdateFromBackend = Boolean(
    versionData?.forceUpdate ??
    versionData?.force_update ??
    false
  );

  const belowMinimum =
    minimumVersion
      ? compareVersions(currentVersion, minimumVersion) < 0
      : false;

  return {
    maintenance: maintenance.enabled,
    maintenanceMessage: maintenance.message,
    forceUpdate: forceUpdateFromBackend || belowMinimum,
    minimumVersion,
    latestVersion,
  };
}

export function getPlatform() {
  return Platform.OS;
}
