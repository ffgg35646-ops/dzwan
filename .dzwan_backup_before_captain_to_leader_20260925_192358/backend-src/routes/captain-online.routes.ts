
import { Router } from "express";
import {
  getCaptainOnline,
  setCaptainOnline,
} from "../controllers/captain-online.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  getCaptainOnline,
);

router.patch(
  "/",
  requireAuth,
  setCaptainOnline,
);

router.post(
  "/",
  requireAuth,
  setCaptainOnline,
);

export default router;
