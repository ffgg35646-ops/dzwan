import mongoose, { Schema, type Document } from "mongoose";

export interface IPickupPhoto extends Document {
  orderId: mongoose.Types.ObjectId;
  captainId: mongoose.Types.ObjectId;
  photoUrl: string;
  uploadedAt: Date;
}

const schema = new Schema<IPickupPhoto>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    captainId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    photoUrl: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.PickupPhoto ||
  mongoose.model<IPickupPhoto>(
    "PickupPhoto",
    schema
  );
