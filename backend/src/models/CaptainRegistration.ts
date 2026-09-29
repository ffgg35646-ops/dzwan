import mongoose, { Schema, type Document } from "mongoose";

export interface ICaptainRegistration extends Document {
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

  status: "pending" | "approved" | "rejected";
  rejectionReason?: string | null;
  pushToken?: string | null;

  approvedAt?: Date | null;
  approvedBy?: mongoose.Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICaptainRegistration>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    gmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    governorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
      index: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    idFrontUrl: {
      type: String,
      required: true,
    },

    idBackUrl: {
      type: String,
      required: true,
    },

    residenceFrontUrl: {
      type: String,
      required: true,
    },

    residenceBackUrl: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    pushToken: {
      type: String,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

schema.index({ governorateId: 1, areaId: 1 });
schema.index({ status: 1, createdAt: -1 });

export default mongoose.models.CaptainRegistration ||
  mongoose.model<ICaptainRegistration>(
    "CaptainRegistration",
    schema
  );
