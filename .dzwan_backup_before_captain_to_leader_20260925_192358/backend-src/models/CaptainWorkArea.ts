import mongoose, { Schema, model } from "mongoose";

const captainWorkAreaSchema = new Schema(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    governorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    areaId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    isActive: {
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

captainWorkAreaSchema.index(
  { captainId: 1, governorateId: 1, areaId: 1 },
  { unique: true },
);

export const CaptainWorkAreaModel =
  mongoose.models.CaptainWorkArea ||
  model("CaptainWorkArea", captainWorkAreaSchema);
