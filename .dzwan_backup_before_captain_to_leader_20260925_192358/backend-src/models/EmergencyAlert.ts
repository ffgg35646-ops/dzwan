import mongoose, { Schema, Document } from "mongoose";

export interface IEmergencyAlert extends Document {
  orderId?: mongoose.Types.ObjectId;
  captainId: mongoose.Types.ObjectId;
  severity: "normal" | "high" | "critical";
  message: string;
  status: "open" | "acknowledged" | "resolved";
  metadata?: Record<string, unknown>;
}

const schema = new Schema<IEmergencyAlert>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    captainId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    severity: { type: String, default: "high" },
    message: { type: String, required: true },
    status: { type: String, default: "open", index: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export default mongoose.model<IEmergencyAlert>("EmergencyAlert", schema);
