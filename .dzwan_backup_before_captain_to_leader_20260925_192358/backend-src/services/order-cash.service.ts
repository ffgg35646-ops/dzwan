import { Types } from "mongoose";
import CaptainCashTransactionModel from "../models/CaptainCashTransaction.js";
import { OrderModel } from "../models/Order.js";

export async function recordOrderCashToEstablishment(
  orderId: Types.ObjectId,
  captainId: Types.ObjectId,
) {
  const order = await OrderModel.findById(orderId).lean();

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const existing = await CaptainCashTransactionModel.findOne({
    orderId,
    captainId,
    type: "paid_to_establishment",
  }).lean();

  if (existing) {
    return {
      created: false,
      message: "تم تسجيل دفع قيمة الطلب للمحل مسبقًا.",
    };
  }

  await CaptainCashTransactionModel.create({
    captainId,
    orderId,
    type: "paid_to_establishment",
    amount: order.subtotal,
    description: "الكابتن دفع قيمة الطلب للمطعم/المحل واستلم الطلب.",
  });

  return { created: true };
}

export async function recordOrderCashCollectedFromCustomer(
  orderId: Types.ObjectId,
  captainId: Types.ObjectId,
) {
  const order = await OrderModel.findById(orderId).lean();

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const existing = await CaptainCashTransactionModel.findOne({
    orderId,
    captainId,
    type: "collected_from_customer",
  }).lean();

  if (!existing) {
    await CaptainCashTransactionModel.create({
      captainId,
      orderId,
      type: "collected_from_customer",
      amount: order.total,
      description: "إجمالي المبلغ المحصل من الزبون.",
    });
  }

  const deliveryFee = await CaptainCashTransactionModel.findOne({
    orderId,
    captainId,
    type: "delivery_fee",
  }).lean();

  if (!deliveryFee) {
    await CaptainCashTransactionModel.create({
      captainId,
      orderId,
      type: "delivery_fee",
      amount: order.deliveryFee,
      description: "أجرة التوصيل المحصلة من الزبون.",
    });
  }

  return {
    created: true,
    collectedFromCustomer: order.total,
    deliveryFee: order.deliveryFee,
  };
}

// Backward-compatible helper.
export async function recordOrderCashFlow(
  orderId: Types.ObjectId,
  captainId: Types.ObjectId,
) {
  await recordOrderCashToEstablishment(
    orderId,
    captainId,
  );

  return recordOrderCashCollectedFromCustomer(
    orderId,
    captainId,
  );
}
