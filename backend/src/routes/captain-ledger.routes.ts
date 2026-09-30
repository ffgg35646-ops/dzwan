import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  myLedger,
  captainLedger,
} from "../controllers/captain-ledger.controller.js";
import { resetCaptainStatements } from "../controllers/captain-statement-reset.controller.js";

const router = Router();

router.post(
  "/statements/reset",
  requireAuth,
  requireAdmin,
  resetCaptainStatements,
);


router.get("/me", requireAuth, myLedger);
router.get("/:captainId", requireAuth, requireAdmin, captainLedger);

export default router;
