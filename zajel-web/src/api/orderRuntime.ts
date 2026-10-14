
import {
  apiGet,
  apiPatch,
  apiPost,
} from "./request";

export async function getOrder(orderId: string) {
  return apiGet(`/orders/${orderId}`);
}

export async function getOrders(params?: Record<string, any>) {
  return apiGet("/orders", {
    params,
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  extra?: Record<string, any>
) {
  return apiPatch(
    `/orders/${orderId}/status`,
    {
      status,
      ...extra,
    }
  );
}

export async function assignCaptain(
  orderId: string,
  captainId?: string
) {
  const body = captainId
    ? { captainId }
    : {};

  return apiPost(
    `/orders/${orderId}/assign-captain`,
    body
  );
}

export async function emergencyAlert(
  orderId: string
) {
  return apiPost(
    `/requirements-30-46/orders/${orderId}/emergency`
  );
}
