import mongoose from "mongoose";
import OrderTimelineModel from "../models/OrderTimeline.js";

export async function recordOrderEvent(
  orderId: string,
  event: string,
  input: {
    status?: string;
    actorId?: string | null;
    captainId?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const toObjectId = (
    value?: string | null
  ) =>
    value &&
    mongoose.isValidObjectId(value)
      ? new mongoose.Types.ObjectId(value)
      : null;

  return OrderTimelineModel.create({
    orderId,
    event,
    status:
      input.status || null,
    actorId:
      toObjectId(
        input.actorId
      ),
    captainId:
      toObjectId(
        input.captainId
      ),
    note:
      input.note || null,
    metadata:
      input.metadata || {},
  });
}

export async function getOrderTimeline(
  orderId: string
) {
  return OrderTimelineModel.find({
    orderId,
  })
    .sort({ createdAt: 1 })
    .lean();
}
