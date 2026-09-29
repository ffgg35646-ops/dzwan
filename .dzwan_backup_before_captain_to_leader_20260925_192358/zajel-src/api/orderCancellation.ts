import { api } from "./client";

export async function cancelOrder(
  orderId: string,
  reason: string,
) {
  const response = await api.post(
    `/orders/${orderId}/cancel`,
    { reason },
  );

  return response.data;
}
