import * as clientModule from "./client";

const client: any =
  (clientModule as any).client ??
  (clientModule as any).apiClient ??
  (clientModule as any).axiosClient ??
  (clientModule as any).default;

if (!client) {
  throw new Error("لم يتم العثور على API client داخل src/api/client.ts");
}


export type AppGateResult = {
  maintenance: boolean;
  message?: string;
  forceUpdate: boolean;
  minimumVersion?: string;
  currentVersion?: string;
};

function versionParts(version: string) {
  return version
    .split(".")
    .map((x) => Number.parseInt(x, 10) || 0)
    .slice(0, 3)
    .concat([0, 0, 0])
    .slice(0, 3);
}

export function compareVersions(a: string, b: string) {
  const av = versionParts(a);
  const bv = versionParts(b);

  for (let i = 0; i < 3; i++) {
    if (av[i] > bv[i]) return 1;
    if (av[i] < bv[i]) return -1;
  }

  return 0;
}

async function tryGet<T>(paths: string[]): Promise<T | null> {
  for (const path of paths) {
    try {
      const response = await client.get(path);
      return response.data;
    } catch {
      // جرّب المسار التالي
    }
  }

  return null;
}

export async function getMaintenanceState(): Promise<{
  enabled: boolean;
  message?: string;
}> {
  const result = await tryGet<any>([
    "/requirements-30-46/maintenance",
    "/system/maintenance",
    "/settings/maintenance",
  ]);

  if (!result) {
    return { enabled: false };
  }

  const data = result.data ?? result;

  return {
    enabled: Boolean(
      data.enabled ??
      data.maintenanceMode ??
      data.maintenance ??
      false
    ),
    message:
      data.message ??
      data.maintenanceMessage ??
      "النظام تحت الصيانة حاليًا. حاول مرة أخرى لاحقًا.",
  };
}

export async function getAppVersion(
  accountType: "captain" | "shop"
): Promise<{
  currentVersion?: string;
  minimumVersion?: string;
  forceUpdate: boolean;
}> {
  const candidates =
    accountType === "captain"
      ? [
          "/requirements-30-46/versions/captain",
          "/app-versions/captain",
          "/versions/captain",
        ]
      : [
          "/requirements-30-46/versions/shop",
          "/app-versions/shop",
          "/versions/shop",
        ];

  const result = await tryGet<any>(candidates);

  if (!result) {
    return {
      forceUpdate: false,
    };
  }

  const data = result.data ?? result;

  const minimumVersion =
    data.minimumVersion ??
    data.minVersion ??
    data.minimum_supported_version;

  const currentVersion =
    data.currentVersion ??
    data.version ??
    data.latestVersion;

  return {
    currentVersion,
    minimumVersion,
    forceUpdate: Boolean(
      data.forceUpdate ??
      data.force_update ??
      false
    ),
  };
}
