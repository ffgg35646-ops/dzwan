
import { apiGet, apiPost } from "./request";

export type ComplaintCategory =
  | "shop"
  | "captain"
  | "order"
  | "delivery"
  | "money"
  | "proof";

export async function submitComplaint(payload: {
  type: ComplaintCategory;
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

export async function listComplaints() {
  for (const path of [
    "/complaints/my",
    "/complaints",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return [];
}
