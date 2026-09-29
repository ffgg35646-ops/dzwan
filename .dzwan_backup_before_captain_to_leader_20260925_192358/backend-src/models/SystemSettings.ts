import mongoose, { Schema, model } from "mongoose";

const systemSettingsSchema = new Schema(
  {
    requireDeliveryOtp: {
      type: Boolean,
      default: true,
    },
    requireDeliveryPhoto: {
      type: Boolean,
      default: false,
    },
    deliveryOtpExpirationMinutes: {
      type: Number,
      default: 10,
      min: 1,
      max: 60,
    },
    deliveryOtpMaxAttempts: {
      type: Number,
      default: 5,
      min: 1,
      max: 20,
    },
    requireCaptainWorkArea: {
      type: Boolean,
      default: true,
    },
    loginMaxFailedAttempts: {
      type: Number,
      enum: [5, 10],
      default: 5,
    },

    // أقصى عدد لمحاولات تسجيل الدخول الخاطئة
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const SystemSettingsModel =
  mongoose.models.SystemSettings ||
  model("SystemSettings", systemSettingsSchema);
