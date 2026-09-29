
import { Schema, model, type Document, type Types } from "mongoose";

export interface IStaffPermission extends Document {
  userId: Types.ObjectId;
  permissions: string[];
  governorateIds: Types.ObjectId[];
  areaIds: Types.ObjectId[];
  establishmentIds: Types.ObjectId[];
}

const schema = new Schema<IStaffPermission>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  permissions: { type: [String], default: [] },
  governorateIds: [{ type: Schema.Types.ObjectId, ref: "Governorate" }],
  areaIds: [{ type: Schema.Types.ObjectId }],
  establishmentIds: [{ type: Schema.Types.ObjectId, ref: "Establishment" }],
}, { timestamps: true, versionKey: false });

export const StaffPermissionModel =
  model<IStaffPermission>("StaffPermission", schema);
