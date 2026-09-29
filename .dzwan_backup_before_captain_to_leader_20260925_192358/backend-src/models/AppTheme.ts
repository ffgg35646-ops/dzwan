
import { Schema, model, Document } from "mongoose";

export type ThemeId =
  | "classic-orange"
  | "quiet"
  | "soft-blue"
  | "sage"
  | "sand"
  | "graphite"
  | "ivory"
  | "deep-classic"
  | "warm-classic";

export interface IAppTheme extends Document {
  activeTheme: ThemeId;
  updatedAt: Date;
}

const schema = new Schema<IAppTheme>(
  {
    activeTheme: {
      type: String,
      enum: [
        "classic-orange",
        "quiet",
        "soft-blue",
        "sage",
        "sand",
        "graphite",
        "ivory",
        "deep-classic",
        "warm-classic",
      ],
      default: "classic-orange",
    },
  },
  {
    timestamps: true,
  },
);

export default model<IAppTheme>(
  "AppTheme",
  schema,
);
