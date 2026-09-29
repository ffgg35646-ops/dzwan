import { Types } from "mongoose";
import { CaptainLedgerModel } from "../models/CaptainLedger.js";

export async function addCaptainLedgerEntry(input: {
  captainId: Types.ObjectId;
  type:
    | "delivery_earning"
    | "bonus"
    | "penalty"
    | "adjustment"
    | "withdrawal";
  amount: number;
  referenceType?: string | null;
  referenceId?: Types.ObjectId | null;
  description: string;
}) {
  if (!Number.isFinite(input.amount)) {
    throw new Error("INVALID_LEDGER_AMOUNT");
  }

  const last = await CaptainLedgerModel.findOne({
    captainId: input.captainId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  const balanceBefore = Number(last?.balanceAfter ?? 0);
  const balanceAfter =
    balanceBefore + input.amount;

  return CaptainLedgerModel.create({
    ...input,
    balanceBefore,
    balanceAfter,
  });
}

export async function getCaptainBalance(
  captainId: Types.ObjectId,
) {
  const last = await CaptainLedgerModel.findOne({
    captainId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  return Number(last?.balanceAfter ?? 0);
}
