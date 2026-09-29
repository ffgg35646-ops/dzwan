import { Router } from "express";

import {
  myProfile,
  requestEmailChange,
  verifyEmailChange,
  changePassword,
} from "../controllers/profile.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/me", myProfile);

router.post("/email/request", requestEmailChange);
router.post("/email/verify", verifyEmailChange);

router.post("/password/change", changePassword);

export default router;
