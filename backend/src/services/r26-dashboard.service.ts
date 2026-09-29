import { OrderModel } from "../models/Order.js";
import { UserModel } from "../models/User.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { LocationModel } from "../models/Location.js";

export async function getOperationsDashboard() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const todayMatch = {
    createdAt: { $gte: start },
  };

  const [
    todayOrders,
    activeOrders,
    onlineCaptains,
    activeEstablishments,
    latestOrders,
    todayStatusCounts,
    establishmentActivityRaw,
    areaActivityRaw,
  ] = await Promise.all([
    OrderModel.countDocuments(todayMatch),

    OrderModel.countDocuments({
      status: {
        $nin: [
          "delivered",
          "completed",
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

    OrderModel.find({})
      .select(
        "orderNumber status total createdAt captainId establishmentId"
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

    OrderModel.aggregate([
      {
        $match: todayMatch,
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
    ]),

    OrderModel.aggregate([
      {
        $match: todayMatch,
      },
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
        $limit: 20,
      },
    ]),

    OrderModel.aggregate([
      {
        $match: todayMatch,
      },
      {
        $group: {
          _id: "$deliveryAreaId",
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
        $limit: 20,
      },
    ]),
  ]);

  const establishmentIds =
    establishmentActivityRaw
      .map((item: any) => item._id)
      .filter(Boolean);

  const establishments =
    establishmentIds.length > 0
      ? await EstablishmentModel.find({
          _id: {
            $in: establishmentIds,
          },
        })
          .select("_id name type")
          .lean()
      : [];

  const establishmentMap = new Map(
    establishments.map((item: any) => [
      String(item._id),
      item,
    ])
  );

  const topRestaurants =
    establishmentActivityRaw
      .map((item: any) => {
        const establishment =
          establishmentMap.get(
            String(item._id)
          );

        if (
          !establishment ||
          establishment.type !== "restaurant"
        ) {
          return null;
        }

        return {
          id: String(establishment._id),
          name: establishment.name,
          orders: Number(item.orders || 0),
        };
      })
      .filter(Boolean)
      .slice(0, 5);

  const topShops =
    establishmentActivityRaw
      .map((item: any) => {
        const establishment =
          establishmentMap.get(
            String(item._id)
          );

        if (
          !establishment ||
          establishment.type !== "shop"
        ) {
          return null;
        }

        return {
          id: String(establishment._id),
          name: establishment.name,
          orders: Number(item.orders || 0),
        };
      })
      .filter(Boolean)
      .slice(0, 5);

  const locations =
    await LocationModel.find({})
      .select("areas")
      .lean();

  const areaMap = new Map<string, string>();

  for (const location of locations as any[]) {
    for (const area of location.areas || []) {
      areaMap.set(
        String(area._id),
        String(area.name || "—"),
      );
    }
  }

  const topAreas =
    areaActivityRaw
      .map((item: any) => ({
        id: String(item._id || ""),
        name:
          areaMap.get(String(item._id)) ||
          "منطقة غير معروفة",
        orders: Number(item.orders || 0),
      }))
      .filter((item: any) => item.id)
      .slice(0, 5);

  const statusMap = new Map(
    todayStatusCounts.map((item: any) => [
      String(item._id),
      Number(item.count || 0),
    ])
  );

  const todayOrderStatistics = {
    total: todayOrders,
    pending: statusMap.get("pending") || 0,
    active:
      Array.from(statusMap.entries())
        .filter(
          ([status]) =>
            ![
              "delivered",
              "completed",
              "cancelled",
            ].includes(status)
        )
        .reduce(
          (sum, [, count]) =>
            sum + count,
          0,
        ),
    delivered:
      (statusMap.get("delivered") || 0) +
      (statusMap.get("completed") || 0),
    cancelled:
      statusMap.get("cancelled") || 0,
  };

  return {
    period: {
      from: start,
      to: new Date(),
      label: "اليوم",
    },

    todayOrders,
    activeOrders,
    onlineCaptains,
    activeEstablishments,

    todayOrderStatistics,

    topRestaurants,
    topShops,
    topAreas,

    latestOrders,
  };
}
