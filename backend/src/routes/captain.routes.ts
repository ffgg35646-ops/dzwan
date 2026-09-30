import { Router } from "../http/express-compat.js";
import {
  approveCaptain,
  deleteCaptain,
  getCaptain,
  listCaptains,
  rejectCaptain,
  updateCaptain,
  updateCaptainLocation,
} from "../controllers/captain.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";

const router = Router();

router.patch(
  "/me/location",
  requireAuth,
  updateCaptainLocation,
);

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", listCaptains);
router.get("/:id", getCaptain);
router.patch("/:id", updateCaptain);
router.post("/:id/approve", approveCaptain);
router.post("/:id/reject", rejectCaptain);
router.delete("/:id", deleteCaptain);

export default router;
