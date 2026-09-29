import { Types } from "mongoose";
import { OrderModel } from "../models/Order.js";
import { EstablishmentModel } from "../models/Establishment.js";

export async function getEstablishmentReport(
  establishmentId: Types.ObjectId,
  periodFrom?: Date,
  periodTo?: Date,
) {
  const establishment = await EstablishmentModel.findById(
    establishmentId,
  )
    .select("_id name type status")
    .lean();

  if (!establishment) {
    throw new Error("المنشأة غير موجودة.");
  }

  const match: Record<string, any> = {
    establishmentId,
  };

  if (periodFrom || periodTo) {
    match.createdAt = {};

    if (periodFrom) {
      match.createdAt.$gte = periodFrom;
    }

    if (periodTo) {
      match.createdAt.$lte = periodTo;
    }
  }

  const [summary, rows] = await Promise.all([
    OrderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,

          totalOrders: { $sum: 1 },

          pendingOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", "pending"] },
                1,
                0,
              ],
            },
          },

          activeOrders: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "delivered"] },
                    { $ne: ["$status", "completed"] },
                    { $ne: ["$status", "cancelled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },

          deliveredOrders: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["delivered", "completed"],
                  ],
                },
                1,
                0,
              ],
            },
          },

          cancelledOrders: {
            $sum: {
              $cond: [
                { $eq: ["$status", "cancelled"] },
                1,
                0,
              ],
            },
          },

          subtotal: {
            $sum: "$subtotal",
          },

          deliveryFees: {
            $sum: "$deliveryFee",
          },

          grossRevenue: {
            $sum: "$total",
          },
        },
      },
    ]),

    OrderModel.find(match)
      .select(
        "orderNumber createdAt status captainId subtotal total deliveryFee",
      )
      .populate({
        path: "captainId",
        select: "fullName name phone",
      })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const data = summary[0] ?? {
    totalOrders: 0,
    pendingOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    subtotal: 0,
    deliveryFees: 0,
    grossRevenue: 0,
  };

  const averageOrderValue =
    data.totalOrders > 0
      ? Number(
          (data.grossRevenue / data.totalOrders).toFixed(2),
        )
      : 0;

  return {
    establishment,

    period: {
      from: periodFrom ?? null,
      to: periodTo ?? null,
    },

    orders: {
      total: data.totalOrders,
      pending: data.pendingOrders,
      active: data.activeOrders,
      delivered: data.deliveredOrders,
      cancelled: data.cancelledOrders,
    },

    revenue: {
      subtotal: data.subtotal,
      deliveryFees: data.deliveryFees,
      gross: data.grossRevenue,
      averageOrderValue,
    },

    rows: rows.map((order: any) => ({
      id: String(order._id),
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      captain: order.captainId
        ? {
            id: String(order.captainId._id),
            name:
              order.captainId.fullName ??
              order.captainId.name ??
              "—",
            phone: order.captainId.phone ?? null,
          }
        : null,
      subtotal: Number(order.subtotal ?? 0),
      total: Number(order.total ?? 0),
      deliveryFee: Number(order.deliveryFee ?? 0),
    })),
  };
}
