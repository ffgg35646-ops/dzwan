
import {
  apiGet,
  apiPost
} from "./request";

export type ComplaintType =
  | "shop"
  | "captain"
  | "order"
  | "delivery"
  | "money"
  | "proof";

export async function submitComplaint(payload: {
  type: ComplaintType;
  orderId?: string;
  title: string;
  description: string;
}) {
  const body: any = {
    type: payload.type,
    title: String(payload.title || "").trim(),
    description: String(payload.description || "").trim(),
  };

  if (payload.orderId?.trim()) {
    body.orderId = payload.orderId.trim();
  }

  const response = await apiPost(
    "/complaints",
    body,
  );

  return response.data;
}

export async function listComplaints() {
  const response = await apiGet(
    "/complaints/my",
  );

  return response.data;
}
