import { Schema, model } from "mongoose";

const CaptainLocationSchema = new Schema(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const CaptainLocationModel =
  model("CaptainLocation", CaptainLocationSchema);
