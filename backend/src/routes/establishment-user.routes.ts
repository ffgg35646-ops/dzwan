import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";
import {
  createEstablishmentOwner,
  deleteEstablishmentOwner,
  getEstablishmentOwner,
  listEstablishmentOwners,
  updateEstablishmentOwner,
} from "../controllers/establishment-user.controller.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", listEstablishmentOwners);
router.post("/", createEstablishmentOwner);
router.get("/:id", getEstablishmentOwner);
router.patch("/:id", updateEstablishmentOwner);
router.delete("/:id", deleteEstablishmentOwner);

export default router;
