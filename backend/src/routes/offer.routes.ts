
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  listOffers,
  listAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offer.controller.js";

const router = Router();

router.get("/", listOffers);

router.get(
  "/admin",
  requireAuth,
  listAllOffers,
);

router.post(
  "/",
  requireAuth,
  createOffer,
);

router.patch(
  "/:id",
  requireAuth,
  updateOffer,
);

router.delete(
  "/:id",
  requireAuth,
  deleteOffer,
);

export default router;
