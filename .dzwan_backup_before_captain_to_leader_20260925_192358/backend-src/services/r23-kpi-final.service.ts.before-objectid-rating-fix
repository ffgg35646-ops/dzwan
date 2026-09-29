import mongoose from "mongoose";
import { OrderModel } from "../models/Order.js";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import CaptainRatingFinalModel from "../models/CaptainRatingFinal.js";

export async function getCaptainKpi(
  captainId: string,
  start: Date,
  end: Date
) {
  const orders =
    await OrderModel.find({
      captainId,
      createdAt: {
        $gte: start,
        $lt: end,
      },
    })
      .select(
        "status createdAt pickedUpAt deliveredAt"
      )
      .lean();

  const attendance =
    await CaptainAttendanceModel.find({
      captainId,
      date: {
        $gte: start,
        $lt: end,
      },
    }).lean();

  const completed =
    orders.filter(
      (x) =>
        x.status === "delivered"
    );

  const cancelled =
    orders.filter(
      (x) =>
        x.status === "cancelled"
    );

  let deliverySeconds = 0;
  let deliveryCount = 0;

  for (const order of completed) {
    if (
      order.pickedUpAt &&
      order.deliveredAt
    ) {
      deliverySeconds +=
        order.deliveredAt.getTime() -
        order.pickedUpAt.getTime();

      deliveryCount++;
    }
  }

  const workedMinutes =
    attendance.reduce(
      (sum, x) =>
        sum +
        Number(
          x.durationMinutes || 0
        ),
      0
    );

  const ratingResult =
    await CaptainRatingFinalModel.aggregate([
      {
        $match: {
          captainId: new mongoose.Types.ObjectId(
            captainId
          ),
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$stars",
          },
        },
      },
    ]);

  function groupOrders(
    unit: "day" | "week" | "month"
  ) {
    const groups = new Map<string, any>();

    for (const order of orders) {
      const date = new Date(order.createdAt);

      let key = "";

      if (unit === "day") {
        key = date.toISOString().slice(0, 10);
      }

      if (unit === "month") {
        key = date.toISOString().slice(0, 7);
      }

      if (unit === "week") {
        const d = new Date(date);
        const day = d.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setUTCDate(d.getUTCDate() + diff);
        key = d.toISOString().slice(0, 10);
      }

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          orders: 0,
          completed: 0,
          cancelled: 0,
          deliveryTotalSeconds: 0,
          deliveryCount: 0,
          workedMinutes: 0,
          attendanceDays: 0,
        });
      }

      const group = groups.get(key);

      group.orders += 1;

      if (order.status === "delivered") {
        group.completed += 1;

        if (
          order.pickedUpAt &&
          order.deliveredAt
        ) {
          group.deliveryTotalSeconds +=
            new Date(
              order.deliveredAt
            ).getTime() -
            new Date(
              order.pickedUpAt
            ).getTime();

          group.deliveryCount += 1;
        }
      }

      if (order.status === "cancelled") {
        group.cancelled += 1;
      }
    }

    for (const row of attendance) {
      const date = new Date(row.date);

      let key = "";

      if (unit === "day") {
        key = date.toISOString().slice(0, 10);
      }

      if (unit === "month") {
        key = date.toISOString().slice(0, 7);
      }

      if (unit === "week") {
        const d = new Date(date);
        const day = d.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        d.setUTCDate(d.getUTCDate() + diff);
        key = d.toISOString().slice(0, 10);
      }

      if (!groups.has(key)) {
        groups.set(key, {
          period: key,
          orders: 0,
          completed: 0,
          cancelled: 0,
          deliveryTotalSeconds: 0,
          deliveryCount: 0,
          workedMinutes: 0,
          attendanceDays: 0,
        });
      }

      const group = groups.get(key);

      group.workedMinutes += Number(
        row.durationMinutes || 0
      );

      group.attendanceDays += 1;
    }

    return Array.from(groups.values())
      .sort((a, b) =>
        a.period.localeCompare(b.period)
      )
      .map((group) => ({
        period: group.period,
        orders: group.orders,
        completed: group.completed,
        cancelled: group.cancelled,
        averageDeliveryMinutes:
          group.deliveryCount
            ? Math.round(
                group.deliveryTotalSeconds /
                  group.deliveryCount /
                  60000
              )
            : 0,
        attendanceDays:
          group.attendanceDays,
        workedMinutes:
          group.workedMinutes,
      }));
  }

  return {
    orders: orders.length,
    completed: completed.length,
    cancelled: cancelled.length,
    averageDeliveryMinutes:
      deliveryCount
        ? Math.round(
            deliverySeconds /
              deliveryCount /
              60000
          )
        : 0,
    averageRating:
      Number(
        ratingResult[0]?.average || 0
      ),
    attendanceDays:
      attendance.length,
    workedMinutes,

    performance: {
      daily: groupOrders("day"),
      weekly: groupOrders("week"),
      monthly: groupOrders("month"),
    },
  };
}
