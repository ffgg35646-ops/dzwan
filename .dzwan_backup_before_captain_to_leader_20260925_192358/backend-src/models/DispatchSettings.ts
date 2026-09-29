import mongoose, { Schema, model } from "mongoose";

const dispatchSettingsSchema = new Schema(
  {
    autoDispatchEnabled: {
      type: Boolean,
      default: true,
    },
    queueEnabled: {
      type: Boolean,
      default: true,
    },
    maxActiveOrdersPerCaptain: {
      type: Number,
      default: 3,
      min: 1,
      max: 100,
    },
    assignmentTimeoutSeconds: {
      type: Number,
      default: 60,
      min: 10,
      max: 3600,
    },
    maxAssignmentAttempts: {
      type: Number,
      default: 5,
      min: 1,
      max: 50,
    },
    onlineOnly: {
      type: Boolean,
      default: true,
    },
    requireSameArea: {
      type: Boolean,
      default: true,
    },
    requireSameGovernorate: {
      type: Boolean,
      default: true,
    },
    requireCaptainShift: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const DispatchSettingsModel =
  mongoose.models.DispatchSettings ||
  model("DispatchSettings", dispatchSettingsSchema);
