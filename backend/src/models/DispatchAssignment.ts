import mongoose, { Schema, model } from "mongoose";

const dispatchAssignmentSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "expired",
        "reassigned",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    reassignedAt: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

dispatchAssignmentSchema.index({
  status: 1,
  expiresAt: 1,
});

export const DispatchAssignmentModel =
  mongoose.models.DispatchAssignment ||
  model("DispatchAssignment", dispatchAssignmentSchema);
