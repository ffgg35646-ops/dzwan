import { Router } from "express";

import {
  addArea,
  createLocation,
  deleteArea,
  deleteLocation,
  listLocations,
  updateArea,
  updateLocation,
} from "../controllers/location.controller.js";

import {
  requireAdmin,
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listLocations);

router.post("/", createLocation);
router.patch("/:id", updateLocation);
router.delete("/:id", deleteLocation);

router.post("/:id/areas", addArea);
router.patch("/:id/areas/:areaId", updateArea);
router.delete("/:id/areas/:areaId", deleteArea);

export default router;
