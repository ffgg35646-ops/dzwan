import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    event: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    recipients: {
      type: [String],
      default: [],
    },

    title: {
      type: String,
      required: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const NotificationRuleModel =
  model("NotificationRule", schema);
