import { Router } from "express";
import {
  deleteUser,
  getUser,
  listUsers,
  updateUser,
} from "../controllers/user.controller.js";
import {
  requireAdmin,
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
