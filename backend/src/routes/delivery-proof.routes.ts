import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

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

const uploadDirectory = path.join(
  "/tmp",
  "uploads",
  "delivery-proof",
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension =
      path.extname(file.originalname).toLowerCase() ||
      ".jpg";

    const safeExtension =
      [".jpg", ".jpeg", ".png", ".webp"].includes(
        extension,
      )
        ? extension
        : ".jpg";

    cb(
      null,
      `delivery-proof-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}${safeExtension}`,
    );
  },
});

const upload = multer({
  storage,

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
