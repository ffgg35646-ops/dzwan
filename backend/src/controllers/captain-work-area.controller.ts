import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { CaptainWorkAreaModel } from "../models/CaptainWorkArea.js";

export async function addWorkArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = typeof req.params.captainId === "string"
      ? req.params.captainId
      : req.user?.sub;
    const { governorateId, areaId } = req.body;

    if (
      !captainId ||
      !governorateId ||
      !areaId ||
      !Types.ObjectId.isValid(governorateId) ||
      !Types.ObjectId.isValid(areaId)
    ) {
      return res.status(400).json({
        message: "بيانات منطقة العمل غير صحيحة.",
      });
    }

    const exists = await CaptainWorkAreaModel.findOne({
      captainId,
      governorateId,
      areaId,
    });

    if (exists) {
      if (!exists.isActive) {
        exists.isActive = true;
        await exists.save();
      }

      return res.json({
        message: "منطقة العمل موجودة بالفعل.",
        workArea: exists,
      });
    }

    const workArea = await CaptainWorkAreaModel.create({
      captainId,
      governorateId,
      areaId,
      isActive: true,
    });

    return res.status(201).json({
      message: "تمت إضافة منطقة العمل.",
      workArea,
    });
  } catch (error) {
    console.error("addWorkArea error:", error);
    return res.status(500).json({
      message: "تعذر إضافة منطقة العمل.",
    });
  }
}

export async function listWorkAreas(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = typeof req.params.captainId === "string"
      ? req.params.captainId
      : req.user?.sub;

  const rows = await CaptainWorkAreaModel.find({
    captainId,
  })
    .populate("governorateId", "name")
    .populate("areaId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ workAreas: rows });
}

export async function toggleWorkArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  const row = await CaptainWorkAreaModel.findById(req.params.id);

  if (!row) {
    return res.status(404).json({
      message: "منطقة العمل غير موجودة.",
    });
  }

  row.isActive = !row.isActive;
  await row.save();

  return res.json({
    message: row.isActive
      ? "تم تفعيل منطقة العمل."
      : "تم تعطيل منطقة العمل.",
    workArea: row,
  });
}

export async function deleteWorkArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  const row = await CaptainWorkAreaModel.findByIdAndDelete(
    req.params.id,
  );

  if (!row) {
    return res.status(404).json({
      message: "منطقة العمل غير موجودة.",
    });
  }

  return res.json({
    message: "تم حذف منطقة العمل.",
  });
}
