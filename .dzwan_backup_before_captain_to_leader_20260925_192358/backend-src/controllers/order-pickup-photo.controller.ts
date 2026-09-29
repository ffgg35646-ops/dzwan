import { Response } from "express";
import { Types } from "mongoose";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  saveOrderPickupPhoto,
  getOrderPickupPhoto,
} from "../services/order-pickup-photo.service.js";

export async function uploadPickupPhoto(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = new Types.ObjectId(
      String(req.user?.sub),
    );

    const orderId = new Types.ObjectId(
      String(req.params.orderId),
    );

    if (!req.file) {
      return res.status(400).json({
        message: "يجب إرفاق صورة الطلب.",
      });
    }

    const photoUrl =
      `/uploads/pickup/${req.file.filename}`;

    const photo = await saveOrderPickupPhoto(
      orderId,
      captainId,
      photoUrl,
    );

    return res.status(201).json({
      message: "تم حفظ صورة استلام الطلب.",
      photo,
    });
  } catch (error) {
    console.error("uploadPickupPhoto error:", error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر حفظ صورة الطلب.",
    });
  }
}

export async function pickupPhotoDetails(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const orderId = new Types.ObjectId(
      String(req.params.orderId),
    );

    const photo = await getOrderPickupPhoto(orderId);

    if (!photo) {
      return res.status(404).json({
        message: "لا توجد صورة استلام لهذا الطلب.",
      });
    }

    return res.json({ photo });
  } catch (error) {
    console.error("pickupPhotoDetails error:", error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر جلب صورة الطلب.",
    });
  }
}
