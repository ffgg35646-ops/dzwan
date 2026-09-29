
import { Schema, model, type Document, type Types } from "mongoose";

export const STUCK_ALERT_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;

export interface IStuckOrderAlert extends Document {
  orderId: Types.ObjectId;
  status: typeof STUCK_ALERT_STATUSES[number];
  reason: string;
  detectedAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: Types.ObjectId | null;
}

const schema = new Schema<IStuckOrderAlert>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  status: { type: String, enum: STUCK_ALERT_STATUSES, default: "open", index: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  detectedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

schema.index({ status: 1, detectedAt: -1 });

export const StuckOrderAlertModel =
  model<IStuckOrderAlert>("StuckOrderAlert", schema);
