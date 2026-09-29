import { Schema, model, type Document, type Types } from "mongoose";

export const STAFF_TYPES = ["captain", "shop"] as const;
export type StaffType = (typeof STAFF_TYPES)[number];

export interface IStaffProfile extends Document {
  userId: Types.ObjectId;
  type: StaffType;
  governorateId?: Types.ObjectId | null;
  areaId?: Types.ObjectId | null;
  address?: string | null;
  notes?: string | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffProfileSchema = new Schema<IStaffProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: STAFF_TYPES,
      required: true,
      index: true,
    },

    governorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

StaffProfileSchema.index({
  type: 1,
  governorateId: 1,
  areaId: 1,
});

export const StaffProfileModel = model<IStaffProfile>(
  "StaffProfile",
  StaffProfileSchema,
);
