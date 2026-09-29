import mongoose from "mongoose";

export const CORE11_FLOW = [
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

export type Core11Status =
  (typeof CORE11_FLOW)[number];

const NEXT: Record<
  Core11Status,
  Core11Status[]
> = {
  pending: ["waiting_captain", "cancelled"],
  waiting_captain: ["captain_accepted", "cancelled"],
  captain_accepted: ["going_to_shop", "cancelled"],
  going_to_shop: ["arrived_at_shop", "cancelled"],
  arrived_at_shop: ["picked_up", "cancelled"],
  picked_up: ["on_the_way", "cancelled"],
  on_the_way: ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function oid(value: unknown) {
  const id = String(value || "");

  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return new mongoose.Types.ObjectId(id);
}

export function normalizeCore11Status(
  status: string
): Core11Status {
  switch (status) {
    case "ready_for_pickup":
      return "waiting_captain";
    case "assigned":
      return "captain_accepted";
    case "picked_up":
      return "picked_up";
    case "on_the_way":
      return "on_the_way";
    case "delivered":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return CORE11_FLOW.includes(
        status as Core11Status
      )
        ? (status as Core11Status)
        : "pending";
  }
}

export function assertCore11Transition(
  current: string,
  next: string
) {
  const from =
    normalizeCore11Status(current);

  const to =
    normalizeCore11Status(next);

  if (from === to) {
    return true;
  }

  if (!NEXT[from]?.includes(to)) {
    throw new Error(
      `ORDER_TRANSITION_INVALID:${from}->${to}`
    );
  }

  return true;
}

export function legacyStatusFor(
  status: Core11Status
) {
  switch (status) {
    case "waiting_captain":
      return "ready_for_pickup";
    case "captain_accepted":
    case "going_to_shop":
    case "arrived_at_shop":
      return "assigned";
    case "picked_up":
      return "picked_up";
    case "on_the_way":
      return "on_the_way";
    case "delivered":
    case "completed":
      return "delivered";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

export function coordinates(
  latitude: unknown,
  longitude: unknown
) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error(
      "INVALID_COORDINATES"
    );
  }

  return {
    latitude: lat,
    longitude: lng,
  };
}

export function insideShift(
  startTime: string,
  endTime: string,
  now = new Date()
) {
  const parse = (v: string) => {
    const m =
      /^([01]\d|2[0-3]):([0-5]\d)$/.exec(
        String(v)
      );

    if (!m) {
      throw new Error(
        "INVALID_SHIFT_TIME"
      );
    }

    return (
      Number(m[1]) * 60 +
      Number(m[2])
    );
  };

  const start = parse(startTime);
  const end = parse(endTime);

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  if (start === end) {
    return true;
  }

  if (start < end) {
    return (
      current >= start &&
      current < end
    );
  }

  return (
    current >= start ||
    current < end
  );
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (lat1 * Math.PI) / 180
    ) *
      Math.cos(
        (lat2 * Math.PI) / 180
      ) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.asin(Math.sqrt(a))
  );
}
