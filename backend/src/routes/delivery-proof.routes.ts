import { Router } from "express";
import multer from "multer";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  createOtp,
  verifyOtp,
  uploadPhoto,
  proofDetails,
} from "../controllers/delivery-proof.controller.js";

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
  "/:orderId/otp",
  requireAuth,
  createOtp,
);

router.post(
  "/:orderId/otp/verify",
  requireAuth,
  verifyOtp,
);

router.post(
  "/:orderId/photo",
  requireAuth,
  upload.single("photo"),
  uploadPhoto,
);

router.get(
  "/:orderId",
  requireAuth,
  proofDetails,
);

export default router;
