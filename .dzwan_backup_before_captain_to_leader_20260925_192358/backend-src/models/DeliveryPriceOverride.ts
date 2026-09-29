
import mongoose, { Schema, Document } from "mongoose";

export type PriceOverrideScope =
  | "establishment"
  | "establishment_group"
  | "establishment_type"
  | "area"
  | "area_to_area"
  | "governorate"
  | "global";

export interface IDeliveryPriceOverride extends Document {
  scope: PriceOverrideScope;

  establishmentId?: mongoose.Types.ObjectId;
  establishmentIds?: mongoose.Types.ObjectId[];

  establishmentType?: "restaurant" | "shop";

  areaId?: mongoose.Types.ObjectId;
  governorateId?: mongoose.Types.ObjectId;

  fromGovernorateId?: mongoose.Types.ObjectId;
  fromAreaId?: mongoose.Types.ObjectId;

  toGovernorateId?: mongoose.Types.ObjectId;
  toAreaId?: mongoose.Types.ObjectId;

  price: number;
  priority: number;
  isActive: boolean;

  startsAt?: Date;
  endsAt?: Date;

  note?: string;
}

const schema = new Schema<IDeliveryPriceOverride>(
  {
    scope: {
      type: String,
      enum: [
        "establishment",
        "establishment_group",
        "establishment_type",
        "area",
        "area_to_area",
        "governorate",
        "global",
      ],
      required: true,
      index: true,
    },

    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      index: true,
    },

    establishmentIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Establishment",
      },
    ],

    establishmentType: {
      type: String,
      enum: ["restaurant", "shop"],
      index: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      index: true,
    },

    governorateId: {
      type: Schema.Types.ObjectId,
      ref: "Governorate",
      index: true,
    },

    fromGovernorateId: {
      type: Schema.Types.ObjectId,
      ref: "Governorate",
      index: true,
    },

    fromAreaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      index: true,
    },

    toGovernorateId: {
      type: Schema.Types.ObjectId,
      ref: "Governorate",
      index: true,
    },

    toAreaId: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      index: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    startsAt: Date,
    endsAt: Date,

    note: String,
  },
  {
    timestamps: true,
  },
);

schema.index({
  scope: 1,
  isActive: 1,
  priority: -1,
});

export default mongoose.model<IDeliveryPriceOverride>(
  "DeliveryPriceOverride",
  schema,
);
