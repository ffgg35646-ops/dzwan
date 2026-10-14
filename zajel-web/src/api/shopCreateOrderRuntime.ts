
import { apiPost } from "./request";

export type OrderCustomerInput = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerNote?: string;
  subtotal: number;
};

export async function createRealShopOrder(
  input: OrderCustomerInput
) {
  if (!input.customerName.trim()) {
    throw new Error("اسم العميل مطلوب.");
  }

  if (!input.customerPhone.trim()) {
    throw new Error("رقم هاتف العميل مطلوب.");
  }

  if (!input.deliveryAddress.trim()) {
    throw new Error("عنوان التوصيل مطلوب.");
  }

  if (!Number.isFinite(Number(input.subtotal))) {
    throw new Error("قيمة الطلب غير صحيحة.");
  }

  return apiPost("/orders", {
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    customerNote:
      input.customerNote?.trim() || undefined,
    subtotal: Number(input.subtotal),
  });
}

export async function confirmShopOrder(orderId: string) {
  return apiPost(`/orders/${orderId}/status`, {
    status: "confirmed",
  });
}
