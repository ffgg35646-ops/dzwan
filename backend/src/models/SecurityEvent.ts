
import { Schema, model, type Document, type Types } from "mongoose";

export interface ISecurityEvent extends Document {
  userId?: Types.ObjectId | null;
  type: string;
  severity: "info" | "warning" | "critical";
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const schema = new Schema<ISecurityEvent>({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  type: { type: String, required: true, index: true },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "info", index: true },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  path: { type: String, default: null },
  method: { type: String, default: null },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

schema.index({ createdAt: -1 });

export const SecurityEventModel =
  model<ISecurityEvent>("SecurityEvent", schema);
