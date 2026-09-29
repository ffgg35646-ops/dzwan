import mongoose, { Schema, type Document } from "mongoose";

export interface ICaptainCashTransaction extends Document {
  captainId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  type:
    | "paid_establishment"
    | "collected_customer";
  amount: number;
  createdAt: Date;
}

const schema = new Schema<ICaptainCashTransaction>(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "paid_establishment",
        "collected_customer",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

schema.index({
  captainId: 1,
  orderId: 1,
  type: 1,
});

export default mongoose.models.CaptainCashTransaction ||
  mongoose.model<ICaptainCashTransaction>(
    "CaptainCashTransaction",
    schema
  );
