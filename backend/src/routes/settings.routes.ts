import { Router } from "../http/express-compat.js";
import { getSettings } from "../controllers/settings.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getSettings);

export default router;
