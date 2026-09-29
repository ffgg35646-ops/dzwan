import { Router, type NextFunction, type Response } from "express";

import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  type ScopedRequest,
} from "../middleware/scope.middleware.js";

import {
  listLeaders,
  getLeader,
  createLeader,
  updateLeader,
  approveLeader,
  rejectLeader,
  deleteLeader,
  leaderDashboard,
  leaderOrders,
  leaderCaptains,
  leaderEstablishments,
  leaderScope,
} from "../controllers/leader.controller.js";

const router = Router();

router.use(requireAuth);
router.use(
  loadUserScope as (
    req: ScopedRequest,
    res: Response,
    next: NextFunction,
  ) => void,
);

// IMPORTANT:
// /me/* routes come before /:id so "me" is not treated as an ID.

router.get(
  "/me/dashboard",
  leaderDashboard,
);

router.get(
  "/me/orders",
  leaderOrders,
);

router.get(
  "/me/captains",
  leaderCaptains,
);

router.get(
  "/me/establishments",
  leaderEstablishments,
);

router.get(
  "/me/scope",
  leaderScope,
);

// Existing admin Leader management API.
router.get("/", listLeaders);
router.post("/", createLeader);
router.get("/:id", getLeader);
router.patch("/:id", updateLeader);
router.post("/:id/approve", approveLeader);
router.post("/:id/reject", rejectLeader);
router.delete("/:id", deleteLeader);

export default router;
