import { Router } from "../http/express-compat.js";
import { multipartUpload } from "../http/native-upload.middleware.js";
import {
  requireAuth,
} from "../middleware/auth.middleware.js";
import {
  uploadPickupPhoto,
  pickupPhotoDetails,
} from "../controllers/order-pickup-photo.controller.js";

const router = Router();

router.post(
  "/orders/:orderId/pickup-photo",
  requireAuth,
  multipartUpload({
    fieldName: "photo",
    destination: "/tmp/uploads/pickup",
    prefix: "pickup",
    maxSize: 4 * 1024 * 1024,
  }),
  uploadPickupPhoto,
);

router.get(
  "/orders/:orderId/pickup-photo",
  requireAuth,
  pickupPhotoDetails,
);

export default router;
