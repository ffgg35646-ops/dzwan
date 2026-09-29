import mongoose, { Schema, type Document } from "mongoose";

export interface IEstablishmentRegistrationVerification extends Document {
  gmail: string;
  otpHash: string;

  payload: {
    name: string;
    type: "restaurant" | "shop";
    phone: string;
    email?: string | null;
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    ownerFullName: string;
    ownerPhone: string;
    gmail: string;
    passwordHash: string;
    governorateId: mongoose.Types.ObjectId;
    areaId: mongoose.Types.ObjectId;
  };

  attempts: number;
  expiresAt: Date;
  verifiedAt?: Date | null;
  pushToken?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IEstablishmentRegistrationVerification>(
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
      name: { type: String, required: true },
      type: {
        type: String,
        enum: ["restaurant", "shop"],
        required: true,
      },
      phone: { type: String, required: true },
      email: { type: String, default: null },
      address: { type: String, required: true },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      ownerFullName: { type: String, required: true },
      ownerPhone: { type: String, required: true },
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

schema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

export default mongoose.models.EstablishmentRegistrationVerification ||
  mongoose.model<IEstablishmentRegistrationVerification>(
    "EstablishmentRegistrationVerification",
    schema,
  );
