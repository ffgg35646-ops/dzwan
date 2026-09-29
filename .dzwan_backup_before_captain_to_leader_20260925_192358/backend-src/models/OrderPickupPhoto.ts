import mongoose, {
  Schema,
  type Document,
  type Types,
} from "mongoose";

export interface IOrderPickupPhoto extends Document {
  orderId: Types.ObjectId;
  captainId: Types.ObjectId;
  photoUrl: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema =
  new Schema<IOrderPickupPhoto>(
    {
      orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        unique: true,
        index: true,
      },

      captainId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      photoUrl: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },

      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

export default
  mongoose.models.OrderPickupPhoto ||
  mongoose.model<IOrderPickupPhoto>(
    "OrderPickupPhoto",
    schema,
  );
