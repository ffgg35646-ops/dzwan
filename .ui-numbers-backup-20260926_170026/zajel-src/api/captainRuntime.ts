import { api } from "./client";

export async function setCaptainOnline(
  captainId: string,
  online: boolean
) {
  const response = await api.patch(
    `/requirements/captains/${captainId}/online`,
    { online }
  );
  return response.data;
}

export async function getCaptainCashStatement(
  captainId: string
) {
  const response = await api.get(
    `/requirements/captains/${captainId}/cash-statement`
  );
  return response.data;
}

export async function getCaptainRating(
  captainId: string
) {
  const response = await api.get(
    `/requirements/captains/${captainId}/rating`
  );
  return response.data;
}

export async function getCaptainKpi(
  captainId: string
) {
  const response = await api.get(
    `/requirements/captains/${captainId}/kpi`
  );
  return response.data;
}
