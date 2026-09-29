
import { Types } from "mongoose";
import {
  NotificationModel,
  type NotificationType,
} from "../models/Notification.js";
import { sendExpoPushToUsers } from "./push-notification.service.js";

interface CreateNotificationInput {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string | Types.ObjectId | null;
  establishmentId?: string | Types.ObjectId | null;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    await NotificationModel.create({
      userId:
        typeof input.userId === "string"
          ? new Types.ObjectId(input.userId)
          : input.userId,

      type: input.type,
      title: input.title,
      message: input.message,

      orderId:
        input.orderId
          ? typeof input.orderId === "string"
            ? new Types.ObjectId(input.orderId)
            : input.orderId
          : null,

      establishmentId:
        input.establishmentId
          ? typeof input.establishmentId === "string"
            ? new Types.ObjectId(
                input.establishmentId,
              )
            : input.establishmentId
          : null,
    });

    await sendExpoPushToUsers(
      [
        typeof input.userId === "string"
          ? input.userId
          : input.userId.toString(),
      ],
      {
        title: input.title,
        body: input.message,
        data: {
          type: input.type,
          orderId: input.orderId
            ? String(input.orderId)
            : null,
          establishmentId: input.establishmentId
            ? String(input.establishmentId)
            : null,
        },
      },
    );
  } catch (error) {
    /*
     * الإشعار لا يجب أن يكسر العملية الأساسية.
     */
    console.error(
      "Create notification error:",
      error,
    );
  }
}

export async function createNotifications(
  userIds: Array<string | Types.ObjectId>,
  input: Omit<CreateNotificationInput, "userId">,
): Promise<void> {
  try {
    if (userIds.length === 0) return;

    await NotificationModel.insertMany(
      userIds.map((userId) => ({
        userId:
          typeof userId === "string"
            ? new Types.ObjectId(userId)
            : userId,

        type: input.type,
        title: input.title,
        message: input.message,

        orderId:
          input.orderId
            ? typeof input.orderId === "string"
              ? new Types.ObjectId(input.orderId)
              : input.orderId
            : null,

        establishmentId:
          input.establishmentId
            ? typeof input.establishmentId === "string"
              ? new Types.ObjectId(
                  input.establishmentId,
                )
              : input.establishmentId
            : null,

        isRead: false,
      })),
      {
        ordered: false,
      },
    );
  } catch (error) {
    console.error(
      "Create notifications error:",
      error,
    );
  }
}
