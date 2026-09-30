import { Router } from "../http/express-compat.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  createUserComplaint,
  listMyComplaints,
} from "../controllers/user-complaint.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createUserComplaint);
router.get("/my", listMyComplaints);

export default router;
