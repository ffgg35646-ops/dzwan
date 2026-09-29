import { Types } from "mongoose";
import CaptainCashTransactionModel from "../models/CaptainCashTransaction.js";
import { OrderModel } from "../models/Order.js";

export async function recordCaptainCash(
  input: {
    captainId: Types.ObjectId;
    orderId?: Types.ObjectId | null;
    type:
      | "paid_to_establishment"
      | "collected_from_customer"
      | "delivery_fee"
      | "adjustment";
    amount: number;
    description?: string | null;
  },
) {
  if (input.amount < 0) {
    throw new Error("قيمة الحركة النقدية لا يمكن أن تكون سالبة.");
  }

  return CaptainCashTransactionModel.create(input);
}

export async function getCaptainCashStatement(
  captainId: Types.ObjectId,
  from: Date,
  to: Date,
) {
  // كشف الحساب يعتمد على الطلبات المكتملة فقط.
  const completedOrders =
    await OrderModel.find({
      captainId,
      status: {
        $in: ["delivered", "completed"],
      },
      $or: [
        {
          deliveredAt: {
            $gte: from,
            $lte: to,
          },
        },
        {
          deliveredAt: null,
          updatedAt: {
            $gte: from,
            $lte: to,
          },
        },
      ],
    })
      .select(
        "_id orderNumber subtotal deliveryFee total deliveredAt updatedAt createdAt"
      )
      .sort({
        deliveredAt: 1,
        updatedAt: 1,
      })
      .lean();

  const orders = completedOrders.map((order) => {
    const subtotal = Number(order.subtotal || 0);
    const deliveryFee = Number(order.deliveryFee || 0);
    const total = Number(
      order.total ?? subtotal + deliveryFee,
    );

    return {
      orderId: String(order._id),
      orderNumber:
        order.orderNumber ||
        String(order._id),
      completedAt:
        order.deliveredAt ||
        order.updatedAt ||
        order.createdAt ||
        null,

      orderValue: subtotal,
      deliveryFee,
      collectedFromCustomer: total,

      // المبلغ الذي يعود للمطعم/المحل.
      paidToEstablishment: subtotal,
    };
  });

  const paidToEstablishments = orders.reduce(
    (sum, order) =>
      sum + order.paidToEstablishment,
    0,
  );

  const collectedFromCustomers = orders.reduce(
    (sum, order) =>
      sum + order.collectedFromCustomer,
    0,
  );

  const deliveryFees = orders.reduce(
    (sum, order) =>
      sum + order.deliveryFee,
    0,
  );

  return {
    orders: orders.length,
    numberOfOrders: orders.length,

    paidToEstablishments,
    collectedFromCustomers,
    deliveryFees,

    // المبلغ الذي استلمه الكابتن من الزبائن
    // ناقص قيمة الطلب التي يفترض تسليمها للمحل.
    cashDifference:
      collectedFromCustomers -
      paidToEstablishments,

    totalOrderValue: orders.reduce(
      (sum, order) =>
        sum + order.orderValue,
      0,
    ),

    completedOrders: orders,

    // نحتفظ به للتوافق مع الواجهات القديمة.
    transactions: [],
    totalTransactions: 0,
    adjustments: 0,
  };
}
