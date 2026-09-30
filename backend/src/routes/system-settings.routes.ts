import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  getSettings,
  updateSettings,
} from "../controllers/system-settings.controller.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, getSettings);
router.patch("/", requireAuth, requireAdmin, updateSettings);

export default router;
