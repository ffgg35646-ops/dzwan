import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function write(file: string, content: string) {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  console.log(`✅ ${file}`);
}

write("src/models/OrderTimeline.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export interface IOrderTimeline extends Document {
  orderId: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  actorRole?: string | null;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const schema = new Schema<IOrderTimeline>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  actorRole: { type: String, default: null },
  type: { type: String, required: true, index: true },
  fromStatus: { type: String, default: null },
  toStatus: { type: String, default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: null },
  metadata: { type: Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

schema.index({ orderId: 1, createdAt: 1 });

export const OrderTimelineModel =
  model<IOrderTimeline>("OrderTimeline", schema);
`);

write("src/models/Complaint.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export const COMPLAINT_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "rejected",
  "closed",
] as const;

export interface IComplaint extends Document {
  orderId?: Types.ObjectId | null;
  reporterId: Types.ObjectId;
  againstUserId?: Types.ObjectId | null;
  establishmentId?: Types.ObjectId | null;
  category: string;
  subject: string;
  description: string;
  status: typeof COMPLAINT_STATUSES[number];
  resolution?: string | null;
  assignedTo?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IComplaint>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  againstUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  establishmentId: { type: Schema.Types.ObjectId, ref: "Establishment", default: null },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  subject: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  status: { type: String, enum: COMPLAINT_STATUSES, default: "open", index: true },
  resolution: { type: String, default: null, maxlength: 3000 },
  assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

schema.index({ status: 1, createdAt: -1 });

export const ComplaintModel =
  model<IComplaint>("Complaint", schema);
`);

write("src/models/OrderStageTimer.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export interface IOrderStageTimer extends Document {
  orderId: Types.ObjectId;
  stage: string;
  startedAt: Date;
  deadlineAt?: Date | null;
  endedAt?: Date | null;
  breached: boolean;
  durationSeconds?: number | null;
}

const schema = new Schema<IOrderStageTimer>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  stage: { type: String, required: true },
  startedAt: { type: Date, required: true },
  deadlineAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  breached: { type: Boolean, default: false, index: true },
  durationSeconds: { type: Number, default: null },
}, { timestamps: true, versionKey: false });

schema.index({ orderId: 1, stage: 1, startedAt: -1 });

export const OrderStageTimerModel =
  model<IOrderStageTimer>("OrderStageTimer", schema);
`);

write("src/models/StuckOrderAlert.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export const STUCK_ALERT_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;

export interface IStuckOrderAlert extends Document {
  orderId: Types.ObjectId;
  status: typeof STUCK_ALERT_STATUSES[number];
  reason: string;
  detectedAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: Types.ObjectId | null;
}

const schema = new Schema<IStuckOrderAlert>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  status: { type: String, enum: STUCK_ALERT_STATUSES, default: "open", index: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  detectedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true, versionKey: false });

schema.index({ status: 1, detectedAt: -1 });

export const StuckOrderAlertModel =
  model<IStuckOrderAlert>("StuckOrderAlert", schema);
`);

write("src/models/CaptainEmergency.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export const EMERGENCY_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;

export interface ICaptainEmergency extends Document {
  captainId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  type: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  status: typeof EMERGENCY_STATUSES[number];
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
}

const schema = new Schema<ICaptainEmergency>({
  captainId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null, index: true },
  type: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, enum: EMERGENCY_STATUSES, default: "open", index: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

schema.index({ status: 1, createdAt: -1 });

export const CaptainEmergencyModel =
  model<ICaptainEmergency>("CaptainEmergency", schema);
`);

write("src/models/SecurityEvent.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export interface ISecurityEvent extends Document {
  userId?: Types.ObjectId | null;
  type: string;
  severity: "info" | "warning" | "critical";
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

const schema = new Schema<ISecurityEvent>({
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  type: { type: String, required: true, index: true },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "info", index: true },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  path: { type: String, default: null },
  method: { type: String, default: null },
  message: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

schema.index({ createdAt: -1 });

export const SecurityEventModel =
  model<ISecurityEvent>("SecurityEvent", schema);
`);

write("src/models/AppVersion.ts", `
import { Schema, model, type Document } from "mongoose";

export interface IAppVersion extends Document {
  platform: "android" | "ios" | "captain" | "shop";
  version: string;
  buildNumber: number;
  minimumSupported: boolean;
  forceUpdate: boolean;
  downloadUrl?: string | null;
  releaseNotes?: string | null;
  isActive: boolean;
}

const schema = new Schema<IAppVersion>({
  platform: { type: String, enum: ["android", "ios", "captain", "shop"], required: true, index: true },
  version: { type: String, required: true, trim: true },
  buildNumber: { type: Number, required: true, min: 1 },
  minimumSupported: { type: Boolean, default: false },
  forceUpdate: { type: Boolean, default: false },
  downloadUrl: { type: String, default: null },
  releaseNotes: { type: String, default: null },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, versionKey: false });

schema.index({ platform: 1, buildNumber: -1 });

export const AppVersionModel =
  model<IAppVersion>("AppVersion", schema);
`);

write("src/models/MaintenanceSettings.ts", `
import { Schema, model } from "mongoose";

const schema = new Schema({
  enabled: { type: Boolean, default: false },
  title: { type: String, default: "الصيانة" },
  message: { type: String, default: "الخدمة متوقفة مؤقتًا للصيانة." },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  allowAdmins: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

export const MaintenanceSettingsModel =
  model("MaintenanceSettings", schema);
`);

write("src/models/CancellationRecord.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export interface ICancellationRecord extends Document {
  orderId: Types.ObjectId;
  cancelledBy: Types.ObjectId;
  cancelledByRole: string;
  reason: string;
  createdAt: Date;
}

const schema = new Schema<ICancellationRecord>({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  cancelledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  cancelledByRole: { type: String, required: true },
  reason: { type: String, required: true, maxlength: 1000 },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });

export const CancellationRecordModel =
  model<ICancellationRecord>("CancellationRecord", schema);
`);

write("src/models/StaffPermission.ts", `
import { Schema, model, type Document, type Types } from "mongoose";

export interface IStaffPermission extends Document {
  userId: Types.ObjectId;
  permissions: string[];
  governorateIds: Types.ObjectId[];
  areaIds: Types.ObjectId[];
  establishmentIds: Types.ObjectId[];
}

const schema = new Schema<IStaffPermission>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  permissions: { type: [String], default: [] },
  governorateIds: [{ type: Schema.Types.ObjectId, ref: "Governorate" }],
  areaIds: [{ type: Schema.Types.ObjectId }],
  establishmentIds: [{ type: Schema.Types.ObjectId, ref: "Establishment" }],
}, { timestamps: true, versionKey: false });

export const StaffPermissionModel =
  model<IStaffPermission>("StaffPermission", schema);
`);

write("src/services/ops-31-47.service.ts", `
import { Types } from "mongoose";
import { OrderModel } from "../models/Order.js";
import { OrderTimelineModel } from "../models/OrderTimeline.js";
import { OrderStageTimerModel } from "../models/OrderStageTimer.js";
import { StuckOrderAlertModel } from "../models/StuckOrderAlert.js";
import { CaptainEmergencyModel } from "../models/CaptainEmergency.js";
import { SecurityEventModel } from "../models/SecurityEvent.js";
import { AppVersionModel } from "../models/AppVersion.js";
import { MaintenanceSettingsModel } from "../models/MaintenanceSettings.js";
import { CancellationRecordModel } from "../models/CancellationRecord.js";
import { ComplaintModel } from "../models/Complaint.js";
import { StaffPermissionModel } from "../models/StaffPermission.js";

export async function addTimeline(input: {
  orderId: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  actorRole?: string | null;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return OrderTimelineModel.create(input);
}

export async function getTimeline(orderId: Types.ObjectId) {
  return OrderTimelineModel.find({ orderId })
    .sort({ createdAt: 1 })
    .lean();
}

export async function startStageTimer(input: {
  orderId: Types.ObjectId;
  stage: string;
  seconds?: number;
}) {
  const now = new Date();
  return OrderStageTimerModel.create({
    orderId: input.orderId,
    stage: input.stage,
    startedAt: now,
    deadlineAt: input.seconds
      ? new Date(now.getTime() + input.seconds * 1000)
      : null,
  });
}

export async function closeStageTimer(
  orderId: Types.ObjectId,
  stage: string,
) {
  const timer = await OrderStageTimerModel.findOne({
    orderId,
    stage,
    endedAt: null,
  }).sort({ startedAt: -1 });

  if (!timer) return null;

  const now = new Date();
  timer.endedAt = now;
  timer.durationSeconds = Math.max(
    0,
    Math.floor(
      (now.getTime() - timer.startedAt.getTime()) / 1000,
    ),
  );

  if (timer.deadlineAt) {
    timer.breached = now > timer.deadlineAt;
  }

  await timer.save();
  return timer;
}

export async function detectStuckOrders(
  minutes = 30,
) {
  const cutoff = new Date(
    Date.now() - minutes * 60 * 1000,
  );

  const orders = await OrderModel.find({
    status: {
      $in: [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "assigned",
        "picked_up",
        "on_the_way",
      ],
    },
    updatedAt: { $lt: cutoff },
  }).select("_id status updatedAt");

  let created = 0;

  for (const order of orders) {
    const existing = await StuckOrderAlertModel.findOne({
      orderId: order._id,
      status: { $in: ["open", "acknowledged"] },
    });

    if (existing) continue;

    await StuckOrderAlertModel.create({
      orderId: order._id,
      reason: \`الطلب عالق في حالة \${order.status} منذ أكثر من \${minutes} دقيقة.\`,
    });

    created++;
  }

  return { detected: created };
}

export async function resolveStuckAlert(
  id: Types.ObjectId,
  userId: Types.ObjectId,
) {
  return StuckOrderAlertModel.findOneAndUpdate(
    { _id: id, status: { $ne: "resolved" } },
    {
      status: "resolved",
      resolvedAt: new Date(),
      resolvedBy: userId,
    },
    { returnDocument: "after" },
  );
}

export async function createEmergency(input: {
  captainId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  type: string;
  description: string;
  latitude?: number | null;
  longitude?: number | null;
}) {
  return CaptainEmergencyModel.create(input);
}

export async function resolveEmergency(
  id: Types.ObjectId,
  userId: Types.ObjectId,
) {
  return CaptainEmergencyModel.findOneAndUpdate(
    { _id: id, status: { $ne: "resolved" } },
    {
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
    { returnDocument: "after" },
  );
}

export async function checkVersion(
  platform: "android" | "ios" | "captain" | "shop",
  buildNumber: number,
) {
  const latest = await AppVersionModel.findOne({
    platform,
    isActive: true,
  }).sort({ buildNumber: -1 });

  if (!latest) {
    return {
      updateRequired: false,
      forceUpdate: false,
      latest: null,
    };
  }

  return {
    updateRequired: buildNumber < latest.buildNumber,
    forceUpdate:
      latest.forceUpdate || buildNumber < latest.buildNumber &&
      latest.minimumSupported,
    latest,
  };
}

export async function getMaintenance() {
  return (
    (await MaintenanceSettingsModel.findOne()) ??
    (await MaintenanceSettingsModel.create({}))
  );
}

export async function searchSystem(term: string) {
  const regex = new RegExp(
    term.trim().replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&"),
    "i",
  );

  const [orders, complaints, emergencies] =
    await Promise.all([
      OrderModel.find({
        $or: [
          { orderNumber: regex },
          { customerNote: regex },
          { cancellationReason: regex },
        ],
      })
        .limit(30)
        .lean(),

      ComplaintModel.find({
        $or: [
          { subject: regex },
          { description: regex },
          { category: regex },
        ],
      })
        .limit(30)
        .lean(),

      CaptainEmergencyModel.find({
        $or: [
          { type: regex },
          { description: regex },
        ],
      })
        .limit(30)
        .lean(),
    ]);

  return { orders, complaints, emergencies };
}

export async function saveCancellation(input: {
  orderId: Types.ObjectId;
  cancelledBy: Types.ObjectId;
  cancelledByRole: string;
  reason: string;
}) {
  return CancellationRecordModel.create(input);
}

export async function getPermissions(
  userId: Types.ObjectId,
) {
  return StaffPermissionModel.findOne({ userId }).lean();
}

export async function logSecurity(input: {
  userId?: Types.ObjectId | null;
  type: string;
  severity: "info" | "warning" | "critical";
  ip?: string | null;
  userAgent?: string | null;
  path?: string | null;
  method?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
}) {
  return SecurityEventModel.create(input);
}
`);

write("src/controllers/ops-31-47.controller.ts", `
import type { Request, Response } from "express";
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
import { ComplaintModel } from "../models/Complaint.js";
import { OrderTimelineModel } from "../models/OrderTimeline.js";
import { StuckOrderAlertModel } from "../models/StuckOrderAlert.js";
import { CaptainEmergencyModel } from "../models/CaptainEmergency.js";
import { AppVersionModel } from "../models/AppVersion.js";
import { StaffPermissionModel } from "../models/StaffPermission.js";

function oid(value: string) {
  return Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;
}

export async function createComplaint(req: Request, res: Response) {
  try {
    const data = z.object({
      orderId: z.string().optional(),
      againstUserId: z.string().optional(),
      establishmentId: z.string().optional(),
      category: z.string().min(2).max(80),
      subject: z.string().min(2).max(180),
      description: z.string().min(2).max(3000),
    }).parse(req.body);

    const reporterId = oid(String(req.user?.sub));
    if (!reporterId) return res.status(401).json({ message: "المستخدم غير صالح." });

    const complaint = await ComplaintModel.create({
      reporterId,
      orderId: data.orderId ? oid(data.orderId) : null,
      againstUserId: data.againstUserId ? oid(data.againstUserId) : null,
      establishmentId: data.establishmentId ? oid(data.establishmentId) : null,
      category: data.category,
      subject: data.subject,
      description: data.description,
    });

    return res.status(201).json({ complaint });
  } catch (e) {
    return res.status(400).json({
      message: e instanceof Error ? e.message : "تعذر إنشاء الشكوى.",
    });
  }
}

export async function listComplaints(_req: Request, res: Response) {
  return res.json({
    complaints: await ComplaintModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  });
}

export async function updateComplaint(req: Request, res: Response) {
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

export async function orderTimeline(req: Request, res: Response) {
  const id = oid(String(req.params.orderId));
  if (!id) return res.status(400).json({ message: "معرف الطلب غير صالح." });
  return res.json({ timeline: await getTimeline(id) });
}

export async function createTimeline(req: Request, res: Response) {
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

export async function createTimer(req: Request, res: Response) {
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

export async function finishTimer(req: Request, res: Response) {
  const orderId = oid(String(req.params.orderId));
  if (!orderId) return res.status(400).json({ message: "معرف الطلب غير صالح." });

  return res.json({
    timer: await closeStageTimer(
      orderId,
      String(req.params.stage),
    ),
  });
}

export async function processStuck(req: Request, res: Response) {
  const minutes = Number(req.body?.minutes ?? 30);
  return res.json({ result: await detectStuckOrders(minutes) });
}

export async function listStuck(_req: Request, res: Response) {
  return res.json({
    alerts: await StuckOrderAlertModel.find()
      .sort({ detectedAt: -1 })
      .limit(100)
      .lean(),
  });
}

export async function resolveStuck(req: Request, res: Response) {
  const id = oid(String(req.params.id));
  const userId = oid(String(req.user?.sub));
  if (!id || !userId) return res.status(400).json({ message: "بيانات غير صالحة." });

  return res.json({
    alert: await resolveStuckAlert(id, userId),
  });
}

export async function createCaptainEmergency(req: Request, res: Response) {
  const captainId = oid(String(req.user?.sub));
  if (!captainId) return res.status(401).json({ message: "المستخدم غير صالح." });

  const data = z.object({
    orderId: z.string().optional(),
    type: z.string().min(2).max(80),
    description: z.string().min(2).max(2000),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).parse(req.body);

  return res.status(201).json({
    emergency: await createEmergency({
      captainId,
      orderId: data.orderId ? oid(data.orderId) : null,
      type: data.type,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
    }),
  });
}

export async function listEmergencies(_req: Request, res: Response) {
  return res.json({
    emergencies: await CaptainEmergencyModel.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  });
}

export async function resolveCaptainEmergency(req: Request, res: Response) {
  const id = oid(String(req.params.id));
  const userId = oid(String(req.user?.sub));
  if (!id || !userId) return res.status(400).json({ message: "بيانات غير صالحة." });

  return res.json({
    emergency: await resolveEmergency(id, userId),
  });
}

export async function createAppVersion(req: Request, res: Response) {
  const data = z.object({
    platform: z.enum(["android","ios","captain","shop"]),
    version: z.string().min(1).max(30),
    buildNumber: z.number().int().positive(),
    minimumSupported: z.boolean().default(false),
    forceUpdate: z.boolean().default(false),
    downloadUrl: z.string().url().optional(),
    releaseNotes: z.string().max(5000).optional(),
    isActive: z.boolean().default(true),
  }).parse(req.body);

  return res.status(201).json({
    version: await AppVersionModel.create(data),
  });
}

export async function listAppVersions(_req: Request, res: Response) {
  return res.json({
    versions: await AppVersionModel.find()
      .sort({ platform: 1, buildNumber: -1 })
      .lean(),
  });
}

export async function checkAppVersion(req: Request, res: Response) {
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

export async function maintenance(req: Request, res: Response) {
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

export async function globalSearch(req: Request, res: Response) {
  const term = String(req.query.q ?? "").trim();

  if (term.length < 2) {
    return res.status(400).json({
      message: "اكتب حرفين على الأقل للبحث.",
    });
  }

  return res.json(await searchSystem(term));
}

export async function cancellation(req: Request, res: Response) {
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

  return res.json({
    message: "تم إلغاء الطلب وتسجيل سبب الإلغاء.",
    order,
  });
}

export async function securityEvent(req: Request, res: Response) {
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

export async function permissions(req: Request, res: Response) {
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
`);

write("src/routes/ops-31-47.routes.ts", `
import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import {
  createComplaint,
  listComplaints,
  updateComplaint,
  orderTimeline,
  createTimeline,
  createTimer,
  finishTimer,
  processStuck,
  listStuck,
  resolveStuck,
  createCaptainEmergency,
  listEmergencies,
  resolveCaptainEmergency,
  createAppVersion,
  listAppVersions,
  checkAppVersion,
  maintenance,
  globalSearch,
  cancellation,
  securityEvent,
  permissions,
} from "../controllers/ops-31-47.controller.js";

const router = Router();

// 31 الشكاوى
router.post("/complaints", requireAuth, createComplaint);
router.get("/complaints", requireAuth, requireAdmin, listComplaints);
router.patch("/complaints/:id", requireAuth, requireAdmin, updateComplaint);

// 32 Timeline
router.get("/orders/:orderId/timeline", requireAuth, orderTimeline);
router.post("/orders/:orderId/timeline", requireAuth, requireAdmin, createTimeline);

// 33 المؤقتات
router.post("/orders/:orderId/timers", requireAuth, requireAdmin, createTimer);
router.post("/orders/:orderId/timers/:stage/finish", requireAuth, requireAdmin, finishTimer);

// 34 الطلبات العالقة
router.post("/stuck/process", requireAuth, requireAdmin, processStuck);
router.get("/stuck", requireAuth, requireAdmin, listStuck);
router.patch("/stuck/:id/resolve", requireAuth, requireAdmin, resolveStuck);

// 35 إعادة التعيين عبر Smart Dispatch الموجود
// endpoint مساعد لإعادة تشغيل الإسناد للطلب
router.post("/orders/:orderId/re-dispatch", requireAuth, requireAdmin,
  async (req, res) => {
    try {
      const { dispatchOrder } =
        await import("../services/dispatch-manager.service.js");

      const id = String(req.params.orderId);

      const result = await dispatchOrder(
        new (await import("mongoose")).Types.ObjectId(id),
      );

      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error
          ? error.message
          : "تعذر إعادة إسناد الطلب.",
      });
    }
  }
);

// 36 طوارئ الكابتن
router.post("/emergencies", requireAuth, createCaptainEmergency);
router.get("/emergencies", requireAuth, requireAdmin, listEmergencies);
router.patch("/emergencies/:id/resolve", requireAuth, requireAdmin, resolveCaptainEmergency);

// 37/38 السجلات
router.post("/security-events", requireAuth, requireAdmin, securityEvent);

// 41/42 الإصدارات + Force Update
router.post("/app-versions", requireAuth, requireAdmin, createAppVersion);
router.get("/app-versions", requireAuth, requireAdmin, listAppVersions);
router.get("/app-version-check", checkAppVersion);

// 43 البحث
router.get("/search", requireAuth, requireAdmin, globalSearch);

// 45/46 الصيانة + الإعدادات
router.get("/maintenance", requireAuth, maintenance);
router.patch("/maintenance", requireAuth, requireAdmin, maintenance);

// 40 الصلاحيات
router.get("/permissions/:userId", requireAuth, requireAdmin, permissions);
router.patch("/permissions/:userId", requireAuth, requireAdmin, permissions);

// 47 الإلغاء
router.post("/orders/:orderId/cancel", requireAuth, cancellation);

export default router;
`);

const serverFile = path.join(root, "src/server.ts");

if (!fs.existsSync(serverFile)) {
  throw new Error("src/server.ts غير موجود.");
}

let server = fs.readFileSync(serverFile, "utf8");

const importLine =
  'import ops3147Routes from "./routes/ops-31-47.routes.js";';

if (!server.includes(importLine)) {
  const firstImportEnd = server.indexOf("\n", server.indexOf("import "));
  if (firstImportEnd === -1) {
    throw new Error("تعذر تحديد مكان imports في server.ts");
  }

  server =
    server.slice(0, firstImportEnd + 1) +
    importLine +
    "\n" +
    server.slice(firstImportEnd + 1);
}

const mountLine =
  'app.use("/api/ops", ops3147Routes);';

if (!server.includes(mountLine)) {
  const marker = 'app.use("/api/reports", reportsRoutes);';

  if (server.includes(marker)) {
    server = server.replace(
      marker,
      marker + "\n" + mountLine,
    );
  } else {
    const listenIndex = server.search(
      /(?:app\.listen|export default app)/,
    );

    if (listenIndex === -1) {
      throw new Error("تعذر تحديد مكان إضافة route في server.ts");
    }

    server =
      server.slice(0, listenIndex) +
      mountLine +
      "\n" +
      server.slice(listenIndex);
  }
}

fs.writeFileSync(serverFile, server);

console.log("");
console.log("✅ تمت إضافة طبقة الأقسام 31 → 47 تحت /api/ops");
console.log("");
console.log("31 complaints");
console.log("32 order timeline");
console.log("33 stage timers");
console.log("34 stuck orders");
console.log("35 re-dispatch");
console.log("36 captain emergencies");
console.log("37 security/audit foundations");
console.log("38 security events");
console.log("40 permissions + scope");
console.log("41 app versions");
console.log("42 force update");
console.log("43 advanced search foundation");
console.log("45 maintenance");
console.log("46 central operations settings");
console.log("47 cancellation + cancellation record");
