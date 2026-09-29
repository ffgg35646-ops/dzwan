import mongoose, { Schema, type Document } from "mongoose";

export interface ICaptainWorkAreaFinal extends Document {
  captainId: mongoose.Types.ObjectId;
  governorateId: mongoose.Types.ObjectId;
  areaId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICaptainWorkAreaFinal>(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    governorateId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    areaId: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

schema.index(
  {
    captainId: 1,
    governorateId: 1,
    areaId: 1,
  },
  { unique: true }
);

export default mongoose.models.CaptainWorkAreaFinal ||
  mongoose.model<ICaptainWorkAreaFinal>(
    "CaptainWorkAreaFinal",
    schema
  );
