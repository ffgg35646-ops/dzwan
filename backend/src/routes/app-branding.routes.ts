
import { Router } from "../http/express-compat.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getAppBranding,
  updateAppBranding,
} from "../controllers/app-branding.controller.js";

const router = Router();

router.get("/", getAppBranding);

router.patch(
  "/",
  requireAuth,
  updateAppBranding,
);

export default router;
