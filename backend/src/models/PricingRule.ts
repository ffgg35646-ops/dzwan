import { Schema, model, type Document, type Types } from "mongoose";

export const PRICING_RULE_TYPES = [
  "default",
  "governorate",
  "area",
  "area_to_area",
  "establishment",
  "establishment_type",
  "zone_to_zone",
  "geofence_to_geofence",
] as const;

export type PricingRuleType = (typeof PRICING_RULE_TYPES)[number];

export interface IPricingRule extends Document {
  name: string;
  type: PricingRuleType;

  amount: number;

  governorateId?: Types.ObjectId | null;
  areaId?: Types.ObjectId | null;

  fromGovernorateId?: Types.ObjectId | null;
  fromAreaId?: Types.ObjectId | null;

  toGovernorateId?: Types.ObjectId | null;
  toAreaId?: Types.ObjectId | null;

  establishmentId?: Types.ObjectId | null;
  establishmentType?: "restaurant" | "shop" | null;

  fromGeofenceId?: Types.ObjectId | null;
  toGeofenceId?: Types.ObjectId | null;

  priority: number;

  startsAt?: Date | null;
  endsAt?: Date | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    type: {
      type: String,
      enum: PRICING_RULE_TYPES,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      max: 100000,
    },

    governorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    fromGovernorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    fromAreaId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    toGovernorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    toAreaId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      default: null,
      index: true,
    },

    establishmentType: {
      type: String,
      enum: ["restaurant", "shop"],
      default: null,
      index: true,
    },

    fromGeofenceId: {
      type: Schema.Types.ObjectId,
      ref: "Geofence",
      default: null,
      index: true,
    },

    toGeofenceId: {
      type: Schema.Types.ObjectId,
      ref: "Geofence",
      default: null,
      index: true,
    },

    priority: {
      type: Number,
      default: 0,
      min: -100000,
      max: 100000,
      index: true,
    },

    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

PricingRuleSchema.index({
  type: 1,
  isActive: 1,
  priority: -1,
});

export const PricingRuleModel = model<IPricingRule>(
  "PricingRule",
  PricingRuleSchema,
);
