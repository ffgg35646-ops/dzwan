
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import {
  listRewards,
  createReward,
  updateReward,
  deleteReward,
  listRewardRecordsController,
  updateRewardRecordStatusController,
} from "../controllers/reward.controller.js";

const router = Router();

router.get("/", listRewards);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  createReward,
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  updateReward,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteReward,
);

export default router;

router.get(
  "/records",
  listRewardRecordsController,
);

router.patch(
  "/records/:id",
  requireAuth,
  requireAdmin,
  updateRewardRecordStatusController,
);

