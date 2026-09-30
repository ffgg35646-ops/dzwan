import { Router } from "../http/express-compat.js";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

import {
  uploadPickupPhoto,
  pickupPhotoDetails,
} from "../controllers/order-pickup-photo.controller.js";

const router = Router();

const uploadDirectory = path.join(
  "/tmp",
  "uploads",
  "pickup",
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
      `pickup-${Date.now()}-${Math.random()
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
