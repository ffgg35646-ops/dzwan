import { Schema, model, type Document, type Types } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
  "rejected",
] as const;

export type OrderStatus =
  (typeof ORDER_STATUSES)[number];

export interface IOrderItem {
  productId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOrder extends Document {
  orderNumber: string;

  customerId: Types.ObjectId;
  establishmentId: Types.ObjectId;
  addressId: Types.ObjectId;

  captainId?: Types.ObjectId | null;

  items: IOrderItem[];

  subtotal: number;
  deliveryFee: number;
  total: number;

  status: OrderStatus;

  customerNote?: string | null;

  confirmedAt?: Date | null;
  assignedAt?: Date | null;
  pickedUpAt?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;

  cancellationReason?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema =
  new Schema<IOrderItem>(
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      unitPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      totalPrice: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      _id: false,
    },
  );

const OrderSchema =
  new Schema<IOrder>(
    {
      orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      customerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      establishmentId: {
        type: Schema.Types.ObjectId,
        ref: "Establishment",
        required: true,
        index: true,
      },

      addressId: {
        type: Schema.Types.ObjectId,
        ref: "CustomerAddress",
        required: true,
        index: true,
      },

      captainId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      items: {
        type: [OrderItemSchema],
        required: true,
        validate: {
          validator: (
            value: IOrderItem[],
          ) => value.length > 0,
          message:
            "يجب أن يحتوي الطلب على منتج واحد على الأقل.",
        },
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      deliveryFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      total: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: ORDER_STATUSES,
        required: true,
        default: "pending",
        index: true,
      },

      customerNote: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null,
      },

      confirmedAt: {
        type: Date,
        default: null,
      },

      assignedAt: {
        type: Date,
        default: null,
      },

      pickedUpAt: {
        type: Date,
        default: null,
      },

      deliveredAt: {
        type: Date,
        default: null,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },

      cancellationReason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

OrderSchema.index({
  customerId: 1,
  createdAt: -1,
});

OrderSchema.index({
  establishmentId: 1,
  status: 1,
  createdAt: -1,
});

OrderSchema.index({
  captainId: 1,
  status: 1,
  createdAt: -1,
});

export const OrderModel =
  model<IOrder>("Order", OrderSchema);
