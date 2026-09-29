
import { Schema, model, Document } from "mongoose";

export interface IAppBranding extends Document {
  appName: string;

  primaryColor: string;
  primaryDarkColor: string;
  secondaryColor: string;

  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;

  successColor: string;
  dangerColor: string;
  borderColor: string;

  logoUrl?: string;

  updatedAt: Date;
}

const schema = new Schema<IAppBranding>(
  {
    appName: {
      type: String,
      default: "Zajel Delivery",
    },

    primaryColor: {
      type: String,
      default: "#F59E0B",
    },

    primaryDarkColor: {
      type: String,
      default: "#E88A00",
    },

    secondaryColor: {
      type: String,
      default: "#FBBF24",
    },

    backgroundColor: {
      type: String,
      default: "#FFFFFF",
    },

    textColor: {
      type: String,
      default: "#1F2937",
    },

    secondaryTextColor: {
      type: String,
      default: "#6B7280",
    },

    successColor: {
      type: String,
      default: "#22C55E",
    },

    dangerColor: {
      type: String,
      default: "#EF4444",
    },

    borderColor: {
      type: String,
      default: "#E5E7EB",
    },

    logoUrl: String,
  },
  {
    timestamps: true,
  },
);

export default model<IAppBranding>(
  "AppBranding",
  schema,
);
