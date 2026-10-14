
import Constants from "expo-constants";
import { apiGet } from "./request";

function compareVersions(a: string, b: string) {
  const aa = a.split(".").map((x) => Number(x) || 0);
  const bb = b.split(".").map((x) => Number(x) || 0);

  for (let i = 0; i < 3; i++) {
    if ((aa[i] ?? 0) > (bb[i] ?? 0)) return 1;
    if ((aa[i] ?? 0) < (bb[i] ?? 0)) return -1;
  }

  return 0;
}

async function first(paths: string[]) {
  for (const path of paths) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return null;
}

export async function finalRuntimeCheck(
  role: "captain" | "shop"
) {
  const maintenance: any = await first([
    "/requirements-30-46/maintenance",
    "/system/maintenance",
    "/settings/maintenance",
  ]);

  const versions: any = await first([
    `/requirements-30-46/versions/${role}`,
    `/app-versions/${role}`,
    `/versions/${role}`,
  ]);

  const current =
    Constants.expoConfig?.version ?? "1.0.0";

  const minimum =
    versions?.minimumVersion ??
    versions?.minVersion ??
    versions?.minimum_supported_version;

  return {
    maintenance: Boolean(
      maintenance?.enabled ??
      maintenance?.maintenance ??
      maintenance?.maintenanceMode ??
      false
    ),

    maintenanceMessage:
      maintenance?.message ??
      maintenance?.maintenanceMessage ??
      "",

    currentVersion: current,

    latestVersion:
      versions?.latestVersion ??
      versions?.currentVersion ??
      versions?.version,

    minimumVersion: minimum,

    forceUpdate:
      Boolean(
        versions?.forceUpdate ??
        versions?.force_update ??
        false
      ) ||
      Boolean(
        minimum &&
        compareVersions(current, minimum) < 0
      ),
  };
}
