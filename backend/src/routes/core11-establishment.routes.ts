import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

import {
  suspendEstablishmentCore,
  reactivateEstablishmentCore,
  updateEstablishmentLocationCore,
} from "../controllers/core11-establishment.controller.js";

const router = Router();

router.post(
  "/:id/suspend",
  requireAuth,
  requireAdmin,
  suspendEstablishmentCore
);

router.post(
  "/:id/reactivate",
  requireAuth,
  requireAdmin,
  reactivateEstablishmentCore
);

router.patch(
  "/:id/location",
  requireAuth,
  updateEstablishmentLocationCore
);

export default router;
