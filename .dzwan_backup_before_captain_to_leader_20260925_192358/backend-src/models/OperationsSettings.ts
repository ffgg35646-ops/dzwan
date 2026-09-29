import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    pricingMode: {
      type: String,
      enum: ["geofencing", "area_to_area"],
      default: "area_to_area",
    },

    stuckOrderMinutes: {
      type: Number,
      default: 10,
      min: 1,
      max: 1440,
    },

    activeOrderMinutes: {
      type: Number,
      default: 120,
      min: 1,
      max: 1440,
    },

    requireCompleteCaptainDocuments: {
      type: Boolean,
      default: true,
    },

    requirePickupPhoto: {
      type: Boolean,
      default: false,
    },

    requireDeliveryOtp: {
      type: Boolean,
      default: true,
    },

    requireDeliveryPhoto: {
      type: Boolean,
      default: false,
    },

    shopCanCancel: {
      type: Boolean,
      default: true,
    },

    captainCanCancel: {
      type: Boolean,
      default: false,
    },

    adminCanCancel: {
      type: Boolean,
      default: true,
    },

    ratingEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const OperationsSettingsModel =
  model("OperationsSettings", schema);
