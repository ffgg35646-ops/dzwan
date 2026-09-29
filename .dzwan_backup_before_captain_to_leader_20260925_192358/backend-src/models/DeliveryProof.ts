import mongoose, { Schema, model } from "mongoose";

const deliveryProofSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    photoUrl: {
      type: String,
      default: null,
      maxlength: 2000,
    },
    photoUploadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const DeliveryProofModel =
  mongoose.models.DeliveryProof ||
  model("DeliveryProof", deliveryProofSchema);
