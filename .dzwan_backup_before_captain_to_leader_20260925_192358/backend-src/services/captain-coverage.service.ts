import { Types } from "mongoose";
import { UserModel } from "../models/User.js";
import { LocationModel } from "../models/Location.js";
import { CaptainWorkAreaModel } from "../models/CaptainWorkArea.js";
import CoverageModel from "../models/CaptainDefaultCoverage.js";

export async function getDefaultCoverage() {
  const rows = await CoverageModel.find({
    isActive: true,
  })
    .sort({ createdAt: -1 })
    .lean();

  return rows;
}

export async function saveDefaultCoverage(
  sourceGovernorateId: string,
  sourceAreaId: string,
  targets: {
    governorateId: string;
    areaId: string;
  }[],
) {
  await CoverageModel.deleteMany({
    sourceGovernorateId,
    sourceAreaId,
  });

  if (!targets.length) return [];

  return CoverageModel.insertMany(
    targets.map((target) => ({
      sourceGovernorateId,
      sourceAreaId,
      targetGovernorateId: target.governorateId,
      targetAreaId: target.areaId,
      isActive: true,
    })),
  );
}

export async function applyDefaultCoverage(
  captainId: string,
) {
  const captain = await UserModel.findOne({
    _id: captainId,
    role: "captain",
  }).lean();

  if (!captain?.governorateId || !captain?.areaId) {
    return;
  }

  const rows = await CoverageModel.find({
    sourceGovernorateId: captain.governorateId,
    sourceAreaId: captain.areaId,
    isActive: true,
  }).lean();

  const areas = [
    {
      governorateId: captain.governorateId,
      areaId: captain.areaId,
    },
    ...rows.map((row) => ({
      governorateId: row.targetGovernorateId,
      areaId: row.targetAreaId,
    })),
  ];

  for (const area of areas) {
    await CaptainWorkAreaModel.updateOne(
      {
        captainId,
        governorateId: area.governorateId,
        areaId: area.areaId,
      },
      {
        $set: { isActive: true },
      },
      { upsert: true },
    );
  }
}

export async function addCaptainArea(
  captainId: string,
  governorateId: string,
  areaId: string,
) {
  const captain = await UserModel.findById(captainId).lean();

  if (!captain) {
    throw new Error("الكابتن غير موجود.");
  }

  const allowed = await CoverageModel.exists({
    sourceGovernorateId: captain.governorateId,
    sourceAreaId: captain.areaId,
    targetGovernorateId: governorateId,
    targetAreaId: areaId,
    isActive: true,
  });

  const isBaseArea =
    String(captain.governorateId) === governorateId &&
    String(captain.areaId) === areaId;

  if (!allowed && !isBaseArea) {
    throw new Error(
      "هذه المنطقة غير مسموح بها لهذا الكابتن.",
    );
  }

  return CaptainWorkAreaModel.findOneAndUpdate(
    {
      captainId,
      governorateId,
      areaId,
    },
    {
      $set: { isActive: true },
    },
    { upsert: true, new: true },
  );
}

export async function getCaptainAreas(
  captainId: string,
) {
  return CaptainWorkAreaModel.find({
    captainId: new Types.ObjectId(captainId),
    isActive: true,
  }).lean();
}

export async function removeCaptainArea(
  captainId: string,
  workAreaId: string,
) {
  return CaptainWorkAreaModel.findOneAndDelete({
    _id: workAreaId,
    captainId,
  });
}
