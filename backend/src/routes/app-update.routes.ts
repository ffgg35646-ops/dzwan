
import { Router } from "express";
import { getAppUpdateInfo } from "../controllers/app-update.controller.js";

const router = Router();

router.get(
  "/",
  getAppUpdateInfo,
);

export default router;
