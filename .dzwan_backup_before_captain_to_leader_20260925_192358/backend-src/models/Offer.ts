import { Schema, model, Document, Types } from "mongoose";

export type OfferAudience =
  | "all"
  | "captains"
  | "establishments";

export type OfferType =
  | "percentage"
  | "fixed";

export interface IOffer extends Document {
  title: string;
  code?: string;
  description?: string;
  imageUrl?: string;

  audience: OfferAudience;

  establishmentId?: Types.ObjectId | null;

  type: OfferType;
  value: number;
  minOrderAmount: number;
  maxDiscount?: number | null;

  usageLimit?: number | null;
  usageCount: number;

  startsAt: Date;
  endsAt: Date;

  isActive: boolean;
}

const schema = new Schema<IOffer>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      index: true,
    },

    description: String,

    imageUrl: String,

    audience: {
      type: String,
      enum: [
        "all",
        "captains",
        "establishments",
      ],
      default: "all",
    },

    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "percentage",
        "fixed",
      ],
      default: "percentage",
      required: true,
    },

    value: {
      type: Number,
      required: true,
      min: 0,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxDiscount: {
      type: Number,
      default: null,
      min: 0,
    },

    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },

    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    startsAt: {
      type: Date,
      required: true,
    },

    endsAt: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default model<IOffer>(
  "Offer",
  schema,
);
