import { Router } from "express";
import {
  createCustomer,
  createCustomerAddress,
  deleteCustomer,
  deleteCustomerAddress,
  getCustomer,
  listCustomerAddresses,
  listCustomers,
  updateCustomer,
  updateCustomerAddress,
} from "../controllers/customer.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  loadUserScope,
  requireManagementRole,
} from "../middleware/scope.middleware.js";

const router = Router();

router.use(
  requireAuth,
  loadUserScope,
  requireManagementRole,
);

router.get("/", listCustomers);
router.post("/", createCustomer);
router.get("/:id", getCustomer);
router.patch("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

router.get(
  "/:customerId/addresses",
  listCustomerAddresses,
);

router.post(
  "/:customerId/addresses",
  createCustomerAddress,
);

router.patch(
  "/addresses/:id",
  updateCustomerAddress,
);

router.delete(
  "/addresses/:id",
  deleteCustomerAddress,
);

export default router;
