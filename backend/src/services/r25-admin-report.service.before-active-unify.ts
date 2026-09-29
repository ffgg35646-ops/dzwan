import { OrderModel } from "../models/Order.js";
import { EstablishmentModel } from "../models/Establishment.js";

export interface AdminReportFilter {
  governorateId?: string;
  areaId?: string;
  establishmentId?: string;
  establishmentType?: "restaurant" | "shop";
  captainId?: string;
  status?: string;
  start?: Date;
  end?: Date;
}

function getPeriodKey(date: Date, period: "daily" | "weekly" | "monthly") {
  const d = new Date(date);

  if (period === "monthly") {
    return `${d.getUTCFullYear()}-${String(
      d.getUTCMonth() + 1
    ).padStart(2, "0")}`;
  }

  if (period === "weekly") {
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;

    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);

    return monday.toISOString().slice(0, 10);
  }

  return d.toISOString().slice(0, 10);
}

function buildStatistics(
  orders: Array<{ createdAt?: Date | string; status?: string }>
) {
  const build = (period: "daily" | "weekly" | "monthly") => {
    const groups = new Map<
      string,
      {
        period: string;
        totalOrders: number;
        completed: number;
        cancelled: number;
        active: number;
      }
    >();

    for (const order of orders) {
      if (!order.createdAt) continue;

      const key = getPeriodKey(
        new Date(order.createdAt),
        period
      );

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          totalOrders: 0,
          completed: 0,
          cancelled: 0,
          active: 0,
        });
      }

      const item = groups.get(key)!;

      item.totalOrders++;

      if (
        order.status === "delivered" ||
        order.status === "completed"
      ) {
        item.completed++;
      } else if (order.status === "cancelled") {
        item.cancelled++;
      } else {
        item.active++;
      }
    }

    return Array.from(groups.values()).sort((a, b) =>
      b.period.localeCompare(a.period)
    );
  };

  return {
    daily: build("daily"),
    weekly: build("weekly"),
    monthly: build("monthly"),
  };
}

export async function getAdminReport(
  input: AdminReportFilter
) {
  /*
   * Orders لا تحتوي governorateId أو areaId.
   * لذلك نبحث أولًا عن المنشآت المطابقة،
   * ثم نستخدم establishmentId داخل الطلبات.
   */

  const establishmentFilter: Record<string, any> = {};

  if (input.governorateId) {
    establishmentFilter.governorateId =
      input.governorateId;
  }

  if (input.areaId) {
    establishmentFilter.areaId =
      input.areaId;
  }

  if (input.establishmentId) {
    establishmentFilter._id =
      input.establishmentId;
  }

  if (input.establishmentType) {
    establishmentFilter.type =
      input.establishmentType;
  }

  const establishments =
    await EstablishmentModel.find(
      establishmentFilter,
      { _id: 1 }
    ).lean();

  const establishmentIds =
    establishments.map((x) => x._id);

  const filter: Record<string, any> = {
    establishmentId: {
      $in: establishmentIds,
    },
  };

  if (input.captainId) {
    filter.captainId =
      input.captainId;
  }

  if (input.status) {
    filter.status =
      input.status;
  }

  if (input.start || input.end) {
    filter.createdAt = {};

    if (input.start) {
      filter.createdAt.$gte =
        input.start;
    }

    if (input.end) {
      const endDate = new Date(input.end);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      filter.createdAt.$lt = endDate;
    }
  }

  const orders =
    await OrderModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

  const completed = orders.filter(
    (x) =>
      x.status === "delivered" ||
      x.status === "completed"
  ).length;

  const cancelled = orders.filter(
    (x) =>
      x.status === "cancelled"
  ).length;

  const active = orders.filter(
    (x) =>
      ![
        "delivered",
        "completed",
        "cancelled",
      ].includes(String(x.status))
  ).length;

  return {
    totalOrders: orders.length,
    completed,
    cancelled,
    active,

    statistics: buildStatistics(orders),

    orders,
  };
}
