import mongoose, { Schema, Document } from "mongoose";

export interface ICentralOperationSetting extends Document {
  key: string;
  value: unknown;
  description?: string;
  category:
    | "shift"
    | "dispatch"
    | "notifications"
    | "rating"
    | "attendance"
    | "updates"
    | "maintenance"
    | "cancellation"
    | "proof"
    | "geofence"
    | "orders"
    | "security";
  updatedBy?: mongoose.Types.ObjectId;
}

const schema = new Schema<ICentralOperationSetting>(
  {
    key: { type: String, unique: true, index: true },
    value: { type: Schema.Types.Mixed },
    description: String,
    category: { type: String, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model<ICentralOperationSetting>("CentralOperationSetting", schema);
