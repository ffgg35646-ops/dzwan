import { Schema, model, type Document, type Types } from "mongoose";

export interface IEmailChangeVerification extends Document {
  userId: Types.ObjectId;
  email: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmailChangeVerificationSchema =
  new Schema<IEmailChangeVerification>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
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
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

export const EmailChangeVerificationModel =
  model<IEmailChangeVerification>(
    "EmailChangeVerification",
    EmailChangeVerificationSchema,
  );
