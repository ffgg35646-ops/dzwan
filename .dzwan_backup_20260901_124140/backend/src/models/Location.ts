import { Schema, model, type Document, type Types } from "mongoose";

export interface IArea {
  _id: Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILocation extends Document {
  name: string;
  isActive: boolean;
  areas: IArea[];
  createdAt: Date;
  updatedAt: Date;
}

const AreaSchema = new Schema<IArea>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    areas: {
      type: [AreaSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

LocationSchema.index({ createdAt: -1 });

export const LocationModel = model<ILocation>(
  "Location",
  LocationSchema,
);
