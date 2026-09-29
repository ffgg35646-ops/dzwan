import { Router } from "express";
import { getReports } from "../controllers/reports.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getReports);

export default router;
