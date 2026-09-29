
import { Schema, model, Document } from "mongoose";

export interface ISupportSettings extends Document {
  phoneNumbers: string[];
  whatsapp: string[];
  telegram: string[];

  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;

  message?: string;
  workingHours?: string;

  enabled: boolean;
}

const schema = new Schema<ISupportSettings>(
  {
    phoneNumbers: {
      type: [String],
      default: [],
    },

    whatsapp: {
      type: [String],
      default: [],
    },

    telegram: {
      type: [String],
      default: [],
    },

    facebook: String,
    instagram: String,
    youtube: String,
    tiktok: String,

    message: String,
    workingHours: String,

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default model<ISupportSettings>(
  "SupportSettings",
  schema,
);
