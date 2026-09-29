import { api } from "./client";

export async function getLeaderDashboard() {
  const response = await api.get(
    "/leaders/me/dashboard",
  );

  return response.data;
}

export async function getLeaderOrders() {
  const response = await api.get(
    "/leaders/me/orders",
  );

  return response.data;
}

export async function getLeaderCaptains() {
  const response = await api.get(
    "/leaders/me/captains",
  );

  return response.data;
}

export async function getLeaderEstablishments() {
  const response = await api.get(
    "/leaders/me/establishments",
  );

  return response.data;
}

export async function getLeaderScope() {
  const response = await api.get(
    "/leaders/me/scope",
  );

  return response.data;
}
