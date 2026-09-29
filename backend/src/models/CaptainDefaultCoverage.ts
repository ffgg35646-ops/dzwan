import mongoose, { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    sourceGovernorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    sourceAreaId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetGovernorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },
    targetAreaId: {
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
  { timestamps: true, versionKey: false }
);

schema.index(
  {
    sourceGovernorateId: 1,
    sourceAreaId: 1,
    targetGovernorateId: 1,
    targetAreaId: 1,
  },
  { unique: true }
);

export default mongoose.models.CaptainDefaultCoverage ||
  model("CaptainDefaultCoverage", schema);
