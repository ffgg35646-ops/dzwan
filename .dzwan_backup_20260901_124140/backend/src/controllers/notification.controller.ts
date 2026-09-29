
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { NotificationModel } from "../models/Notification.js";

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

    const notifications =
      await NotificationModel.find({
        userId: req.user.sub,
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("orderId", "_id orderNumber status")
        .lean();

    const unreadCount =
      await NotificationModel.countDocuments({
        userId: req.user.sub,
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

    const notification =
      await NotificationModel.findOneAndUpdate(
        {
          _id: String(req.params.id),
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
