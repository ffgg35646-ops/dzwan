import { Request, Response } from "express";
import { z } from "zod";
import GeofenceModel from "../models/Geofence.js";

const schema = z.object({
  name: z.string().trim().min(2).max(160),

  description:
    z.string().trim().max(1000).optional().nullable(),

  governorateId:
    z.string().min(1),

  areaId:
    z.string().optional().nullable(),

  coordinates: z
    .array(
      z.tuple([
        z.number().min(-90).max(90),
        z.number().min(-180).max(180),
      ]),
    )
    .min(3),

  isActive:
    z.boolean().default(true),
});


export async function listGeofences(
  _req: Request,
  res: Response,
) {
  const rows = await GeofenceModel.find()
    .sort({ createdAt: -1 })
    .lean();

  return res.json(
    rows.map((row) => ({
      ...row,
      coordinates: (row.polygon || []).map(
        (point: any) => [point.lat, point.lng],
      ),
      isActive: row.enabled,
    })),
  );
}

export async function createGeofence(
  req: Request,
  res: Response,
) {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "بيانات المنطقة الجغرافية غير صحيحة.",
      errors: parsed.error.flatten(),
    });
  }

  const row = await GeofenceModel.create({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    governorateId: parsed.data.governorateId,
    areaId: parsed.data.areaId ?? undefined,
    enabled: parsed.data.isActive,
    polygon: parsed.data.coordinates.map(
      ([lat, lng]) => ({ lat, lng }),
    ),
  });

  return res.status(201).json({
    ...row.toObject(),
    coordinates: row.polygon.map(
      (point) => [point.lat, point.lng],
    ),
    isActive: row.enabled,
  });
}

export async function updateGeofence(
  req: Request,
  res: Response,
) {
  const parsed = schema.partial().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "بيانات التعديل غير صحيحة.",
      errors: parsed.error.flatten(),
    });
  }

  const update: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) {
    update.name = parsed.data.name;
  }

  if (parsed.data.description !== undefined) {
    update.description = parsed.data.description;
  }

  if (parsed.data.governorateId !== undefined) {
    update.governorateId = parsed.data.governorateId;
  }

  if (parsed.data.areaId !== undefined) {
    update.areaId = parsed.data.areaId ?? undefined;
  }

  if (parsed.data.isActive !== undefined) {
    update.enabled = parsed.data.isActive;
  }

  if (parsed.data.coordinates !== undefined) {
    update.polygon = parsed.data.coordinates.map(
      ([lat, lng]) => ({ lat, lng }),
    );
  }

  const row = await GeofenceModel.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!row) {
    return res.status(404).json({
      message: "المنطقة الجغرافية غير موجودة.",
    });
  }

  return res.json({
    ...row.toObject(),
    coordinates: row.polygon.map(
      (point) => [point.lat, point.lng],
    ),
    isActive: row.enabled,
  });
}

export async function deleteGeofence(
  req: Request,
  res: Response,
) {
  const row = await GeofenceModel.findByIdAndDelete(
    req.params.id,
  );

  if (!row) {
    return res.status(404).json({
      message: "المنطقة الجغرافية غير موجودة.",
    });
  }

  return res.json({
    success: true,
  });
}
