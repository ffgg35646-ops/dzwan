
import { apiGet, apiPost } from "./request";

export type ComplaintType =
  | "shop"
  | "captain"
  | "order"
  | "delivery"
  | "money"
  | "proof";

export async function createComplaint(payload: {
  type: ComplaintType;
  orderId?: string;
  title: string;
  description: string;
}) {
  if (!payload.title.trim()) {
    throw new Error("عنوان الشكوى مطلوب.");
  }

  if (!payload.description.trim()) {
    throw new Error("تفاصيل الشكوى مطلوبة.");
  }

  return apiPost("/complaints", {
    type: payload.type,
    orderId: payload.orderId,
    title: payload.title.trim(),
    description: payload.description.trim(),
  });
}

export async function getMyComplaints() {
  const candidates = [
    "/complaints/my",
    "/complaints",
  ];

  for (const path of candidates) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return [];
}
