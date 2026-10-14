
import { apiPost } from "./request";

export type ShopOrderInput = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  subtotal: number;
  customerNote?: string;
};

export async function createShopOrder(
  input: ShopOrderInput
) {
  /*
   * لا ننشئ IDs وهمية للعميل/العنوان/المنتجات.
   * يتم إرسال بيانات العميل كما هي، والـBackend هو المسؤول
   * عن استخدام الـsnapshot/service الحالي عند دعم هذا الشكل.
   */

  return apiPost("/orders", {
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    deliveryAddress: input.deliveryAddress.trim(),
    subtotal: Number(input.subtotal),
    customerNote:
      input.customerNote?.trim() || undefined,
  });
}
