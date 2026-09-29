import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", listProducts);
router.post("/", createProduct);
router.get("/:id", getProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
