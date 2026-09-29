import { Router } from "express";
import {
  approveLeader,
  createLeader,
  deleteLeader,
  getLeader,
  listLeaders,
  rejectLeader,
  updateLeader,
} from "../controllers/leader.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
} from "../middleware/scope.middleware.js";
import {
  requireLeaderManagement,
} from "../middleware/leader-scope.middleware.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireLeaderManagement,
);

router.get("/", listLeaders);
router.post("/", createLeader);
router.get("/:id", getLeader);
router.patch("/:id", updateLeader);
router.post("/:id/approve", approveLeader);
router.post("/:id/reject", rejectLeader);
router.delete("/:id", deleteLeader);

export default router;
