import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  registerPushDevice,
} from "../controllers/push-device.controller.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/register-device",
  registerPushDevice
);

router.post(
  "/device",
  registerPushDevice
);

export default router;
