import { Router } from "../http/express-compat.js";
import { multipartUpload } from "../http/native-upload.middleware.js";
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

router.post(
  "/",
  multipartUpload({
    fieldName: "idFront",
    destination: "/tmp/uploads/registration",
    prefix: "registration",
    maxSize: 4 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFiles: 4,
    multiple: true,
  }),
  (req, res, next) => {
    const files = req.files as {
      [field: string]: any[] | undefined;
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
          "/uploads/registration/" + file.filename;
      }
    }

    next();
  },
  registerCaptain,
);

router.post("/verify-email", verifyCaptainRegistration);
router.get("/", requireAuth, requireAdmin, listCaptainRegistrations);
router.post("/:id/approve", requireAuth, requireAdmin, approveCaptainRegistration);
router.post("/:id/reject", requireAuth, requireAdmin, rejectCaptainRegistration);

export default router;
