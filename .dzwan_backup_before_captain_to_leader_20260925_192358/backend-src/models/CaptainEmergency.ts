
import { Schema, model, type Document, type Types } from "mongoose";

export const EMERGENCY_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;

export interface ICaptainEmergency extends Document {
  captainId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  type: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  status: typeof EMERGENCY_STATUSES[number];
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
}

const schema = new Schema<ICaptainEmergency>({
  captainId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  type: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, enum: EMERGENCY_STATUSES, default: "open", index: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

schema.index({ status: 1, createdAt: -1 });

export const CaptainEmergencyModel =
  model<ICaptainEmergency>("CaptainEmergency", schema);
