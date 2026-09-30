import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  sendAdminNotificationController,
} from "../controllers/admin-notification.controller.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.post("/", sendAdminNotificationController);

export default router;
