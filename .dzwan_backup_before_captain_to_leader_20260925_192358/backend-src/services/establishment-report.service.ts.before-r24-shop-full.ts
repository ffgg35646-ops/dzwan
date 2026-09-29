import { Types } from "mongoose";
import { OrderModel } from "../models/Order.js";
import { EstablishmentModel } from "../models/Establishment.js";

export async function getEstablishmentReport(
  establishmentId: Types.ObjectId,
  periodFrom: Date,
  periodTo: Date,
) {
  const establishment = await EstablishmentModel.findById(
    establishmentId,
  )
    .select("_id name type status")
    .lean();

  if (!establishment) {
    throw new Error("المنشأة غير موجودة.");
  }

  const match = {
    establishmentId,
    createdAt: {
      $gte: periodFrom,
      $lte: periodTo,
    },
  };

  const [summary] = await OrderModel.aggregate([
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
                $in: [
                  "$status",
                  [
                    "confirmed",
                    "preparing",
                    "ready_for_pickup",
                    "assigned",
                    "picked_up",
                    "on_the_way",
                  ],
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
  ]);

  const data = summary ?? {
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
      from: periodFrom,
      to: periodTo,
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
  };
}
