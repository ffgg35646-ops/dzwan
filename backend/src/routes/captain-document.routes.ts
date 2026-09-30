import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  createDocument,
  listMyDocuments,
  listCaptainDocuments,
  reviewDocument,
} from "../controllers/captain-document.controller.js";

const router = Router();

router.post("/", requireAuth, createDocument);
router.get("/me", requireAuth, listMyDocuments);
router.get("/captain/:captainId", requireAuth, requireAdmin, listCaptainDocuments);
router.patch("/:id/review", requireAuth, requireAdmin, reviewDocument);

export default router;
