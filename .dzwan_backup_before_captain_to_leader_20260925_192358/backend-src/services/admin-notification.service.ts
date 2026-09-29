import { Types } from "mongoose";
import { UserModel } from "../models/User.js";
import { NotificationModel, type NotificationType } from "../models/Notification.js";
import { sendExpoPushToUsers } from "./push-notification.service.js";

export type AdminNotificationTarget =
  | {
      type: "user";
      userId: string;
    }
  | {
      type: "all";
      role?: string;
    }
  | {
      type: "group";
      role?: string;
      governorateId?: string;
      areaId?: string;
    };

function validObjectId(value?: string) {
  return !!value && Types.ObjectId.isValid(value);
}


export async function sendAdminNotification(input: {
  target: AdminNotificationTarget;
  title: string;
  message: string;
  type?: NotificationType;
}) {
  const title = String(input.title || "").trim();
  const message = String(input.message || "").trim();
  const type = input.type || "admin";

  if (!title) {
    throw new Error("NOTIFICATION_TITLE_REQUIRED");
  }

  if (!message) {
    throw new Error("NOTIFICATION_MESSAGE_REQUIRED");
  }

  let userIds: string[] = [];

  if (input.target.type === "user") {
    if (!validObjectId(input.target.userId)) {
      throw new Error("INVALID_NOTIFICATION_USER_ID");
    }

    const user = await UserModel.findById(
      input.target.userId,
      { _id: 1 }
    ).lean();

    if (!user) {
      throw new Error("NOTIFICATION_USER_NOT_FOUND");
    }

    userIds = [String(user._id)];
  } else {
    const userFilter: Record<string, any> = {
      status: "active",
    };

    if (input.target.role) {
      userFilter.role = input.target.role;
    }

    if (input.target.type === "group") {
      if (input.target.governorateId) {
        if (!validObjectId(input.target.governorateId)) {
          throw new Error(
            "INVALID_NOTIFICATION_GOVERNORATE_ID"
          );
        }

        userFilter.governorateId =
          input.target.governorateId;
      }

      if (input.target.areaId) {
        if (!validObjectId(input.target.areaId)) {
          throw new Error(
            "INVALID_NOTIFICATION_AREA_ID"
          );
        }

        userFilter.areaId =
          input.target.areaId;
      }
    }

    const users = await UserModel.find(
      userFilter,
      { _id: 1 }
    ).lean();

    userIds = users.map((user) =>
      String(user._id)
    );
  }

  if (userIds.length === 0) {
    return {
      targetType: input.target.type,
      recipientCount: 0,
      pushDevices: 0,
      pushSent: 0,
      pushFailed: 0,
    };
  }

  await NotificationModel.insertMany(
    userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      orderId: null,
      establishmentId: null,
      isRead: false,
    })),
    {
      ordered: false,
    }
  );

  const push = await sendExpoPushToUsers(
    userIds,
    {
      title,
      body: message,
      data: {
        type: "admin",
      },
    }
  );

  return {
    targetType: input.target.type,
    recipientCount: userIds.length,
    pushDevices: push.devices,
    pushSent: push.sent,
    pushFailed: push.failed,
  };
}

