
import mongoose, { Schema, type Document } from "mongoose";

export interface IPasswordResetVerification extends Document {
  email: string;
  userId: mongoose.Types.ObjectId;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPasswordResetVerification>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    resetTokenHash: {
      type: String,
      default: null,
    },

    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

schema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export default mongoose.models.PasswordResetVerification ||
  mongoose.model<IPasswordResetVerification>(
    "PasswordResetVerification",
    schema,
  );
