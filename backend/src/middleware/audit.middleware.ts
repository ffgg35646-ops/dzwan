
import type {
  NextFunction,
  Request,
  Response
} from "../http/express-compat.js";
import { writeAuditLog } from "../services/audit.service.js";

export function auditAction(
  action: string,
  resource: string,
) {
  return (
    req: Request & {
      user?: {
        sub?: string;
        role?: string;
      };
    },
    res: Response,
    next: NextFunction,
  ) => {
    res.on("finish", () => {
      if (
        res.statusCode >= 200 &&
        res.statusCode < 400
      ) {
        void writeAuditLog({
          actorId: req.user?.sub || null,
          actorRole:
            req.user?.role || null,
          action,
          resourceId:
          typeof req.params?.id === "string"
            ? req.params.id
            : typeof req.body?.id === "string"
              ? req.body.id
              : null
        });
      }
    });

    next();
  };
}
