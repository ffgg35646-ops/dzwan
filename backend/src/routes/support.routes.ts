
import { Router } from "../http/express-compat.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import {
  getSupport,
  updateSupport,
} from "../controllers/support.controller.js";

const router = Router();

router.get("/", getSupport);

router.patch(
  "/",
  requireAuth,
  requireAdmin,
  updateSupport,
);

export default router;
