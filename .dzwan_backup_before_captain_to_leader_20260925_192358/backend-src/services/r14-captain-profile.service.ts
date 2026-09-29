import mongoose from "mongoose";
import { UserModel } from "../models/User.js";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import CaptainRegistrationModel from "../models/CaptainRegistration.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import { OrderModel } from "../models/Order.js";
import { CaptainRatingModel } from "../models/CaptainRating.js";
import { AuditLogModel } from "../models/AuditLog.js";
import { getCaptainKpi } from "./captain-kpi.service.js";

export async function getCaptainCompleteProfile(
  captainId: string
) {
  if (!mongoose.isValidObjectId(captainId)) {
    throw new Error("INVALID_CAPTAIN_ID");
  }

  const captain = await UserModel.findOne({
    _id: captainId,
    role: "captain",
  }).lean();

  if (!captain) {
    throw new Error("CAPTAIN_NOT_FOUND");
  }

  const [registration, attendance, shift, orders, ratings, auditLogs, kpi] =
    await Promise.all([
      CaptainRegistrationModel.findOne({
        phone: captain.phone,
      }).lean(),

      CaptainAttendanceModel.find({
        captainId,
      })
        .sort({ date: -1 })
        .limit(100)
        .lean(),

      CaptainShiftModel.findOne({
        captainId,
      })
        .sort({ weekStart: -1 })
        .lean(),

      OrderModel.find({
        captainId,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      CaptainRatingModel.find({
        captainId,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      AuditLogModel.find({
        actorId: captainId,
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      getCaptainKpi(
        new mongoose.Types.ObjectId(captainId),
        new Date(0),
        new Date(),
      ),
    ]);

  return {
    captain,
    registration,
    shift,
    attendance,
    orders,
    ratings,
    kpi,
    auditLogs,
  };
}
