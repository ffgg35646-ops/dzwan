import mongoose, { Schema, type Document } from "mongoose";

export type PricingMode = "area_to_area" | "geofencing";

export interface ICoreOperationsSettings extends Document {
  pricingMode: PricingMode;
  dispatchTimeoutSeconds: number;
  maxDispatchAttempts: number;
  strictShiftEnforcement: boolean;
  requireEstablishmentApproval: boolean;
  requireEstablishmentLocation: boolean;
}

const schema = new Schema<ICoreOperationsSettings>(
  {
    pricingMode: {
      type: String,
      enum: ["area_to_area", "geofencing"],
      default: "area_to_area",
    },
    dispatchTimeoutSeconds: {
      type: Number,
      min: 5,
      default: 60,
    },
    maxDispatchAttempts: {
      type: Number,
      min: 1,
      default: 5,
    },
    strictShiftEnforcement: {
      type: Boolean,
      default: true,
    },
    requireEstablishmentApproval: {
      type: Boolean,
      default: true,
    },
    requireEstablishmentLocation: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CoreOperationsSettings ||
  mongoose.model<ICoreOperationsSettings>(
    "CoreOperationsSettings",
    schema
  );
