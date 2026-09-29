
import { Types } from "mongoose";
import { PricingRuleModel } from "../models/PricingRule.js";
import GeofenceModel from "../models/Geofence.js";
import DeliveryPriceOverride from "../models/DeliveryPriceOverride.js";
import CoreOperationsSettingsModel from "../models/CoreOperationsSettings.js";

type ResolveInput = {
  establishmentId: Types.ObjectId;
  establishmentType: "restaurant" | "shop";

  fromGovernorateId: Types.ObjectId;
  fromAreaId: Types.ObjectId;

  toGovernorateId: Types.ObjectId;
  toAreaId: Types.ObjectId;

  fromLatitude?: number | null;
  fromLongitude?: number | null;

  toLatitude?: number | null;
  toLongitude?: number | null;

  now?: Date;
};

type Match = {
  source: "pricing_rule" | "override";
  rule: any;
  reason: string;
  specificity: number;
};

function same(a: unknown, b: unknown) {
  return a != null && b != null && String(a) === String(b);
}

function activeNow(rule: any, now: Date) {
  if (!rule.isActive) return false;

  if (rule.startsAt && now < new Date(rule.startsAt)) {
    return false;
  }

  if (rule.endsAt && now > new Date(rule.endsAt)) {
    return false;
  }

  return true;
}

function pointInPolygon(
  latitude: number,
  longitude: number,
  polygon: [number, number][],
) {
  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > longitude !== yj > longitude &&
      latitude <
        ((xj - xi) * (longitude - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

async function findGeofence(
  latitude?: number | null,
  longitude?: number | null,
) {
  if (
    latitude == null ||
    longitude == null
  ) {
    return null;
  }

  const fences = await GeofenceModel.find({
    enabled: true,
  }).lean();

  for (const fence of fences) {
    const polygon = (fence.polygon || []).map(
      (p: any) => [p.lng, p.lat] as [number, number],
    );

    if (
      polygon.length >= 3 &&
      pointInPolygon(latitude, longitude, polygon)
    ) {
      return fence;
    }
  }

  return null;
}

export async function resolveDeliveryFee(input: ResolveInput) {
  const now = input.now ?? new Date();

  const settings =
    (await CoreOperationsSettingsModel.findOne().lean()) ?? {
      pricingMode: "area_to_area" as const,
    };

  const pricingMode = settings.pricingMode;

  const [
    pricingRules,
    overrides,
    fromFence,
    toFence,
  ] = await Promise.all([
    PricingRuleModel.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .lean(),

    DeliveryPriceOverride.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .lean(),

    findGeofence(
      input.fromLatitude,
      input.fromLongitude,
    ),

    findGeofence(
      input.toLatitude,
      input.toLongitude,
    ),
  ]);

  const matches: Match[] = [];

  // ----------------------------------------------------------
  // Existing PricingRule system
  // ----------------------------------------------------------

  for (const rule of pricingRules) {
    if (!activeNow(rule, now)) continue;

    let specificity = -1;
    let reason = "";

    if (
      pricingMode === "geofencing" &&
      rule.type === "geofence_to_geofence" &&
      fromFence &&
      toFence &&
      same(rule.fromGeofenceId, fromFence._id) &&
      same(rule.toGeofenceId, toFence._id)
    ) {
      specificity = 1200;
      reason =
        "سعر مخصص للمنطقة الجغرافية إلى المنطقة الجغرافية";
    }

    if (
      rule.type === "establishment" &&
      same(rule.establishmentId, input.establishmentId)
    ) {
      specificity = 1100;
      reason = "سعر مخصص للمنشأة";
    }

    if (
      pricingMode === "area_to_area" &&
      rule.type === "area_to_area" &&
      same(rule.fromGovernorateId, input.fromGovernorateId) &&
      same(rule.fromAreaId, input.fromAreaId) &&
      same(rule.toGovernorateId, input.toGovernorateId) &&
      same(rule.toAreaId, input.toAreaId)
    ) {
      specificity = 1000;
      reason = "سعر منطقة إلى منطقة";
    }

    if (
      pricingMode === "area_to_area" &&
      rule.type === "zone_to_zone" &&
      same(rule.fromGovernorateId, input.fromGovernorateId) &&
      same(rule.fromAreaId, input.fromAreaId) &&
      same(rule.toGovernorateId, input.toGovernorateId) &&
      same(rule.toAreaId, input.toAreaId)
    ) {
      specificity = Math.max(specificity, 1000);
      reason = "سعر منطقة إلى منطقة";
    }

    if (
      rule.type === "establishment_type" &&
      rule.establishmentType === input.establishmentType
    ) {
      specificity = Math.max(specificity, 900);
      reason =
        input.establishmentType === "restaurant"
          ? "سعر خاص بجميع المطاعم"
          : "سعر خاص بجميع المحلات";
    }

    if (
      rule.type === "area" &&
      same(rule.governorateId, input.toGovernorateId) &&
      same(rule.areaId, input.toAreaId)
    ) {
      specificity = Math.max(specificity, 800);
      reason = "سعر خاص بالمنطقة";
    }

    if (
      rule.type === "governorate" &&
      same(rule.governorateId, input.toGovernorateId)
    ) {
      specificity = Math.max(specificity, 700);
      reason = "سعر خاص بالمحافظة";
    }

    if (rule.type === "default") {
      specificity = Math.max(specificity, 100);
      reason = "السعر الأساسي";
    }

    if (specificity >= 0) {
      matches.push({
        source: "pricing_rule",
        rule,
        reason,
        specificity,
      });
    }
  }

  // ----------------------------------------------------------
  // Advanced DeliveryPriceOverride system
  // ----------------------------------------------------------

  for (const rule of overrides) {
    if (!activeNow(rule, now)) continue;

    let specificity = -1;
    let reason = "";

    if (
      rule.scope === "establishment" &&
      same(rule.establishmentId, input.establishmentId)
    ) {
      specificity = 1150;
      reason = "تسعير مخصص لمنشأة محددة";
    }

    if (
      rule.scope === "establishment_group" &&
      Array.isArray(rule.establishmentIds) &&
      rule.establishmentIds.some(
        (id: any) =>
          same(id, input.establishmentId),
      )
    ) {
      specificity = 1080;
      reason = "تسعير مخصص لمجموعة منشآت";
    }

    if (
      rule.scope === "establishment_type" &&
      rule.establishmentType === input.establishmentType
    ) {
      specificity = 920;
      reason =
        input.establishmentType === "restaurant"
          ? "تسعير خاص بجميع المطاعم"
          : "تسعير خاص بجميع المحلات";
    }

    if (
      pricingMode === "area_to_area" &&
      rule.scope === "area_to_area" &&
      same(rule.fromGovernorateId, input.fromGovernorateId) &&
      same(rule.fromAreaId, input.fromAreaId) &&
      same(rule.toGovernorateId, input.toGovernorateId) &&
      same(rule.toAreaId, input.toAreaId)
    ) {
      specificity = 1010;
      reason = "تسعير مخصص من منطقة إلى منطقة";
    }

    if (
      rule.scope === "area" &&
      same(rule.areaId, input.toAreaId)
    ) {
      specificity = 810;
      reason = "تسعير مخصص للمنطقة";
    }

    if (
      rule.scope === "governorate" &&
      same(rule.governorateId, input.toGovernorateId)
    ) {
      specificity = 710;
      reason = "تسعير مخصص للمحافظة";
    }

    if (rule.scope === "global") {
      specificity = 110;
      reason = "تسعير مخصص عام";
    }

    if (specificity >= 0) {
      matches.push({
        source: "override",
        rule,
        reason,
        specificity,
      });
    }
  }

  matches.sort(
    (a, b) =>
      b.specificity - a.specificity ||
      Number(b.rule.priority ?? 0) -
        Number(a.rule.priority ?? 0) ||
      new Date(b.rule.createdAt).getTime() -
        new Date(a.rule.createdAt).getTime(),
  );

  const selected = matches[0];

  if (!selected) {
    return {
      fee: 0,
      ruleId: null,
      ruleName: null,
      reason: "لا توجد قاعدة تسعير مفعلة.",
      matchedRules: [],
      fromGeofenceId: fromFence?._id ?? null,
      toGeofenceId: toFence?._id ?? null,
    };
  }

  const fee =
    selected.source === "override"
      ? Number(selected.rule.price)
      : Number(selected.rule.amount);

  return {
    fee: Number(fee.toFixed(2)),
    ruleId: selected.rule._id,
    ruleName: selected.rule.name ?? "تسعير مخصص",
    reason: selected.reason,

    matchedRules: matches
      .slice(0, 10)
      .map((item) => ({
        ruleId: item.rule._id,
        name: item.rule.name ?? "تسعير مخصص",
        priority: Number(item.rule.priority ?? 0),
        amount:
          item.source === "override"
            ? Number(item.rule.price)
            : Number(item.rule.amount),
        reason: item.reason,
        source: item.source,
        specificity: item.specificity,
      })),

    fromGeofenceId: fromFence?._id ?? null,
    toGeofenceId: toFence?._id ?? null,
  };
}
