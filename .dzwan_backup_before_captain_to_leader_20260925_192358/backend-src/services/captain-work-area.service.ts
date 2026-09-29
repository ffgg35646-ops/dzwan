import { Types } from "mongoose";
import { CaptainWorkAreaModel } from "../models/CaptainWorkArea.js";

export async function captainHasWorkArea(
  captainId: Types.ObjectId,
  governorateId: Types.ObjectId,
  areaId: Types.ObjectId,
) {
  return !!(await CaptainWorkAreaModel.exists({
    captainId,
    governorateId,
    areaId,
    isActive: true,
  }));
}

export async function listCaptainWorkAreas(
  captainId: Types.ObjectId,
) {
  return CaptainWorkAreaModel.find({
    captainId,
  })
    .sort({ createdAt: -1 })
    .lean();
}
