import mongoose, { Schema, type Document } from "mongoose";

export interface IOrderTimeline extends Document {
  orderId: mongoose.Types.ObjectId;
  event: string;
  status?: string | null;
  actorId?: mongoose.Types.ObjectId | null;
  captainId?: mongoose.Types.ObjectId | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<IOrderTimeline>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      default: null,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    captainId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

schema.index({
  orderId: 1,
  createdAt: 1,
});

export default mongoose.models.OrderTimeline ||
  mongoose.model<IOrderTimeline>(
    "OrderTimeline",
    schema
  );
