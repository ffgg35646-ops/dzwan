import { Router } from "../http/express-compat.js";
import {
  listPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
} from "../controllers/pricing.controller.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listPricingRules);
router.post("/", createPricingRule);
router.patch("/:id", updatePricingRule);
router.delete("/:id", deletePricingRule);

export default router;
