import { api } from "./client";

export async function getShopOrders() {
  const r = await api.get("/orders");
  return r.data;
}

export async function createShopOrder(payload: unknown) {
  const r = await api.post("/orders", payload);
  return r.data;
}
