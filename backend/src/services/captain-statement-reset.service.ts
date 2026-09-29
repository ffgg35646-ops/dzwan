import { Types } from "mongoose";
import CaptainCashStatementResetModel from "../models/CaptainCashStatementReset.js";

export async function getCaptainStatementResetAt(
  captainId: string | Types.ObjectId,
) {
  const row =
    await CaptainCashStatementResetModel.findOne({
      captainId:
        typeof captainId === "string"
          ? new Types.ObjectId(captainId)
          : captainId,
    })
      .select("resetAt")
      .lean();

  return row?.resetAt
    ? new Date(row.resetAt)
    : null;
}

export async function resetCaptainStatement(
  captainId: string | Types.ObjectId,
  resetBy?: string | Types.ObjectId | null,
) {
  const captainObjectId =
    typeof captainId === "string"
      ? new Types.ObjectId(captainId)
      : captainId;

  const resetByObjectId =
    resetBy &&
    Types.ObjectId.isValid(
      String(resetBy),
    )
      ? new Types.ObjectId(
          String(resetBy),
        )
      : null;

  const resetAt = new Date();

  return CaptainCashStatementResetModel.findOneAndUpdate(
    { captainId: captainObjectId },
    {
      $set: {
        resetAt,
        resetBy: resetByObjectId,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
}
