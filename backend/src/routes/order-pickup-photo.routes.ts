import { Router } from "express";
import multer from "multer";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  uploadPickupPhoto,
  pickupPhotoDetails,
} from "../controllers/order-pickup-photo.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error(
          "يسمح فقط بصور JPG أو PNG أو WEBP.",
        ),
      );
    }

    cb(null, true);
  },
});

router.post(
  "/orders/:orderId/pickup-photo",
  requireAuth,
  upload.single("photo"),
  uploadPickupPhoto,
);

router.get(
  "/orders/:orderId/pickup-photo",
  requireAuth,
  pickupPhotoDetails,
);

export default router;
