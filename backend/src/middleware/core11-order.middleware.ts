import type {
  NextFunction,
  Request,
  Response,
} from "express";

import mongoose from "mongoose";

function userId(req: Request) {
  return String(
    (req as any).user?.sub || ""
  );
}

function getBodyCustomer(
  body: any
) {
  const name = String(
    body?.customer?.name ??
    body?.customerName ??
    ""
  ).trim();

  const phone = String(
    body?.customer?.phone ??
    body?.customerPhone ??
    ""
  ).trim();

  const addressText = String(
    body?.customer?.addressText ??
    body?.deliveryAddress ??
    body?.addressText ??
    ""
  ).trim();

  if (!name) {
    throw new Error(
      "CUSTOMER_NAME_REQUIRED"
    );
  }

  if (!phone) {
    throw new Error(
      "CUSTOMER_PHONE_REQUIRED"
    );
  }

  if (!addressText) {
    throw new Error(
      "DELIVERY_ADDRESS_REQUIRED"
    );
  }

  let latitude = null;
  let longitude = null;

  if (
    body?.customer?.latitude !== undefined ||
    body?.deliveryLatitude !== undefined
  ) {
    latitude = Number(
      body?.customer?.latitude ??
      body?.deliveryLatitude
    );

    longitude = Number(
      body?.customer?.longitude ??
      body?.deliveryLongitude
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error(
        "INVALID_COORDINATES"
      );
    }
  }

  return {
    name,
    phone,
    addressText,
    note:
      body?.customer?.note ??
      body?.customerNote ??
      body?.deliveryNote ??
      null,
    latitude,
    longitude,
  };
}

export async function core11OrderCreateGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body || {};

    const EstablishmentModule =
      await import(
        "../models/Establishment.js"
      );

    const EstablishmentModel =
      (EstablishmentModule as any)
        .EstablishmentModel ??
      (EstablishmentModule as any)
        .default;

    const establishmentId = String(
      body.establishmentId || ""
    );

    if (
      establishmentId &&
      mongoose.isValidObjectId(
        establishmentId
      )
    ) {
      const establishment =
        await EstablishmentModel.findById(
          establishmentId
        );

      if (!establishment) {
        return res.status(404).json({
          success: false,
          message: "المحل غير موجود",
        });
      }

      const status = String(
        (establishment as any).status ||
        (establishment as any).approvalStatus ||
        ""
      ).toLowerCase();

      if (
        status &&
        ![
          "active",
          "approved",
        ].includes(status)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "لا يمكن إنشاء الطلب قبل اعتماد المحل",
          status,
        });
      }
    }

    (req as any).core11 =
      (req as any).core11 || {};

    (req as any).core11.actorId =
      userId(req) || null;

    return next();
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "بيانات الطلب غير صحيحة",
    });
  }
}

export async function core11CaptainGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const role = String(
      (req as any).user?.role || ""
    );

    if (role !== "captain") {
      return next();
    }

    const id = userId(req);

    if (!mongoose.isValidObjectId(id)) {
      return res.status(401).json({
        success: false,
        message: "جلسة الكابتن غير صحيحة",
      });
    }

    // الشفت لا يكون إلزاميًا إلا إذا تم تفعيله من إعدادات الـ Dispatch.
    const DispatchSettingsModule =
      await import("../models/DispatchSettings.js");

    const DispatchSettingsModel =
      (DispatchSettingsModule as any).DispatchSettingsModel ??
      (DispatchSettingsModule as any).default;

    const settings =
      await DispatchSettingsModel.findOne().lean();

    const requireCaptainShift =
      Boolean(
        (settings as any)?.requireCaptainShift
      );

    if (!requireCaptainShift) {
      return next();
    }

    // عند تفعيل إلزام الشفت، استخدم نظام الشفت اليومي الحالي.
    const ShiftRuntimeModule =
      await import(
        "../services/r11-strict-shift-runtime.service.js"
      );

    const result =
      await ShiftRuntimeModule.checkStrictShift(id);

    console.log("===== CORE11 CAPTAIN GUARD =====");
    console.log({
      captainId: id,
      requireCaptainShift,
      shiftResult: result,
    });

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        message:
          result.reason === "NO_SHIFT"
            ? "لا يوجد شفت فعال للكابتن."
            : "لا يمكن للكابتن العمل خارج وقت الشفت.",
        code:
          result.reason === "NO_SHIFT"
            ? "NO_ACTIVE_SHIFT"
            : "OUTSIDE_SHIFT",
      });
    }

    return next();

  } catch (error: any) {
    console.error("===== CORE11 CAPTAIN GUARD ERROR =====");
    console.error(error);

    return res.status(403).json({
      success: false,
      message:
        error?.message ||
        "تعذر التحقق من الشفت",
    });
  }
}
