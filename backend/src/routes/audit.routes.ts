import { Router } from "../http/express-compat.js";
import {
  listAuditLogs,
  getAuditLog,
} from "../controllers/audit.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listAuditLogs);
router.get("/:id", getAuditLog);

export default router;
