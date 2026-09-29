import { Schema, model, type Document, type Types } from "mongoose";

export const PRODUCT_STATUSES = [
  "active",
  "inactive",
] as const;

export type ProductStatus =
  (typeof PRODUCT_STATUSES)[number];

export interface IProduct extends Document {
  establishmentId: Types.ObjectId;

  name: string;
  description?: string | null;

  price: number;
  imageUrl?: string | null;

  status: ProductStatus;

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    establishmentId: {
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    imageUrl: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: "active",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ProductSchema.index({
  establishmentId: 1,
  status: 1,
});

ProductSchema.index({
  establishmentId: 1,
  createdAt: -1,
});

export const ProductModel =
  model<IProduct>("Product", ProductSchema);
