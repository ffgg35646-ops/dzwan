
import { Schema, model, type Document, type Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "system",
  "order",
  "customer",
  "captain",
  "establishment",
  "admin",
] as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[number];

export interface INotification extends Document {
  userId: Types.ObjectId;

  type: NotificationType;
  title: string;
  message: string;

  orderId?: Types.ObjectId | null;
  establishmentId?: Types.ObjectId | null;

  isRead: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema =
  new Schema<INotification>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },

      establishmentId: {
        type: Schema.Types.ObjectId,
        ref: "Establishment",
        default: null,
      },

      isRead: {
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

NotificationSchema.index({
  userId: 1,
  isRead: 1,
  createdAt: -1,
});

NotificationSchema.index({
  userId: 1,
  createdAt: -1,
});

export const NotificationModel =
  model<INotification>(
    "Notification",
    NotificationSchema,
  );
