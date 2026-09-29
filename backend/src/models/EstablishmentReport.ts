import { Schema, model, type Document, type Types } from "mongoose";

export interface IEstablishmentReport extends Document {
  establishmentId: Types.ObjectId;
  periodFrom: Date;
  periodTo: Date;

  totalOrders: number;
  pendingOrders: number;
  activeOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;

  subtotal: number;
  deliveryFees: number;
  grossRevenue: number;

  averageOrderValue: number;
  generatedAt: Date;
}

const EstablishmentReportSchema = new Schema<IEstablishmentReport>(
  {
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
      index: true,
    },

    periodFrom: {
      type: Date,
      required: true,
    },

    periodTo: {
      type: Date,
      required: true,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    pendingOrders: {
      type: Number,
      default: 0,
    },

    activeOrders: {
      type: Number,
      default: 0,
    },

    deliveredOrders: {
      type: Number,
      default: 0,
    },

    cancelledOrders: {
      type: Number,
      default: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
    },

    deliveryFees: {
      type: Number,
      default: 0,
    },

    grossRevenue: {
      type: Number,
      default: 0,
    },

    averageOrderValue: {
      type: Number,
      default: 0,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

EstablishmentReportSchema.index({
  establishmentId: 1,
  periodFrom: -1,
});

export const EstablishmentReportModel =
  model<IEstablishmentReport>(
    "EstablishmentReport",
    EstablishmentReportSchema,
  );
