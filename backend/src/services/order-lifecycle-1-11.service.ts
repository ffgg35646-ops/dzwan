import mongoose from "mongoose";

export const ORDER_FLOW = [
  "pending",
  "waiting_captain",
  "captain_accepted",
  "going_to_shop",
  "arrived_at_shop",
  "picked_up",
  "on_the_way",
  "delivered",
  "completed",
  "cancelled",
] as const;

export type OrderFlowStatus =
  (typeof ORDER_FLOW)[number];

const NEXT: Record<
  OrderFlowStatus,
  OrderFlowStatus[]
> = {
  pending: [
    "waiting_captain",
    "cancelled",
  ],
  waiting_captain: [
    "captain_accepted",
    "cancelled",
  ],
  captain_accepted: [
    "going_to_shop",
    "cancelled",
  ],
  going_to_shop: [
    "arrived_at_shop",
    "cancelled",
  ],
  arrived_at_shop: [
    "picked_up",
    "cancelled",
  ],
  picked_up: [
    "on_the_way",
    "cancelled",
  ],
  on_the_way: [
    "delivered",
    "cancelled",
  ],
  delivered: [
    "completed",
  ],
  completed: [],
  cancelled: [],
};

export function normalizeFlowStatus(
  value: string
): OrderFlowStatus {
  switch (value) {
    case "ready_for_pickup":
      return "waiting_captain";
    case "assigned":
      return "captain_accepted";
    case "on_the_way":
      return "on_the_way";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      if (
        ORDER_FLOW.includes(
          value as OrderFlowStatus
        )
      ) {
        return value as OrderFlowStatus;
      }

      return "pending";
  }
}

export function assertValidOrderTransition(
  current: string,
  next: string
) {
  const from =
    normalizeFlowStatus(current);

  const to =
    normalizeFlowStatus(next);

  if (from === to) return true;

  if (!NEXT[from]?.includes(to)) {
    throw new Error(
      `ORDER_TRANSITION_INVALID:${from}->${to}`
    );
  }

  return true;
}

export function makeTimelineEntry(
  status: OrderFlowStatus,
  actorId?: string | null
) {
  return {
    status,
    at: new Date(),
    actorId:
      actorId &&
      mongoose.isValidObjectId(actorId)
        ? new mongoose.Types.ObjectId(
            actorId
          )
        : null,
  };
}
