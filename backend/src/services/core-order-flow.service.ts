export const CORE_ORDER_STATUSES = [
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

export type CoreOrderStatus =
  (typeof CORE_ORDER_STATUSES)[number];

const LEGACY_TO_CORE: Record<
  string,
  CoreOrderStatus
> = {
  pending: "pending",
  confirmed: "pending",
  preparing: "pending",
  ready_for_pickup: "waiting_captain",
  assigned: "captain_accepted",
  picked_up: "picked_up",
  on_the_way: "on_the_way",
  delivered: "delivered",
  cancelled: "cancelled",
};

const TRANSITIONS: Record<
  CoreOrderStatus,
  CoreOrderStatus[]
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
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function normalizeCoreOrderStatus(
  value: string
): CoreOrderStatus {
  return (
    LEGACY_TO_CORE[value] ||
    "pending"
  );
}

export function canMoveCoreOrder(
  current: string,
  next: string
) {
  const currentStatus =
    normalizeCoreOrderStatus(current);

  const nextStatus =
    normalizeCoreOrderStatus(next);

  if (currentStatus === nextStatus) {
    return true;
  }

  return Boolean(
    TRANSITIONS[currentStatus]?.includes(
      nextStatus
    )
  );
}

export function assertCoreOrderTransition(
  current: string,
  next: string
) {
  if (
    !canMoveCoreOrder(
      current,
      next
    )
  ) {
    throw new Error(
      `ORDER_STATUS_TRANSITION_NOT_ALLOWED:${normalizeCoreOrderStatus(current)}->${normalizeCoreOrderStatus(next)}`
    );
  }

  return true;
}
