import type {
  Request,
  Response,
} from "express";
import mongoose from "mongoose";

function actor(req: Request) {
  const id =
    (req as any).user?.sub || null;

  return id &&
    mongoose.isValidObjectId(id)
    ? new mongoose.Types.ObjectId(id)
    : null;
}

async function model() {
  const m =
    await import(
      "../models/Establishment.js"
    );

  return (
    (m as any).EstablishmentModel ??
    (m as any).default
  );
}

export async function suspendEstablishmentCore(
  req: Request,
  res: Response
) {
  const EstablishmentModel =
    await model();

  const establishment =
    await EstablishmentModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "suspended",
          suspensionReason:
            String(
              req.body?.reason ||
              ""
            ).trim() || null,
          suspendedAt: new Date(),
          suspendedBy: actor(req),
        },
      },
      { new: true }
    );

  if (!establishment) {
    return res.status(404).json({
      success: false,
      message: "المحل غير موجود",
    });
  }

  if (establishment.ownerUserId) {
    const { UserModel } = await import("../models/User.js");

    await UserModel.findByIdAndUpdate(
      establishment.ownerUserId,
      {
        $set: {
          status: "suspended",
        },
      },
    );
  }

  return res.json({
    success: true,
    message: "تم إيقاف المحل",
    data: establishment,
  });
}

export async function reactivateEstablishmentCore(
  req: Request,
  res: Response
) {
  const EstablishmentModel =
    await model();

  const establishment =
    await EstablishmentModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "active",
          reactivatedAt: new Date(),
          reactivatedBy: actor(req),
        },
        $unset: {
          suspensionReason: 1,
        },
      },
      { new: true }
    );

  if (!establishment) {
    return res.status(404).json({
      success: false,
      message: "المحل غير موجود",
    });
  }

  if (establishment.ownerUserId) {
    const { UserModel } = await import("../models/User.js");

    await UserModel.findByIdAndUpdate(
      establishment.ownerUserId,
      {
        $set: {
          status: "active",
        },
      },
    );
  }

  return res.json({
    success: true,
    message:
      "تمت إعادة تفعيل المحل",
    data: establishment,
  });
}

export async function updateEstablishmentLocationCore(
  req: Request,
  res: Response
) {
  const lat = Number(
    req.body?.latitude
  );

  const lng = Number(
    req.body?.longitude
  );

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return res.status(400).json({
      success: false,
      message:
        "إحداثيات الموقع غير صحيحة",
    });
  }

  const EstablishmentModel =
    await model();

  const establishment =
    await EstablishmentModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          latitude: lat,
          longitude: lng,
          locationUpdatedAt:
            new Date(),
          locationUpdatedBy:
            actor(req),
        },
      },
      { new: true }
    );

  if (!establishment) {
    return res.status(404).json({
      success: false,
      message: "المحل غير موجود",
    });
  }

  return res.json({
    success: true,
    message:
      "تم تحديث موقع المحل",
    data: establishment,
  });
}
