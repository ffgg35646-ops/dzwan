import { Types } from "mongoose";
import { AuditLogModel } from "../models/AuditLog.js";

export async function audit(
  input: {
    actorId?: Types.ObjectId | null;
    actorRole?: string | null;
    action: string;
    entityType: string;
    entityId?: Types.ObjectId | null;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
    userAgent?: string | null;
    description?: string | null;
  },
) {
  return AuditLogModel.create({
    ...input,
    before: input.before ?? null,
    after: input.after ?? null,
  });
}
