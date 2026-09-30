import { Router } from "../http/express-compat.js";
import {
  deleteUser,
  getUser,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from "../controllers/users.controller.js";
import { requireAdmin, requireAuth, requireSuperAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireSuperAdmin);

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

export default router;
