import { Types } from "mongoose";
import { AuditLogModel } from "../models/AuditLog.js";

export async function createAuditLog(input: {
  actorId?: Types.ObjectId | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  description?: string | null;
}) {
  return AuditLogModel.create(input);
}

export async function getAuditLogs(
  filter: Record<string, unknown> = {},
) {
  return AuditLogModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
}
