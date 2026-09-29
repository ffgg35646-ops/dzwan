import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getCaptainBalance,
} from "../services/captain-ledger.service.js";
import { CaptainLedgerModel } from "../models/CaptainLedger.js";

export async function myLedger(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = req.user?.sub;

  if (!captainId || !Types.ObjectId.isValid(captainId)) {
    return res.status(401).json({ message: "غير مصرح." });
  }

  if (!captainId) {
    return res.status(401).json({
      message: "غير مصرح.",
    });
  }

  const entries = await CaptainLedgerModel.find({ captainId })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const balance = await getCaptainBalance(new Types.ObjectId(captainId));

  return res.json({
    balance,
    entries,
  });
}

export async function captainLedger(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = String(req.params.captainId);

  if (!Types.ObjectId.isValid(captainId)) {
    return res.status(400).json({ message: "معرف الكابتن غير صحيح." });
  }

  const entries = await CaptainLedgerModel.find({ captainId })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const balance = await getCaptainBalance(new Types.ObjectId(captainId));

  return res.json({
    balance,
    entries,
  });
}
