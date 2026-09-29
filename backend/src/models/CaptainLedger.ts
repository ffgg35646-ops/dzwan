import mongoose, { Schema, model } from "mongoose";

const captainLedgerSchema = new Schema(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "delivery_earning",
        "bonus",
        "penalty",
        "adjustment",
        "withdrawal",
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: -1000000000,
      max: 1000000000,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      default: null,
      maxlength: 100,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

captainLedgerSchema.index({
  captainId: 1,
  createdAt: -1,
});

export const CaptainLedgerModel =
  mongoose.models.CaptainLedger ||
  model("CaptainLedger", captainLedgerSchema);
