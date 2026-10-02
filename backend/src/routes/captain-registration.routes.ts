import { Router } from "express";
import multer from "multer";

import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

import {
  registerCaptain,
  verifyCaptainRegistration,
  listCaptainRegistrations,
  approveCaptainRegistration,
  rejectCaptainRegistration,
} from "../controllers/captain-registration.controller.js";

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
  "/",
  upload.fields([
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "residenceFront", maxCount: 1 },
    { name: "residenceBack", maxCount: 1 },
  ]),
  (req, res, next) => {
    const files = req.files as {
      [field: string]: Express.Multer.File[] | undefined;
    };

    const fields = [
      ["idFront", "idFrontUrl"],
      ["idBack", "idBackUrl"],
      ["residenceFront", "residenceFrontUrl"],
      ["residenceBack", "residenceBackUrl"],
    ];

    for (const [fileField, urlField] of fields) {
      const file = files?.[fileField]?.[0];

      if (file) {
        req.body[urlField] =
          `/uploads/registration/${file.filename}`;
      }
    }

    next();
  },
  registerCaptain,
);

router.post(
  "/verify-email",
  verifyCaptainRegistration,
);

router.get(
  "/",
  requireAuth,
  requireAdmin,
  listCaptainRegistrations,
);

router.post(
  "/:id/approve",
  requireAuth,
  requireAdmin,
  approveCaptainRegistration,
);

router.post(
  "/:id/reject",
  requireAuth,
  requireAdmin,
  rejectCaptainRegistration,
);

export default router;
