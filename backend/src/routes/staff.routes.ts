import { Router } from "../http/express-compat.js";
import {
  createStaffProfile,
  listStaff,
  updateStaff,
} from "../controllers/staff.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", listStaff);
router.post("/:userId", createStaffProfile);
router.patch("/:id", updateStaff);

export default router;
