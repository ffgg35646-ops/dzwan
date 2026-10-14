import { apiGet } from "./request";

export async function getMyWorkAreas(captainId: string) {
  return await apiGet(
    `/requirements/captains/${captainId}/work-areas`,
  );
}
