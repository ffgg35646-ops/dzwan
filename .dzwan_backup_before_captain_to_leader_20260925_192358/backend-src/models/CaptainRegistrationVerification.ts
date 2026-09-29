import mongoose, { Schema, type Document } from "mongoose";

export interface ICaptainRegistrationVerification extends Document {
  gmail: string;
  otpHash: string;

  payload: {
    fullName: string;
    phone: string;
    email?: string | null;
    gmail: string;
    passwordHash: string;
    governorateId: mongoose.Types.ObjectId;
    areaId: mongoose.Types.ObjectId;
    idFrontUrl: string;
    idBackUrl: string;
    residenceFrontUrl: string;
    residenceBackUrl: string;
  };

  attempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  pushToken?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const SchemaDefinition =
  new Schema<ICaptainRegistrationVerification>(
    {
      gmail: {
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

      payload: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, default: null },
        gmail: { type: String, required: true },
        passwordHash: { type: String, required: true },

        governorateId: {
          type: Schema.Types.ObjectId,
          ref: "Location",
          required: true,
        },

        areaId: {
          type: Schema.Types.ObjectId,
          required: true,
        },

        idFrontUrl: { type: String, required: true },
        idBackUrl: { type: String, required: true },
        residenceFrontUrl: { type: String, required: true },
        residenceBackUrl: { type: String, required: true },
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

      pushToken: {
        type: String,
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

SchemaDefinition.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export default mongoose.models.CaptainRegistrationVerification ||
  mongoose.model<ICaptainRegistrationVerification>(
    "CaptainRegistrationVerification",
    SchemaDefinition,
  );
