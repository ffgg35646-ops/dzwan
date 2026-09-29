
import { AuditLogModel } from "../models/AuditLog.js";

interface AuditInput {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resourceId?: string | null;
  method?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(
  input: AuditInput,
): Promise<void> {
  try {
    await AuditLogModel.create({
      actorId: input.actorId || null,
      actorRole: input.actorRole || null,
      action: input.action,
    });
  } catch (error) {
    /*
     * فشل الـAudit Log لا يجب أن يكسر العملية الأساسية.
     */
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Audit log error:",
        error,
      );
    }
  }
}
