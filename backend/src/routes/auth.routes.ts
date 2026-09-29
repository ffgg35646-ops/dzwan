import { Router } from "express";
import { loginRateLimit } from "../middleware/loginRateLimit.middleware.js";
import {
  login,
  logout,
  me,
  refresh,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginRateLimit, login);
router.post("/refresh", refresh);
router.get("/me", me);
router.post("/logout", logout);

router.post("/forgot-password", requestPasswordReset);
router.post("/forgot-password/verify", verifyPasswordResetOtp);
router.post("/forgot-password/reset", resetPassword);

export default router;
