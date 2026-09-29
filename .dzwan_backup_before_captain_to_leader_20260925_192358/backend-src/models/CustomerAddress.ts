import { Schema, model, type Document, type Types } from "mongoose";

export interface ICustomerAddress extends Document {
  userId: Types.ObjectId;
  governorateId: Types.ObjectId;
  areaId: Types.ObjectId;

  label: string;
  address: string;
  notes?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const CustomerAddressSchema =
  new Schema<ICustomerAddress>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      governorateId: {
        type: Schema.Types.ObjectId,
        ref: "Location",
        required: true,
        index: true,
      },

      areaId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true,
      },

      label: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 50,
        required: true,
      },

      address: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 300,
        required: true,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },

      latitude: {
        type: Number,
        min: -90,
        max: 90,
        default: null,
      },

      longitude: {
        type: Number,
        min: -180,
        max: 180,
        default: null,
      },

      isDefault: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

CustomerAddressSchema.index({
  userId: 1,
  isDefault: 1,
});

CustomerAddressSchema.index({
  governorateId: 1,
  areaId: 1,
});

export const CustomerAddressModel =
  model<ICustomerAddress>(
    "CustomerAddress",
    CustomerAddressSchema,
  );
