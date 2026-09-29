import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";
import {
  approveEstablishment,
  createEstablishment,
  deleteEstablishment,
  getEstablishment,
  listEstablishments,
  rejectEstablishment,
  updateEstablishment,
} from "../controllers/establishment.controller.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", listEstablishments);
router.post("/", createEstablishment);
router.get("/:id", getEstablishment);
router.patch("/:id", updateEstablishment);
router.post("/:id/approve", approveEstablishment);
router.post("/:id/reject", rejectEstablishment);
router.delete("/:id", deleteEstablishment);

export default router;
