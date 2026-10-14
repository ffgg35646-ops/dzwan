import { api } from "./client";

export async function checkMaintenance() {
  const response = await api.get(
    "/requirements-30-46/maintenance"
  );
  return response.data;
}

export async function checkAppVersion(
  app: "captain" | "establishment",
  version: string
) {
  const response = await api.get(
    `/requirements-30-46/versions/${app}`,
    {
      params: { version },
    }
  );

  return response.data;
}
