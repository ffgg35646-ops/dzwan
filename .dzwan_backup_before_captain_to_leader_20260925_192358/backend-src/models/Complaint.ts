import mongoose, { Schema, type Document } from "mongoose";

export const COMPLAINT_CATEGORIES = [
  "captain_establishment",
  "order",
  "delivery",
  "amount",
  "delivery_proof",
] as const;

export type ComplaintCategory =
  (typeof COMPLAINT_CATEGORIES)[number];

export const COMPLAINT_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "rejected",
  "closed",
] as const;

export type ComplaintStatus =
  (typeof COMPLAINT_STATUSES)[number];

export interface IComplaint extends Document {
  orderId?: mongoose.Types.ObjectId | null;

  openedBy: mongoose.Types.ObjectId;

  againstUserId?: mongoose.Types.ObjectId | null;

  captainId?: mongoose.Types.ObjectId | null;

  establishmentId?: mongoose.Types.ObjectId | null;

  category: ComplaintCategory;

  title: string;

  description: string;

  amount?: number | null;

  status: ComplaintStatus;

  resolution?: string | null;

  assignedTo?: mongoose.Types.ObjectId | null;

  resolvedAt?: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

const schema = new Schema<IComplaint>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    openedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    againstUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      default: null,
      index: true,
    },

    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },

    amount: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      default: "open",
      index: true,
    },

    resolution: {
      type: String,
      default: null,
      maxlength: 3000,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

schema.index({
  status: 1,
  createdAt: -1,
});

schema.index({
  orderId: 1,
  createdAt: -1,
});

export default mongoose.models.Complaint ||
  mongoose.model<IComplaint>(
    "Complaint",
    schema
  );
