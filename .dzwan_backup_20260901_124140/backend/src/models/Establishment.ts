import { Schema, model, type Document, type Types } from "mongoose";

export const ESTABLISHMENT_TYPES = [
  "restaurant",
  "shop",
] as const;

export type EstablishmentType =
  (typeof ESTABLISHMENT_TYPES)[number];

export const ESTABLISHMENT_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
  "inactive",
] as const;

export type EstablishmentStatus =
  (typeof ESTABLISHMENT_STATUSES)[number];

export interface IEstablishment extends Document {
  name: string;
  type: EstablishmentType;
  status: EstablishmentStatus;

  phone: string;
  email?: string | null;
  address: string;

  governorateId: Types.ObjectId;
  areaId: Types.ObjectId;

  ownerUserId?: Types.ObjectId | null;
  captainId?: Types.ObjectId | null;

  description?: string | null;
  logoUrl?: string | null;

  approvedAt?: Date | null;
  approvedBy?: Types.ObjectId | null;

  rejectionReason?: string | null;
  suspensionReason?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const EstablishmentSchema =
  new Schema<IEstablishment>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 160,
        index: true,
      },

      type: {
        type: String,
        enum: ESTABLISHMENT_TYPES,
        required: true,
        index: true,
      },

      status: {
        type: String,
        enum: ESTABLISHMENT_STATUSES,
        default: "pending",
        required: true,
        index: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
        maxlength: 30,
      },

      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },

      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300,
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

      ownerUserId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      captainId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },

      logoUrl: {
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

      rejectionReason: {
        type: String,
        maxlength: 500,
        default: null,
      },

      suspensionReason: {
        type: String,
        maxlength: 500,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

EstablishmentSchema.index({
  type: 1,
  status: 1,
});

EstablishmentSchema.index({
  governorateId: 1,
  areaId: 1,
});

EstablishmentSchema.index({
  captainId: 1,
});

EstablishmentSchema.index({
  createdAt: -1,
});

export const EstablishmentModel =
  model<IEstablishment>(
    "Establishment",
    EstablishmentSchema,
  );
