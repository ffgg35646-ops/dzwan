import mongoose, { Schema, type Document } from "mongoose";

export interface ICaptainRatingFinal extends Document {
  orderId: mongoose.Types.ObjectId;
  captainId: mongoose.Types.ObjectId;
  establishmentId: mongoose.Types.ObjectId;
  stars: number;
  review?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICaptainRatingFinal>(
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
    establishmentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CaptainRatingFinal ||
  mongoose.model<ICaptainRatingFinal>(
    "CaptainRatingFinal",
    schema
  );
