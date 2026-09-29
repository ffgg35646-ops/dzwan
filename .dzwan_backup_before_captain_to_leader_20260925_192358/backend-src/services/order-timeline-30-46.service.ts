import mongoose from "mongoose";
import OrderStageEvent from "../models/OrderStageEvent.js";

export async function recordOrderStageEvent(args: {
  orderId: string;
  type: any;
  status?: string;
  actorId?: string;
  actorRole?: string;
  captainId?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}) {
  return OrderStageEvent.create({
    orderId: new mongoose.Types.ObjectId(args.orderId),
    type: args.type,
    status: args.status,
    actorId: args.actorId ? new mongoose.Types.ObjectId(args.actorId) : undefined,
    actorRole: args.actorRole,
    captainId: args.captainId ? new mongoose.Types.ObjectId(args.captainId) : undefined,
    message: args.message,
    metadata: args.metadata || {}
  });
}

export async function getOrderTimeline30_46(orderId: string) {
  return OrderStageEvent.find({ orderId: new mongoose.Types.ObjectId(orderId) })
    .sort({ createdAt: 1 })
    .lean();
}

export async function getStageDurations30_46(orderId: string) {
  const events = await getOrderTimeline30_46(orderId);
  const get = (...types: string[]) => events.find((e: any) => types.includes(e.type));
  const created = get("created");
  const accepted = get("captain_accepted");
  const arrivedShop = get("arrived_shop");
  const pickedUp = get("picked_up");
  const delivered = get("delivered");

  const diff = (a: any, b: any) =>
    a && b ? Math.max(0, new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : null;

  return {
    captain_wait_ms: diff(created, accepted),
    captain_to_shop_ms: diff(accepted, arrivedShop),
    shop_wait_ms: diff(arrivedShop, pickedUp),
    delivery_ms: diff(pickedUp, delivered),
    total_ms: created && delivered
      ? Math.max(0, new Date(delivered.createdAt).getTime() - new Date(created.createdAt).getTime())
      : null
  };
}
