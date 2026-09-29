import type { Request, Response } from "express";
import { AuditLogModel } from "../models/AuditLog.js";

export async function listAuditLogs(
  req: Request,
  res: Response,
) {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 25, 1),
      100,
    );

    const filter: Record<string, unknown> = {};

    if (typeof req.query.action === "string" && req.query.action.trim()) {
      filter.action = req.query.action.trim();
    }

    const entityType =
      typeof req.query.entityType === "string"
        ? req.query.entityType.trim()
        : typeof req.query.resource === "string"
          ? req.query.resource.trim()
          : "";

    if (entityType) {
      filter.entityType = entityType;
    }

    if (typeof req.query.actorRole === "string" && req.query.actorRole.trim()) {
      filter.actorRole = req.query.actorRole.trim();
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter)
        .populate("actorId", "_id fullName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        items: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "تعذر تحميل سجل العمليات حاليًا.",
    });
  }
}

export async function getAuditLog(
  req: Request,
  res: Response,
) {
  try {
    const log = await AuditLogModel.findById(req.params.id)
      .populate("actorId", "_id fullName email role")
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "سجل العملية غير موجود.",
      });
    }

    return res.json({
      success: true,
      data: log,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "المعرف المرسل غير صحيح.",
    });
  }
}
