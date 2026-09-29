import { Types } from "mongoose";
import OrderPickupPhotoModel from "../models/OrderPickupPhoto.js";
import { OrderModel } from "../models/Order.js";

export async function saveOrderPickupPhoto(
  orderId: Types.ObjectId,
  captainId: Types.ObjectId,
  photoUrl: string,
) {
  const order = await OrderModel.findOne({
    _id: orderId,
    captainId,
  }).select("_id captainId");

  if (!order) {
    throw new Error("CAPTAIN_NOT_ASSIGNED_TO_ORDER");
  }

  const existing = await OrderPickupPhotoModel.findOne({
    orderId,
  });

  if (existing) {
    existing.captainId = captainId;
    existing.photoUrl = photoUrl.trim();
    existing.uploadedAt = new Date();

    await existing.save();

    return existing.toObject();
  }

  const photo = await OrderPickupPhotoModel.create({
    orderId,
    captainId,
    photoUrl: photoUrl.trim(),
    uploadedAt: new Date(),
  });

  return photo.toObject();
}

export async function getOrderPickupPhoto(
  orderId: Types.ObjectId,
) {
  return OrderPickupPhotoModel.findOne({
    orderId,
  }).lean();
}
