import { Router } from "../http/express-compat.js";
import {
  requireAdmin,
} from "../middleware/auth.middleware.js";

import {
  getCoreOperationsSettings,
  updateCoreOperationsSettings,
} from "../controllers/core-operations-settings.controller.js";

const router = Router();

router.get(
  "/",
  requireAdmin,
  getCoreOperationsSettings
);

router.patch(
  "/",
  requireAdmin,
  updateCoreOperationsSettings
);

export default router;
