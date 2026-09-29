import { Router } from "express";
import {
  login,
  logout,
  me,
  refresh,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.get("/me", me);
router.post("/logout", logout);

export default router;
