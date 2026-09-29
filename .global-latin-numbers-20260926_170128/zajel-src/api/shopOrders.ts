import { api as client } from "./client";


export type CreateShopOrderPayload = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerNote?: string;
  subtotal: number;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export async function createShopOrder(payload: CreateShopOrderPayload) {
  const normalized = {
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    deliveryAddress: payload.deliveryAddress.trim(),
    customerNote: payload.customerNote?.trim() || undefined,
    subtotal: Number(payload.subtotal),
    items: payload.items ?? [],
  };

  return client.post("/orders", normalized);
}

export async function getShopOrders() {
  return client.get("/orders");
}

export async function getShopOrder(orderId: string) {
  return client.get(`/orders/${orderId}`);
}


export async function getMyEstablishmentReport(
  params?: Record<string, string>,
) {
  return client.get(
    "/reports/establishments/me",
    {
      params,
    },
  );
}
