export const REQUIREMENTS_11_29 = {
  11: "shift_enforcement",
  12: "captain_attendance",
  13: "captain_registration",
  14: "captain_profile",
  15: "captain_work_areas",
  16: "captain_active_order_limit",
  17: "cash_accounting",
  18: "captain_cash_statement",
  19: "delivery_proof",
  20: "pickup_photo",
  21: "order_notes",
  22: "captain_rating",
  23: "captain_kpi",
  24: "establishment_reports",
  25: "admin_reports",
  26: "operations_dashboard",
  27: "targeted_notifications",
  28: "complaints",
  29: "order_timeline",
} as const;

export function isRequirement11To29Key(
  value: number
) {
  return value >= 11 && value <= 29;
}
