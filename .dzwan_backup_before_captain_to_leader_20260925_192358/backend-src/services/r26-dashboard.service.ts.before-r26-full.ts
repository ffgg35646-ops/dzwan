import { OrderModel } from "../models/Order.js";
import { UserModel } from "../models/User.js";
import { EstablishmentModel } from "../models/Establishment.js";

export async function getOperationsDashboard() {
  const start = new Date();
  start.setHours(
    0, 0, 0, 0
  );

  const [
    todayOrders,
    activeOrders,
    onlineCaptains,
    activeEstablishments,
  ] = await Promise.all([
    OrderModel.countDocuments({
      createdAt: { $gte: start },
    }),

    OrderModel.countDocuments({
      status: {
        $nin: [
          "delivered",
          "cancelled",
        ],
      },
    } as any),

    UserModel.countDocuments({
      role: "captain",
      isOnline: true,
    } as any),

    EstablishmentModel.countDocuments({
      status: {
        $in: [
          "active",
          "approved",
        ],
      },
    } as any),
  ]);

  const establishmentActivity =
    await OrderModel.aggregate([
      {
        $group: {
          _id: "$establishmentId",
          orders: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          orders: -1,
        },
      },
      {
        $limit: 10,
      },
    ]);

  const areaActivity =
    await OrderModel.aggregate([
      {
        $group: {
          _id: "$areaId",
          orders: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          orders: -1,
        },
      },
      {
        $limit: 10,
      },
    ]);

  return {
    todayOrders,
    activeOrders,
    onlineCaptains,
    activeEstablishments,
    establishmentActivity,
    areaActivity,
  };
}
