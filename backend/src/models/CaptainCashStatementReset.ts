import { Schema, model, Document, Types } from "mongoose";

export interface ICaptainCashStatementReset
  extends Document {
  captainId: Types.ObjectId;
  resetAt: Date;
  resetBy?: Types.ObjectId | null;
}

const schema =
  new Schema<ICaptainCashStatementReset>(
    {
      captainId: {
        type: Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
      },

      resetAt: {
        type: Date,
        required: true,
      },

      resetBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

export default model<ICaptainCashStatementReset>(
  "CaptainCashStatementReset",
  schema,
);
