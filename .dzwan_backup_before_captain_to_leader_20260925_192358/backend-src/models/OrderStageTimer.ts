
import { Schema, model, type Document, type Types } from "mongoose";

export interface IOrderStageTimer extends Document {
  orderId: Types.ObjectId;
  stage: string;
  startedAt: Date;
  deadlineAt?: Date | null;
  endedAt?: Date | null;
  breached: boolean;
  durationSeconds?: number | null;
}

const schema = new Schema<IOrderStageTimer>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  stage: { type: String, required: true },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  breached: { type: Boolean, default: false, index: true },
  durationSeconds: { type: Number, default: null },
}, { timestamps: true, versionKey: false });

schema.index({ orderId: 1, stage: 1, startedAt: -1 });

export const OrderStageTimerModel =
  model<IOrderStageTimer>("OrderStageTimer", schema);
