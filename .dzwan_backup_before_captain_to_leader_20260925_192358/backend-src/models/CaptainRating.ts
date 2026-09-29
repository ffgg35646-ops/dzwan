import { Schema, model, type Document, type Types } from "mongoose";

export interface ICaptainRating extends Document {
  captainId: Types.ObjectId;
  establishmentId: Types.ObjectId;
  orderId: Types.ObjectId;
  stars: number;
  comment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICaptainRating>(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: null,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

schema.index({ captainId: 1, createdAt: -1 });

export const CaptainRatingModel =
  model<ICaptainRating>("CaptainRating", schema);
