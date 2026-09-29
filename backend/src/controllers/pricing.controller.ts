import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { z } from "zod";
import { Types } from "mongoose";
import { PricingRuleModel } from "../models/PricingRule.js";
import { createAuditLog } from "../services/audit-log.service.js";

const objectId = z.string().refine(
  (value) => Types.ObjectId.isValid(value),
  "معرف غير صحيح.",
);

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum([
    "default",
    "governorate",
    "area",
    "area_to_area",
    "establishment",
    "establishment_type",
    "zone_to_zone",
    "geofence_to_geofence",
  ]),
  amount: z.number().min(0).max(100000),

  governorateId: objectId.optional().nullable(),
  areaId: objectId.optional().nullable(),

  fromGovernorateId: objectId.optional().nullable(),
  fromAreaId: objectId.optional().nullable(),

  toGovernorateId: objectId.optional().nullable(),
  toAreaId: objectId.optional().nullable(),

  establishmentId: objectId.optional().nullable(),

  establishmentType: z
    .enum(["restaurant", "shop"])
    .optional()
    .nullable(),

  fromGeofenceId: objectId.optional().nullable(),
  toGeofenceId: objectId.optional().nullable(),

  priority: z.number().int().default(0),

  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),

  isActive: z.boolean().default(true),
});

export async function listPricingRules(
  req: AuthenticatedRequest,
  res: Response,
) {
  const rows = await PricingRuleModel.find()
    .sort({ priority: -1, createdAt: -1 })
    .populate("governorateId", "_id name")
    .populate("establishmentId", "_id name type")
    .populate("fromGeofenceId", "_id name")
    .populate("toGeofenceId", "_id name")
    .lean();

  return res.json(rows);
}

export async function createPricingRule(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "بيانات قاعدة التسعير غير صحيحة.",
      errors: parsed.error.flatten(),
    });
  }

  const row = await PricingRuleModel.create(parsed.data);

  await createAuditLog({
    actorId:
      Types.ObjectId.isValid(String(req.user?.sub ?? ""))
        ? new Types.ObjectId(String(req.user?.sub))
        : null,
    actorRole: req.user?.role ?? null,
    action: "pricing.create",
    entityType: "PricingRule",
    entityId: row._id,
    before: null,
    after: row.toObject() as unknown as Record<string, unknown>,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null,
    description: `تم إنشاء قاعدة تسعير ${row.name}.`,
  });

  return res.status(201).json(row);
}

export async function updatePricingRule(
  req: AuthenticatedRequest,
  res: Response,
) {
  const parsed = schema.partial().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "بيانات التعديل غير صحيحة.",
      errors: parsed.error.flatten(),
    });
  }

  const row = await PricingRuleModel.findByIdAndUpdate(
    req.params.id,
    parsed.data,
    { new: true, runValidators: true },
  );

  if (!row) {
    return res.status(404).json({
      message: "قاعدة التسعير غير موجودة.",
    });
  }

  await createAuditLog({
    actorId:
      Types.ObjectId.isValid(String(req.user?.sub ?? ""))
        ? new Types.ObjectId(String(req.user?.sub))
        : null,
    actorRole: req.user?.role ?? null,
    action: "pricing.update",
    entityType: "PricingRule",
    entityId: row._id,
    before: null,
    after: row.toObject() as unknown as Record<string, unknown>,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null,
    description: `تم تعديل قاعدة التسعير ${row.name}.`,
  });

  return res.json(row);
}

export async function deletePricingRule(
  req: AuthenticatedRequest,
  res: Response,
) {
  const row = await PricingRuleModel.findById(
    req.params.id,
  );

  if (!row) {
    return res.status(404).json({
      message: "قاعدة التسعير غير موجودة.",
    });
  }

  await PricingRuleModel.findByIdAndDelete(
    req.params.id,
  );

  await createAuditLog({
    actorId:
      Types.ObjectId.isValid(String(req.user?.sub ?? ""))
        ? new Types.ObjectId(String(req.user?.sub))
        : null,
    actorRole: req.user?.role ?? null,
    action: "pricing.delete",
    entityType: "PricingRule",
    entityId: row._id,
    before: row.toObject() as unknown as Record<string, unknown>,
    after: null,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null,
    description: `تم حذف قاعدة التسعير ${row.name}.`,
  });

  return res.json({
    success: true,
  });
}
