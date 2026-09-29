import mongoose, { Schema, type Document } from "mongoose";

export interface IComplaint extends Document {
  orderId?: mongoose.Types.ObjectId | null;
  openedBy: mongoose.Types.ObjectId;
  captainId?: mongoose.Types.ObjectId | null;
  establishmentId?: mongoose.Types.ObjectId | null;
  category: string;
  description: string;
  amount?: number | null;
  status: "open" | "in_review" | "resolved" | "closed";
  resolution?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IComplaint>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    captainId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    establishmentId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "open",
        "in_review",
        "resolved",
        "closed",
      ],
      default: "open",
      index: true,
    },
    resolution: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Complaint ||
  mongoose.model<IComplaint>(
    "Complaint",
    schema
  );
