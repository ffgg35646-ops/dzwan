import { Types } from "mongoose";
import { NotificationRuleModel } from "../models/NotificationRule.js";
import { createNotification } from "./notification.service.js";

export async function emitNotificationEvent(
  event: string,
  input: {
    userIds: Types.ObjectId[];
    orderId?: Types.ObjectId | null;
    establishmentId?: Types.ObjectId | null;
    replacements?: Record<string, string>;
  },
) {
  const rule =
    await NotificationRuleModel.findOne({
      event,
      enabled: true,
    }).lean();

  if (!rule) {
    return {
      sent: 0,
      skipped: true,
    };
  }

  let title = rule.title;
  let message = rule.message;

  for (const [key, value] of Object.entries(
    input.replacements ?? {},
  )) {
    title = title.replaceAll(`{{${key}}}`, value);
    message = message.replaceAll(`{{${key}}}`, value);
  }

  let sent = 0;

  for (const userId of input.userIds) {
    await createNotification({
      userId,
      type: "system",
      title,
      message,
      orderId: input.orderId ?? null,
      establishmentId:
        input.establishmentId ?? null,
    });

    sent++;
  }

  return {
    sent,
    skipped: false,
  };
}
