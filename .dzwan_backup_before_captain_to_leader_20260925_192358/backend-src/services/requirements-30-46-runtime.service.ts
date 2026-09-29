import { CancellationRecordModel } from "../models/CancellationRecord.js";
import mongoose from "mongoose";
import { OrderModel as Order } from "../models/Order.js";
import { UserModel as User } from "../models/User.js";
import EmergencyAlert from "../models/EmergencyAlert.js";
import SystemSecurityLog from "../models/SystemSecurityLog.js";
import AppVersion from "../models/AppVersion.js";
import CentralOperationSetting from "../models/CentralOperationSetting.js";
import Geofence from "../models/Geofence.js";
import ComplaintModel from "../models/Complaint.js";
import { OrderStageTimerModel } from "../models/OrderStageTimer.js";
import OrderTimelineModel from "../models/OrderTimeline.js";
import { recordOrderStageEvent, getOrderTimeline30_46, getStageDurations30_46 } from "./order-timeline-30-46.service.js";
import { DispatchAssignmentModel } from "../models/DispatchAssignment.js";
import { DispatchSettingsModel } from "../models/DispatchSettings.js";

const ACTIVE = ["pending","confirmed","preparing","ready_for_pickup","assigned","picked_up","on_the_way"];

export async function trackOrderEvent(args: Parameters<typeof recordOrderStageEvent>[0]) {
  return recordOrderStageEvent(args);
}

export async function timeline(orderId: string) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    const error = new Error("معرّف الطلب غير صالح.");
    (error as any).statusCode = 400;
    throw error;
  }

  const [timelineRows, timerRows] = await Promise.all([
    OrderTimelineModel.find({
      orderId: new mongoose.Types.ObjectId(orderId),
    })
      .sort({ createdAt: 1 })
      .lean(),

    OrderStageTimerModel.find({
      orderId: new mongoose.Types.ObjectId(orderId),
    })
      .sort({ startedAt: 1 })
      .lean(),
  ]);

  const typeMap: Record<string, string> = {
    order_created: "created",
    captain_assigned: "captain_sent",
    captain_reassigned: "reassigned",

    status_assigned: "captain_accepted",
    status_heading_to_shop: "heading_to_shop",
    status_arrived_at_shop: "arrived_shop",
    status_picked_up: "picked_up",
    status_on_the_way: "on_the_way",
    status_delivered: "delivered",
    status_completed: "delivered",
    status_cancelled: "cancelled",
    status_rejected: "cancelled",
  };

  const titleMap: Record<string, string> = {
    order_created: "إنشاء الطلب",
    captain_assigned: "إرسال الطلب للكابتن",
    captain_reassigned: "إعادة إسناد الطلب لكابتن آخر",
    status_assigned: "الكابتن قبل الطلب",
    status_heading_to_shop: "الكابتن في طريقه للمحل",
    status_arrived_at_shop: "وصل الكابتن للمحل",
    status_picked_up: "استلم الكابتن الطلب",
    status_on_the_way: "الطلب في طريقه للعميل",
    status_delivered: "تم التسليم",
    status_completed: "تم إغلاق الطلب",
    status_cancelled: "تم إلغاء الطلب",
    status_rejected: "تم رفض الطلب",
  };

  const events = timelineRows.map((row: any) => ({
    _id: row._id,
    type: typeMap[row.event] ?? row.event,
    event: row.event,
    status: row.status ?? null,
    actorId: row.actorId ?? null,
    captainId: row.captainId ?? null,
    message:
      row.note ??
      titleMap[row.event] ??
      row.event,
    title:
      titleMap[row.event] ??
      row.event,
    description: row.note ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt,
  }));

  const latestByStage: Record<string, any> = {};

  for (const timer of timerRows) {
    latestByStage[timer.stage] = timer;
  }

  const now = Date.now();

  function durationMs(stage: string) {
    const timer = latestByStage[stage];

    if (!timer) return null;

    if (
      typeof timer.durationSeconds === "number" &&
      Number.isFinite(timer.durationSeconds)
    ) {
      return Math.max(0, timer.durationSeconds * 1000);
    }

    const startedAt = new Date(timer.startedAt).getTime();

    if (!Number.isFinite(startedAt)) {
      return null;
    }

    const endedAt = timer.endedAt
      ? new Date(timer.endedAt).getTime()
      : now;

    if (!Number.isFinite(endedAt)) {
      return null;
    }

    return Math.max(0, endedAt - startedAt);
  }

  return {
    events,
    durations: {
      captain_wait_ms:
        durationMs("captain_wait"),

      captain_to_shop_ms:
        durationMs("captain_to_shop"),

      shop_wait_ms:
        durationMs("shop_wait"),

      delivery_ms:
        durationMs("delivery"),

      total_ms:
        durationMs("total"),
    },
  };
}

export async function reassignOrder(orderId: string, newCaptainId: string, actorId: string, reason?: string) {
  const order: any = await Order.findById(orderId);
  if (!order) throw new Error("الطلب غير موجود");

  const oldCaptainId = order.captainId?.toString() || null;
  const captain: any = await User.findById(newCaptainId);
  if (!captain) throw new Error("الكابتن الجديد غير موجود");

  order.captainId = new mongoose.Types.ObjectId(newCaptainId);
  if (order.status === "pending" || order.status === "confirmed") {
    order.status = "assigned";
  }
  await order.save();

  // إلغاء أي إسناد معلّق قديم لنفس الطلب
  await DispatchAssignmentModel.updateMany(
    {
      orderId: order._id,
      status: "pending",
    },
    {
      $set: {
        status: "reassigned",
        reassignedAt: new Date(),
        reason: reason || "تم إعادة إسناد الطلب لكابتن آخر",
      },
    },
  );

  // إنشاء إسناد معلّق جديد للكابتن الجديد
  const settings: any =
    await DispatchSettingsModel.findOne().lean();

  const timeoutSeconds =
    Number(settings?.assignmentTimeoutSeconds) || 60;

  const expiresAt = new Date(
    Date.now() + timeoutSeconds * 1000,
  );

  await DispatchAssignmentModel.create({
    orderId: order._id,
    captainId: new mongoose.Types.ObjectId(newCaptainId),
    status: "pending",
    assignedAt: new Date(),
    expiresAt,
    reason: reason || "تم إعادة إسناد الطلب",
  });

  await recordOrderStageEvent({
    orderId,
    type: "reassigned",
    status: order.status,
    actorId,
    actorRole: "admin",
    captainId: newCaptainId,
    message: reason || "تم إعادة تعيين الطلب",
    metadata: { oldCaptainId, newCaptainId }
  });

  return order;
}

export async function createEmergency(args: {
  captainId: string;
  orderId?: string;
  message: string;
  severity?: "normal" | "high" | "critical";
}) {
  const alert = await EmergencyAlert.create({
    captainId: new mongoose.Types.ObjectId(args.captainId),
    orderId: args.orderId ? new mongoose.Types.ObjectId(args.orderId) : undefined,
    message: args.message,
    severity: args.severity || "high"
  });

  if (args.orderId) {
    await recordOrderStageEvent({
      orderId: args.orderId,
      type: "emergency",
      captainId: args.captainId,
      message: args.message,
      metadata: { severity: args.severity || "high" }
    });
  }

  return alert;
}

export async function setEmergencyStatus(id: string, status: "open" | "acknowledged" | "resolved") {
  return EmergencyAlert.findByIdAndUpdate(id, { status }, { new: true });
}

export async function securityLog(args: {
  userId?: string;
  action: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}) {
  return SystemSecurityLog.create({
    userId: args.userId ? new mongoose.Types.ObjectId(args.userId) : undefined,
    action: args.action,
    success: args.success,
    ip: args.ip,
    userAgent: args.userAgent,
    details: args.details || {}
  });
}

export async function versionCheck(app: "captain" | "establishment", clientVersion?: string) {
  const cfg: any = await AppVersion.findOne({ app }).lean();
  if (!cfg) return { allowed: true, forceUpdate: false };

  const compare = (a: string, b: string) => {
    const aa = a.split(".").map(Number), bb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      if ((aa[i] || 0) !== (bb[i] || 0)) return (aa[i] || 0) > (bb[i] || 0) ? 1 : -1;
    }
    return 0;
  };

  const tooOld = clientVersion ? compare(clientVersion, cfg.minSupportedVersion) < 0 : false;

  return {
    allowed: !tooOld && !cfg.maintenance,
    forceUpdate: Boolean(cfg.forceUpdate || tooOld),
    latestVersion: cfg.latestVersion,
    minSupportedVersion: cfg.minSupportedVersion,
    updateUrl: cfg.updateUrl,
    notes: cfg.notes
  };
}

export async function setCentralSetting(args: {
  key: string;
  value: unknown;
  category: string;
  updatedBy?: string;
  description?: string;
}) {
  return CentralOperationSetting.findOneAndUpdate(
    { key: args.key },
    {
      value: args.value,
      category: args.category,
      description: args.description,
      updatedBy: args.updatedBy ? new mongoose.Types.ObjectId(args.updatedBy) : undefined
    },
    { upsert: true, new: true }
  );
}

export async function getCentralSettings(category?: string) {
  return CentralOperationSetting.find(category ? ({ category } as any) : {}).sort({ key: 1 }).lean();
}

export async function getSetting(key: string, fallback: any = null) {
  const row: any = await CentralOperationSetting.findOne({ key }).lean();
  return row ? row.value : fallback;
}

export async function maintenanceCheck() {
  const enabled = await getSetting("maintenance.enabled", false);
  const message = await getSetting("maintenance.message", "النظام في وضع الصيانة");
  return { enabled: Boolean(enabled), message };
}

function pointInPolygon(lat: number, lng: number, polygon: {lat:number;lng:number}[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function resolveGeofence(lat: number, lng: number) {
  const fences: any[] = await Geofence.find({ enabled: true }).lean();
  for (const fence of fences) {
    if (pointInPolygon(lat, lng, fence.polygon || [])) {
      return fence;
    }
  }
  return null;
}

export async function createComplaint(args: {
  createdBy: string;
  orderId?: string;
  captainId?: string;
  establishmentId?: string;
  category: any;
  priority?: any;
  title: string;
  description: string;
}) {
  const complaint: any = await ComplaintModel.create({
    createdBy: new mongoose.Types.ObjectId(args.createdBy),
    orderId: args.orderId ? new mongoose.Types.ObjectId(args.orderId) : undefined,
    captainId: args.captainId ? new mongoose.Types.ObjectId(args.captainId) : undefined,
    establishmentId: args.establishmentId ? new mongoose.Types.ObjectId(args.establishmentId) : undefined,
    category: args.category,
    priority: args.priority || "normal",
    title: args.title,
    description: args.description
  });

  if (args.orderId) {
    await recordOrderStageEvent({
      orderId: args.orderId,
      type: "note",
      actorId: args.createdBy,
      message: `تم فتح شكوى: ${args.title}`,
      metadata: { complaintId: complaint._id.toString() }
    });
  }

  return complaint;
}

export async function cancelOrder30_46(args: {
  orderId: string;
  actorId: string;
  actorRole: string;
  reason: string;
}) {
  const order: any = await Order.findById(args.orderId);
  if (!order) throw new Error("الطلب غير موجود");
  if (["delivered","cancelled","rejected"].includes(order.status)) {
    throw new Error("لا يمكن إلغاء طلب مغلق");
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancellationReason = args.reason;
  await order.save();

  await CancellationRecordModel.findOneAndUpdate(
    {
      orderId: order._id,
    },
    {
      $setOnInsert: {
        orderId: order._id,
        cancelledBy: new mongoose.Types.ObjectId(
          args.actorId,
        ),
        cancelledByRole: args.actorRole,
        reason: args.reason,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  await recordOrderStageEvent({
    orderId: args.orderId,
    type: "cancelled",
    status: "cancelled",
    actorId: args.actorId,
    actorRole: args.actorRole,
    captainId: order.captainId?.toString(),
    message: args.reason
  });

  return order;
}

export async function getStuckOrders(minutes: number = 10) {
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const orders: any[] = await Order.find({
    status: { $in: ACTIVE } as any,
    updatedAt: { $lte: cutoff }
  }).lean();

  return orders;
}
