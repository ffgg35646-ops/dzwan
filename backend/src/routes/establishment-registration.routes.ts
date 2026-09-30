import { Router } from "../http/express-compat.js";

import {
  registerEstablishment,
  verifyEstablishmentRegistration,
  listEstablishmentRegistrations,
  approveEstablishmentRegistration,
  rejectEstablishmentRegistration,
} from "../controllers/establishment-registration.controller.js";

import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", registerEstablishment);
router.post("/verify-email", verifyEstablishmentRegistration);

router.get(
  "/",
  requireAuth,
  requireAdmin,
  listEstablishmentRegistrations,
);

router.post(
  "/:id/approve",
  requireAuth,
  requireAdmin,
  approveEstablishmentRegistration,
);

router.post(
  "/:id/reject",
  requireAuth,
  requireAdmin,
  rejectEstablishmentRegistration,
);

export default router;
