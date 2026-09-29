import mongoose, {
  Document,
  Schema,
} from "mongoose";

export interface ISequenceCounter {
  _id: string;
  value: number;
}

const schema =
  new Schema<ISequenceCounter>(
    {
      _id: {
        type: String,
        required: true,
      },

      value: {
        type: Number,
        required: true,
        default: 0,
      },
    },
    {
      collection: "sequence_counters",
      timestamps: true,
    },
  );

const SequenceCounterModel =
  mongoose.models.SequenceCounter ||
  mongoose.model<ISequenceCounter>(
    "SequenceCounter",
    schema,
  );

export default SequenceCounterModel;
