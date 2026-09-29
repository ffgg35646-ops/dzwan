export type NotificationTarget =
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

export function validateNotificationTarget(
  target: NotificationTarget
) {
  if (
    target.type === "user" &&
    !target.userId
  ) {
    throw new Error(
      "NOTIFICATION_USER_REQUIRED"
    );
  }

  return true;
}
