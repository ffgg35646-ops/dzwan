import mongoose, { Schema, model } from "mongoose";

const captainDocumentSchema = new Schema(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

captainDocumentSchema.index({
  captainId: 1,
  status: 1,
});

export const CaptainDocumentModel =
  mongoose.models.CaptainDocument ||
  model("CaptainDocument", captainDocumentSchema);
