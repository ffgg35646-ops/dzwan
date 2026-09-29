import { OrderModel } from "../models/Order.js";

export async function getEstablishmentReport(
  establishmentId: string,
  start?: Date,
  end?: Date
) {
  const filter: Record<string, any> = {
    establishmentId,
  };

  if (start || end) {
    filter.createdAt = {};
    if (start)
      filter.createdAt.$gte = start;
    if (end)
      filter.createdAt.$lt = end;
  }

  const orders =
    await OrderModel.find(filter)
      .populate(
        "captainId",
        "fullName phone"
      )
      .sort({ createdAt: -1 })
      .lean();

  return {
    total: orders.length,
    completed: orders.filter(
      (x) =>
        x.status === "delivered"
    ).length,
    cancelled: orders.filter(
      (x) =>
        x.status === "cancelled"
    ).length,
    orders,
  };
}
