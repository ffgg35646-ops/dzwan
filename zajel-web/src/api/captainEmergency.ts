import { apiPost } from "./request";

export type CaptainEmergencyType =
  | "vehicle_breakdown"
  | "customer_issue"
  | "establishment_issue"
  | "accident"
  | "cannot_complete"
  | "other";

export async function sendEmergencyAlert(
  orderId: string,
  type: CaptainEmergencyType,
  description: string,
  latitude?: number | null,
  longitude?: number | null,
) {
  return apiPost("/ops/emergencies", {
    orderId,
    type,
    description,
    ...(typeof latitude === "number" ? { latitude } : {}),
    ...(typeof longitude === "number" ? { longitude } : {}),
  });
}
