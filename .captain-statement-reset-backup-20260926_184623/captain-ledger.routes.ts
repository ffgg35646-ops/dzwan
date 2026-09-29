import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  myLedger,
  captainLedger,
} from "../controllers/captain-ledger.controller.js";

const router = Router();

router.get("/me", requireAuth, myLedger);
router.get("/:captainId", requireAuth, requireAdmin, captainLedger);

export default router;
