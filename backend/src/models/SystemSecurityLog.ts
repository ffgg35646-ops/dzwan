import mongoose, { Schema, Document } from "mongoose";

export interface ISystemSecurityLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

const schema = new Schema<ISystemSecurityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    success: { type: Boolean, required: true },
    ip: String,
    userAgent: String,
    details: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

export default mongoose.model<ISystemSecurityLog>("SystemSecurityLog", schema);
