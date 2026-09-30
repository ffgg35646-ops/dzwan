import { Router } from "../http/express-compat.js";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";

import CoreOperationsSettingsModel from "../models/CoreOperationsSettings.js";

const router = Router();

router.use(
  requireAuth,
  requireAdmin
);

async function getSettings() {
  let settings =
    await CoreOperationsSettingsModel.findOne();

  if (!settings) {
    settings =
      await CoreOperationsSettingsModel.create(
        {}
      );
  }

  return settings;
}

router.get("/", async (_req, res) => {
  const settings =
    await getSettings();

  return res.json({
    success: true,
    data: settings,
  });
});

router.patch("/", async (req, res) => {
  const settings =
    await getSettings();

  const body = req.body || {};

  if (
    body.pricingMode ===
      "area_to_area" ||
    body.pricingMode ===
      "geofencing"
  ) {
    settings.pricingMode =
      body.pricingMode;
  }

  if (
    Number.isFinite(
      Number(
        body.dispatchTimeoutSeconds
      )
    ) &&
    Number(
      body.dispatchTimeoutSeconds
    ) >= 5
  ) {
    settings.dispatchTimeoutSeconds =
      Number(
        body.dispatchTimeoutSeconds
      );
  }

  if (
    Number.isFinite(
      Number(
        body.maxDispatchAttempts
      )
    ) &&
    Number(
      body.maxDispatchAttempts
    ) >= 1
  ) {
    settings.maxDispatchAttempts =
      Number(
        body.maxDispatchAttempts
      );
  }

  if (
    typeof body.strictShiftEnforcement ===
    "boolean"
  ) {
    settings.strictShiftEnforcement =
      body.strictShiftEnforcement;
  }

  if (
    typeof body.requireEstablishmentApproval ===
    "boolean"
  ) {
    settings.requireEstablishmentApproval =
      body.requireEstablishmentApproval;
  }

  if (
    typeof body.requireEstablishmentLocation ===
    "boolean"
  ) {
    settings.requireEstablishmentLocation =
      body.requireEstablishmentLocation;
  }

  await settings.save();

  return res.json({
    success: true,
    message:
      "تم حفظ إعدادات التشغيل",
    data: settings,
  });
});

export default router;
