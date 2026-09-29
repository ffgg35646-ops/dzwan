import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";
import { getScopedLocations } from "../controllers/scoped-location.controller.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", getScopedLocations);

export default router;
