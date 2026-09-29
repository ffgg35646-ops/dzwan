import { Schema, model, type Document, type Types } from "mongoose";

export interface IPushDevice extends Document {
  userId: Types.ObjectId;
  token: string;
  platform: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushDeviceSchema = new Schema<IPushDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    platform: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      default: "unknown",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PushDeviceSchema.index({
  userId: 1,
  createdAt: -1,
});

export const PushDeviceModel = model<IPushDevice>(
  "PushDevice",
  PushDeviceSchema
);
