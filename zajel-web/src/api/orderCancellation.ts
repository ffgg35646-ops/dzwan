import { api } from "./client";

export async function cancelOrder(
  orderId: string,
  reason: string,
  actor: "shop" | "captain" = "shop",
) {
  const endpoint =
    actor === "captain"
      ? `/orders/captain/${orderId}/reject`
      : `/ops/orders/${orderId}/cancel`;

  const response = await api.post(endpoint, { reason });

  return response.data;
}
