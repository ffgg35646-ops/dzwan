
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { Types } from "mongoose";
import { z } from "zod";
import {
  addTimeline,
  getTimeline,
  startStageTimer,
  closeStageTimer,
  detectStuckOrders,
  resolveStuckAlert,
  createEmergency,
  resolveEmergency,
  checkVersion,
  getMaintenance,
  searchSystem,
  saveCancellation,
  getPermissions,
  logSecurity,
} from "../services/ops-31-47.service.js";
import ComplaintModel from "../models/Complaint.js";
import OrderTimelineModel from "../models/OrderTimeline.js";
import { StuckOrderAlertModel } from "../models/StuckOrderAlert.js";
import { CaptainEmergencyModel } from "../models/CaptainEmergency.js";
import AppVersionModel from "../models/AppVersion.js";
import { StaffPermissionModel } from "../models/StaffPermission.js";
import { createNotifications } from "../services/notification.service.js";
import { UserModel } from "../models/User.js";
import { OrderModel } from "../models/Order.js";

function oid(value: string) {
  return Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;
}

export async function createComplaint(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const data = z.object({
      orderId: z.string().optional(),
      againstUserId: z.string().optional(),
      captainId: z.string().optional(),
      establishmentId: z.string().optional(),

      category: z.enum([
        "captain_establishment",
        "order",
        "delivery",
        "amount",
        "delivery_proof",
      ]),

      title: z.string().min(2).max(180),
      description: z.string().min(2).max(3000),
      amount: z.number().optional(),
    }).parse(req.body);

    const openedBy = oid(String(req.user?.sub));

    if (!openedBy) {
      return res.status(401).json({
        message: "المستخدم غير صالح.",
      });
    }

    const complaint = await ComplaintModel.create({
      openedBy,

      orderId: data.orderId
        ? oid(data.orderId)
        : null,

      againstUserId: data.againstUserId
        ? oid(data.againstUserId)
        : null,

      captainId: data.captainId
        ? oid(data.captainId)
        : null,

      establishmentId: data.establishmentId
        ? oid(data.establishmentId)
        : null,

      category: data.category,
      title: data.title,
      description: data.description,

      amount:
        typeof data.amount === "number"
          ? data.amount
          : null,
    });

    return res.status(201).json({
      success: true,
      complaint,
    });
  } catch (e) {
    return res.status(400).json({
      message:
        e instanceof Error
          ? e.message
          : "تعذر إنشاء الشكوى.",
    });
  }
}

export async function listComplaints(_req: AuthenticatedRequest, res: Response) {
  const complaints = await ComplaintModel.find()
    .populate(
      "openedBy",
      "_id fullName phone email role status",
    )
    .populate(
      "againstUserId",
      "_id fullName phone email role status",
    )
    .populate(
      "captainId",
      "_id fullName phone email role status",
    )
    .populate(
      "establishmentId",
      "_id name type phone address latitude longitude",
    )
    .populate(
      "assignedTo",
      "_id fullName phone email role status",
    )
    .populate({
      path: "orderId",
      select:
        "_id orderNumber status customerId customerName customerPhone customerNote deliveryAddress deliveryGovernorateId deliveryAreaId subtotal deliveryFee total createdAt",
      populate: {
        path: "customerId",
        select: "_id fullName name phone email",
      },
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return res.json({
    complaints: complaints.map((item: any) => ({
      ...item,
      order: item.orderId || null,
      captain: item.captainId || null,
      establishment: item.establishmentId || null,
      openedBy: item.openedBy || null,
      againstUser: item.againstUserId || null,
      assignedTo: item.assignedTo || null,
    })),
  });
}

export async function updateComplaint(req: AuthenticatedRequest, res: Response) {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "معرف الشكوى غير صالح." });
  }

  const data = z.object({
    status: z.enum(["open","in_review","resolved","rejected","closed"]).optional(),
    resolution: z.string().max(3000).optional(),
    assignedTo: z.string().optional(),
  }).parse(req.body);

  const complaint = await ComplaintModel.findByIdAndUpdate(
    id,
    {
      ...data,
      ...(data.assignedTo ? { assignedTo: oid(data.assignedTo) } : {}),
      ...(data.status === "resolved" || data.status === "closed"
        ? { resolvedAt: new Date() }
        : {}),
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!complaint) {
    return res.status(404).json({ message: "الشكوى غير موجودة." });
  }

  return res.json({ complaint });
}

export async function orderTimeline(req: AuthenticatedRequest, res: Response) {
  const id = oid(String(req.params.orderId));
  if (!id) return res.status(400).json({ message: "معرف الطلب غير صالح." });
  return res.json({ timeline: await getTimeline(id) });
}

export async function createTimeline(req: AuthenticatedRequest, res: Response) {
  const orderId = oid(String(req.params.orderId));
  const actorId = oid(String(req.user?.sub));
  if (!orderId || !actorId) {
    return res.status(400).json({ message: "بيانات الطلب أو المستخدم غير صالحة." });
  }

  const entry = await addTimeline({
    orderId,
    actorId,
    actorRole: req.user?.role,
    ...z.object({
      type: z.string().min(2).max(80),
      title: z.string().min(2).max(180),
      description: z.string().max(2000).optional(),
      fromStatus: z.string().optional(),
      toStatus: z.string().optional(),
    }).parse(req.body),
  });

  return res.status(201).json({ entry });
}

export async function createTimer(req: AuthenticatedRequest, res: Response) {
  const orderId = oid(String(req.params.orderId));
  if (!orderId) return res.status(400).json({ message: "معرف الطلب غير صالح." });

  const data = z.object({
    stage: z.string().min(2).max(80),
    seconds: z.number().int().positive().max(86400).optional(),
  }).parse(req.body);

  return res.status(201).json({
    timer: await startStageTimer({ orderId, ...data }),
  });
}

export async function finishTimer(req: AuthenticatedRequest, res: Response) {
  const orderId = oid(String(req.params.orderId));
  if (!orderId) return res.status(400).json({ message: "معرف الطلب غير صالح." });

  return res.json({
    timer: await closeStageTimer(
      orderId,
      String(req.params.stage),
    ),
  });
}

export async function processStuck(req: AuthenticatedRequest, res: Response) {
  const rawMinutes = req.body?.minutes;
  const minutes =
    rawMinutes === undefined ||
    rawMinutes === null ||
    rawMinutes === ""
      ? undefined
      : Number(rawMinutes);

  return res.json({
    result: await detectStuckOrders(minutes),
  });
}

export async function listStuck(_req: AuthenticatedRequest, res: Response) {
  return res.json({
    alerts: await StuckOrderAlertModel.find()
      .sort({ detectedAt: -1 })
      .limit(100)
      .lean(),
  });
}

export async function resolveStuck(req: AuthenticatedRequest, res: Response) {
  const id = oid(String(req.params.id));
  const userId = oid(String(req.user?.sub));
  if (!id || !userId) return res.status(400).json({ message: "بيانات غير صالحة." });

  return res.json({
    alert: await resolveStuckAlert(id, userId),
  });
}

export async function createCaptainEmergency(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = oid(String(req.user?.sub));

  if (!captainId) {
    return res.status(401).json({
      message: "المستخدم غير صالح.",
    });
  }

  const captain = await UserModel.findOne({
    _id: captainId,
    role: "captain",
    status: "active",
  })
    .select("_id fullName phone role status")
    .lean();

  if (!captain) {
    return res.status(403).json({
      message:
        "زر الطوارئ متاح للكابتن النشط فقط.",
    });
  }

  const data = z.object({
    orderId: z.string().optional(),
    type: z.string().min(2).max(80),
    description: z.string().min(2).max(2000),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).parse(req.body);

  let orderId = null;

  if (data.orderId) {
    orderId = oid(data.orderId);

    if (!orderId) {
      return res.status(400).json({
        message: "معرف الطلب غير صحيح.",
      });
    }

    const order = await OrderModel.findOne({
      _id: orderId,
      captainId,
    })
      .select(
        "_id orderNumber status captainId establishmentId",
      )
      .lean();

    if (!order) {
      return res.status(403).json({
        message:
          "لا يمكنك إرسال طوارئ مرتبطة بطلب ليس مسندًا إليك.",
      });
    }

    if (
      order.status === "delivered" ||
      order.status === "cancelled" ||
      order.status === "rejected"
    ) {
      return res.status(400).json({
        message:
          "لا يمكن إرسال طوارئ لطلب مكتمل أو ملغى.",
      });
    }
  }

  const emergency = await createEmergency({
    captainId,
    orderId,
    type: data.type,
    description: data.description,
    latitude: data.latitude,
    longitude: data.longitude,
  });

  const admins = await UserModel.find({
    role: {
      $in: ["admin", "super_admin"],
    },
    status: "active",
  })
    .select("_id")
    .lean();

  const adminIds = admins.map(
    (admin) => admin._id,
  );

  if (adminIds.length > 0) {
    await createNotifications(
      adminIds,
      {
        type: "admin",
        title: "🚨 تنبيه طوارئ من كابتن",
        message: data.orderId
          ? `الكابتن ${captain.fullName} أرسل تنبيه طوارئ بخصوص الطلب ${data.orderId}. ${data.description}`
          : `الكابتن ${captain.fullName} أرسل تنبيه طوارئ. ${data.description}`,
        orderId,
      },
    );
  }

  return res.status(201).json({
    success: true,
    emergency,
    captain: {
      _id: captain._id,
      fullName: captain.fullName,
      phone: captain.phone,
    },
  });
}

export async function listEmergencies(
  _req: AuthenticatedRequest,
  res: Response,
) {
  const emergencies =
    await CaptainEmergencyModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate(
        "captainId",
        "_id fullName phone status isOnline governorateId areaId",
      )
      .populate(
        "orderId",
        "_id orderNumber status establishmentId captainId createdAt updatedAt",
      )
      .lean();

  return res.json({
    emergencies,
  });
}

export async function resolveCaptainEmergency(req: AuthenticatedRequest, res: Response) {
  const id = oid(String(req.params.id));
  const userId = oid(String(req.user?.sub));
  if (!id || !userId) return res.status(400).json({ message: "بيانات غير صالحة." });

  return res.json({
    emergency: await resolveEmergency(id, userId),
  });
}

export async function createAppVersion(req: AuthenticatedRequest, res: Response) {
  const data = z.object({
    platform: z.enum(["android","ios","captain","shop"]),
    version: z.string().min(1).max(30),
    buildNumber: z.number().int().positive(),
    minimumSupportedBuild: z.number().int().positive(),
    forceUpdate: z.boolean().default(false),
    downloadUrl: z.string().url().optional(),
    releaseNotes: z.string().max(5000).optional(),
    isActive: z.boolean().default(true),
  }).parse(req.body);

  return res.status(201).json({
    version: await AppVersionModel.create(data),
  });
}

export async function listAppVersions(_req: AuthenticatedRequest, res: Response) {
  return res.json({
    versions: await AppVersionModel.find()
      .sort({ platform: 1, buildNumber: -1 })
      .lean(),
  });
}

export async function checkAppVersion(req: AuthenticatedRequest, res: Response) {
  const platform = String(req.query.platform) as
    "android" | "ios" | "captain" | "shop";

  const buildNumber = Number(req.query.buildNumber ?? 0);

  if (
    !["android","ios","captain","shop"].includes(platform) ||
    !Number.isFinite(buildNumber)
  ) {
    return res.status(400).json({ message: "بيانات الإصدار غير صحيحة." });
  }

  return res.json(await checkVersion(platform, buildNumber));
}

export async function maintenance(req: AuthenticatedRequest, res: Response) {
  const settings = await getMaintenance();

  if (req.method === "GET") {
    return res.json({ settings });
  }

  const data = z.object({
    enabled: z.boolean().optional(),
    title: z.string().max(160).optional(),
    message: z.string().max(3000).optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    allowAdmins: z.boolean().optional(),
  }).parse(req.body);

  Object.assign(settings, {
    ...data,
    ...(data.startsAt !== undefined
      ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
      : {}),
    ...(data.endsAt !== undefined
      ? { endsAt: data.endsAt ? new Date(data.endsAt) : null }
      : {}),
  });

  await settings.save();

  return res.json({ settings });
}

export async function globalSearch(req: AuthenticatedRequest, res: Response) {
  const term = String(req.query.q ?? "").trim();

  if (term.length < 2) {
    return res.status(400).json({
      message: "اكتب حرفين على الأقل للبحث.",
    });
  }

  return res.json(await searchSystem(term));
}

export async function cancellation(req: AuthenticatedRequest, res: Response) {
  const orderId = oid(String(req.params.orderId));
  const userId = oid(String(req.user?.sub));

  if (!orderId || !userId) {
    return res.status(400).json({ message: "بيانات الإلغاء غير صالحة." });
  }

  const order = await (
    await import("../models/Order.js")
  ).OrderModel.findById(orderId);

  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود." });
  }

  const data = z.object({
    reason: z.string().min(2).max(1000),
  }).parse(req.body);

  order.status = "cancelled";
  order.cancellationReason = data.reason;
  order.cancelledAt = new Date();

  await order.save();

  try {
    await saveCancellation({
      orderId,
      cancelledBy: userId,
      cancelledByRole: String(req.user?.role ?? "unknown"),
      reason: data.reason,
    });

    await addTimeline({
      orderId,
      actorId: userId,
      actorRole: req.user?.role,
      type: "cancelled",
      fromStatus: null,
      toStatus: "cancelled",
      title: "إلغاء الطلب",
      description: data.reason,
    });
  } catch (logError) {
    console.error(
      "Shop cancellation succeeded but cancellation logging failed:",
      logError,
    );
  }

  return res.json({
    message: "تم إلغاء الطلب بنجاح.",
    order,
  });
}

export async function securityEvent(req: AuthenticatedRequest, res: Response) {
  const userId = oid(String(req.user?.sub));

  const data = z.object({
    type: z.string().min(2).max(100),
    severity: z.enum(["info","warning","critical"]),
    message: z.string().min(2).max(2000),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).parse(req.body);

  const event = await logSecurity({
    userId,
    ...data,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null,
    path: req.path,
    method: req.method,
  });

  return res.status(201).json({ event });
}

export async function permissions(req: AuthenticatedRequest, res: Response) {
  const userId = oid(String(req.params.userId));
  if (!userId) return res.status(400).json({ message: "معرف المستخدم غير صالح." });

  if (req.method === "GET") {
    return res.json({
      permissions: await getPermissions(userId),
    });
  }

  const data = z.object({
    permissions: z.array(z.string()).default([]),
    governorateIds: z.array(z.string()).default([]),
    areaIds: z.array(z.string()).default([]),
    establishmentIds: z.array(z.string()).default([]),
  }).parse(req.body);

  const value = await StaffPermissionModel.findOneAndUpdate(
    { userId },
    {
      userId,
      permissions: data.permissions,
      governorateIds: data.governorateIds.map((x) => oid(x)).filter(Boolean),
      areaIds: data.areaIds.map((x) => oid(x)).filter(Boolean),
      establishmentIds: data.establishmentIds.map((x) => oid(x)).filter(Boolean),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  return res.json({ permissions: value });
}
