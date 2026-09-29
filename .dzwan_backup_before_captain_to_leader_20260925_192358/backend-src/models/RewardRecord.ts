
import {
  Document,
  Schema,
  Types,
  model,
} from "mongoose";

export type RewardRecordStatus =
  | "pending"
  | "approved"
  | "paid"
  | "cancelled";

export interface IRewardRecord extends Document {
  ruleId: Types.ObjectId;

  target:
    | "captain"
    | "establishment";

  targetId: Types.ObjectId;

  orderId?: Types.ObjectId | null;

  metricValue: number;
  threshold: number;

  rewardValue: number;

  status: RewardRecordStatus;

  reason: string;

  earnedAt: Date;
  paidAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const schema =
  new Schema<IRewardRecord>(
    {
      ruleId: {
        type: Schema.Types.ObjectId,
        ref: "RewardRule",
        required: true,
        index: true,
      },

      target: {
        type: String,
        enum: [
          "captain",
          "establishment",
        ],
        required: true,
        index: true,
      },

      targetId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },

      orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        default: null,
        index: true,
      },

      metricValue: {
        type: Number,
        required: true,
        min: 0,
      },

      threshold: {
        type: Number,
        required: true,
        min: 0,
      },

      rewardValue: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "paid",
          "cancelled",
        ],
        default: "pending",
        index: true,
      },

      reason: {
        type: String,
        required: true,
      },

      earnedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },

      paidAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

schema.index({
  ruleId: 1,
  targetId: 1,
  orderId: 1,
});

export default model<IRewardRecord>(
  "RewardRecord",
  schema,
);
