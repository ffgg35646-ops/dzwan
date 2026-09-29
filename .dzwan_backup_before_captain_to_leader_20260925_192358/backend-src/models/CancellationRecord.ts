
import { Schema, model, type Document, type Types } from "mongoose";

export interface ICancellationRecord extends Document {
  orderId: Types.ObjectId;
  cancelledBy: Types.ObjectId;
  cancelledByRole: string;
  reason: string;
  createdAt: Date;
}

const schema = new Schema<ICancellationRecord>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  cancelledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cancelledByRole: { type: String, required: true },
  reason: { type: String, required: true, maxlength: 1000 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

export const CancellationRecordModel =
  model<ICancellationRecord>("CancellationRecord", schema);
