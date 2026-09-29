import mongoose, { Schema, model, Types } from "mongoose";

const dispatchQueueSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ["waiting", "assigned", "cancelled"],
      default: "waiting",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    assignedCaptainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

dispatchQueueSchema.index({
  status: 1,
  priority: -1,
  createdAt: 1,
});

export const DispatchQueueModel =
  mongoose.models.DispatchQueue ||
  model("DispatchQueue", dispatchQueueSchema);
