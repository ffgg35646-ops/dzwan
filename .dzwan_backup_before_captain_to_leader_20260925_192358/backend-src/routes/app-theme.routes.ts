
import { Router } from "express";
import {
  getAvailableThemes,
  getActiveTheme,
  updateActiveTheme,
} from "../controllers/app-theme.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/available",
  getAvailableThemes,
);

router.get(
  "/active",
  getActiveTheme,
);

router.patch(
  "/active",
  requireAuth,
  updateActiveTheme,
);

export default router;
