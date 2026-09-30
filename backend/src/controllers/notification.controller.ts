
import type { Response } from "../http/express-compat.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { NotificationModel } from "../models/Notification.js";
import { Types } from "mongoose";

export async function listNotifications(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user?.sub) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const limitRaw = Number(req.query.limit ?? 30);

    const limit =
      Number.isFinite(limitRaw) &&
      limitRaw > 0 &&
      limitRaw <= 100
        ? Math.floor(limitRaw)
        : 30;

    const isAdmin =
      req.user.role === "admin" ||
      req.user.role === "super_admin";

    const notificationQuery = isAdmin
      ? {}
      : { userId: req.user.sub };

    const notifications =
      await NotificationModel.find(
        notificationQuery,
      )
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("orderId", "_id orderNumber status")
        .lean();

    const unreadCount =
      await NotificationModel.countDocuments({
        ...notificationQuery,
        isRead: false,
      });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(
      "List notifications error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "تعذر تحميل الإشعارات حاليًا.",
    });
  }
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user?.sub) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const notificationId = String(req.params.id || "").trim();

    if (!Types.ObjectId.isValid(notificationId)) {
      res.status(400).json({
        success: false,
        message: "معرّف الإشعار غير صالح.",
      });
      return;
    }

    const notification =
      await NotificationModel.findOneAndUpdate(
        {
          _id: notificationId,
          userId: req.user.sub,
        },
        {
          $set: {
            isRead: true,
          },
        },
        {
          new: true,
        },
      ).lean();

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "الإشعار غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "تعذر تحديث الإشعار.",
    });
  }
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user?.sub) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    await NotificationModel.updateMany(
      {
        userId: req.user.sub,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    );

    res.status(200).json({
      success: true,
      message: "تم تحديد جميع الإشعارات كمقروءة.",
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "تعذر تحديث الإشعارات.",
    });
  }
}
