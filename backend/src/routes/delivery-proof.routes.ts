import { Router } from "../http/express-compat.js";
import { multipartUpload } from "../http/native-upload.middleware.js";
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

router.post("/:orderId/otp", requireAuth, createOtp);
router.post("/:orderId/otp/verify", requireAuth, verifyOtp);
router.post(
  "/:orderId/photo",
  requireAuth,
  multipartUpload({
    fieldName: "photo",
    destination: "/tmp/uploads/delivery-proof",
    prefix: "delivery-proof",
    maxSize: 4 * 1024 * 1024,
  }),
  uploadPhoto,
);
router.get("/:orderId", requireAuth, proofDetails);

export default router;
