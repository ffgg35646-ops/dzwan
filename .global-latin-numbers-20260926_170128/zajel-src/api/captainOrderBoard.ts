import { api } from "./client";

export async function getCaptainOrderBoard(areaId?: string) {
  const response = await api.get("/orders/captain/board", { params: areaId ? { areaId } : undefined });

  return response.data;
}

export async function claimCaptainOrder(
  orderId: string,
) {
  const response = await api.post(
    `/orders/captain/${orderId}/claim`
  );

  return response.data;
}

export async function rejectCaptainOrder(
  orderId: string,
  reason: string,
) {
  const response = await api.post(
    `/orders/${orderId}/cancel`,
    { reason },
  );

  return response.data;
}
