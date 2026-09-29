import mongoose, {
  Schema,
  type Document,
} from "mongoose";

const TimelineSchema = new Schema(
  {
    status: {
      type: String,
      required: true,
    },
    at: {
      type: Date,
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

export interface ICore11OrderState
  extends Document {
  orderId: mongoose.Types.ObjectId;
  flowStatus: string;
  customerSnapshot?: {
    name: string;
    phone: string;
    addressText: string;
    note?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  timeline: Array<{
    status: string;
    at: Date;
    actorId?: mongoose.Types.ObjectId | null;
    note?: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const Core11OrderStateSchema =
  new Schema<ICore11OrderState>(
    {
      orderId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
      },
      flowStatus: {
        type: String,
        default: "pending",
        index: true,
      },
      customerSnapshot: {
        name: {
          type: String,
          default: "",
        },
        phone: {
          type: String,
          default: "",
        },
        addressText: {
          type: String,
          default: "",
        },
        note: {
          type: String,
          default: null,
        },
        latitude: {
          type: Number,
          default: null,
        },
        longitude: {
          type: Number,
          default: null,
        },
      },
      timeline: {
        type: [TimelineSchema],
        default: [],
      },
    },
    { timestamps: true }
  );

export default
  mongoose.models.Core11OrderState ||
  mongoose.model<ICore11OrderState>(
    "Core11OrderState",
    Core11OrderStateSchema
  );
