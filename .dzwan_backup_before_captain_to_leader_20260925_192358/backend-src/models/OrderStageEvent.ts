import mongoose, { Schema, Document } from "mongoose";

export interface IOrderStageEvent extends Document {
  orderId: mongoose.Types.ObjectId;
  type:
    | "created"
    | "captain_sent"
    | "captain_accepted"
    | "arrived_shop"
    | "picked_up"
    | "on_the_way"
    | "delivered"
    | "cancelled"
    | "reassigned"
    | "emergency"
    | "note"
    | "proof"
    | "custom";
  status?: string;
  actorId?: mongoose.Types.ObjectId;
  actorRole?: string;
  captainId?: mongoose.Types.ObjectId;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<IOrderStageEvent>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    type: { type: String, required: true, index: true },
    status: String,
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    captainId: { type: Schema.Types.ObjectId, ref: "User" },
    message: String,
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ orderId: 1, createdAt: 1 });

export default mongoose.model<IOrderStageEvent>("OrderStageEvent", schema);
