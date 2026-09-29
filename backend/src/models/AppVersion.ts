import mongoose, { Schema, Document } from "mongoose";

export interface IAppVersion extends Document {
  platform: "android" | "ios" | "captain" | "shop";
  version: string;
  buildNumber: number;
  minimumSupportedBuild: number;
  forceUpdate: boolean;
  downloadUrl?: string;
  releaseNotes?: string;
  isActive: boolean;
}

const schema = new Schema<IAppVersion>(
  {
    platform: {
      type: String,
      enum: ["android", "ios", "captain", "shop"],
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    buildNumber: {
      type: Number,
      required: true,
    },
    minimumSupportedBuild: {
      type: Number,
      required: true,
      default: 1,
    },
    forceUpdate: {
      type: Boolean,
      default: false,
    },
    downloadUrl: String,
    releaseNotes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

schema.index({ platform: 1, buildNumber: -1 });

export default mongoose.model<IAppVersion>("AppVersion", schema);
