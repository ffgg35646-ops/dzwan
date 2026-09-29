import { Router } from "express";
import {
  deleteUser,
  getUser,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from "../controllers/users.controller.js";
import {
  requireAdmin,
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

export default router;
