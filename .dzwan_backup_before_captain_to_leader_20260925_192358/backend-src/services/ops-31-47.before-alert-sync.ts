
import { Types } from "mongoose";
import { OrderModel } from "../models/Order.js";
import OrderTimelineModel from "../models/OrderTimeline.js";
import { OrderStageTimerModel } from "../models/OrderStageTimer.js";
import { StuckOrderAlertModel } from "../models/StuckOrderAlert.js";
import { CaptainEmergencyModel } from "../models/CaptainEmergency.js";
import { SecurityEventModel } from "../models/SecurityEvent.js";
import { UserModel } from "../models/User.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { LocationModel } from "../models/Location.js";
import AppVersionModel from "../models/AppVersion.js";
import { MaintenanceSettingsModel } from "../models/MaintenanceSettings.js";
import { CancellationRecordModel } from "../models/CancellationRecord.js";
import ComplaintModel from "../models/Complaint.js";
import { StaffPermissionModel } from "../models/StaffPermission.js";
import { OperationsSettingsModel } from "../models/OperationsSettings.js";
import { createNotifications } from "./notification.service.js";
import { dispatchOrder } from "./dispatch-manager.service.js";

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
  const existing = await OrderStageTimerModel.findOne({
    orderId: input.orderId,
    stage: input.stage,
    endedAt: null,
  }).sort({ startedAt: -1 });

  if (existing) {
    return existing;
  }

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
  minutes?: number,
) {
  const settings =
    (await OperationsSettingsModel.findOne().lean()) ??
    (await OperationsSettingsModel.create({})).toObject();

  const stuckThresholdMinutes = Math.min(
    1440,
    Math.max(
      1,
      Number(
        minutes ??
          settings.stuckOrderMinutes ??
          10,
      ),
    ),
  );

  const activeThresholdMinutes = Math.min(
    1440,
    Math.max(
      1,
      Number(
        settings.activeOrderMinutes ??
          120,
      ),
    ),
  );

  const now = new Date();

  const stuckCutoff = new Date(
    now.getTime() -
      stuckThresholdMinutes * 60 * 1000,
  );

  const activeCutoff = new Date(
    now.getTime() -
      activeThresholdMinutes * 60 * 1000,
  );

  // -------------------------------------------------------
  // 1) أي طلب عالق ثم أصبح له كابتن:
  // نقفل الـAlert فورًا حتى لا يظل ظاهرًا كطلب عالق.
  // -------------------------------------------------------

  const openAlerts =
    await StuckOrderAlertModel.find({
      status: {
        $in: ["open", "acknowledged"],
      },
    })
      .select("_id orderId")
      .lean();

  if (openAlerts.length > 0) {
    const alertOrderIds =
      openAlerts.map(
        (item) => item.orderId,
      );

    const alertOrders =
      await OrderModel.find({
        _id: {
          $in: alertOrderIds,
        },
      })
        .select("_id captainId status")
        .lean();

    const orderMap = new Map(
      alertOrders.map((order) => [
        order._id.toString(),
        order,
      ]),
    );

    const shouldResolveIds =
      openAlerts
        .filter((alert) => {
          const order =
            orderMap.get(
              alert.orderId.toString(),
            );

          if (!order) {
            return true;
          }

          const isAvailableStatus =
            [
              "pending",
              "confirmed",
              "preparing",
              "ready_for_pickup",
            ].includes(
              String(order.status || ""),
            );

          return (
            Boolean(order.captainId) ||
            !isAvailableStatus
          );
        })
        .map(
          (alert) => alert.orderId,
        );

    if (shouldResolveIds.length > 0) {
      await StuckOrderAlertModel.updateMany(
        {
          orderId: {
            $in: shouldResolveIds,
          },
          status: {
            $in: ["open", "acknowledged"],
          },
        },
        {
          $set: {
            status: "resolved",
            resolvedAt: now,
            resolutionNote:
              "تم إغلاق تنبيه الطلب العالق لأن الطلب لم يعد ضمن الطلبات المتاحة.",
          },
        },
      );
    }
  }

  // -------------------------------------------------------
  // 2) الطلبات النشطة:
  // assigned / heading_to_shop / arrived_at_shop /
  // picked_up / on_the_way
  //
  // الحساب يبدأ من assignedAt وليس updatedAt.
  // -------------------------------------------------------

  const activeOrders =
    await OrderModel.find({
      captainId: {
        $ne: null,
      },
      status: {
        $in: [
          "assigned",
          "heading_to_shop",
          "arrived_at_shop",
          "picked_up",
          "on_the_way",
        ],
      },
      assignedAt: {
        $ne: null,
        $lt: activeCutoff,
      },
    }).select(
      "_id orderNumber status captainId assignedAt",
    );

  let releasedActiveOrders = 0;

  for (const order of activeOrders) {
    const released =
      await OrderModel.findOneAndUpdate(
        {
          _id: order._id,
          captainId: order.captainId,
          status: {
            $in: [
              "assigned",
              "heading_to_shop",
              "arrived_at_shop",
              "picked_up",
              "on_the_way",
            ],
          },
          assignedAt: {
            $ne: null,
            $lt: activeCutoff,
          },
        },
        {
          $set: {
            status: "ready_for_pickup",
            captainId: null,
            assignedAt: null,
            pickedUpAt: null,
            deliveredAt: null,
            updatedAt: now,
          },
        },
        {
          returnDocument: "after",
        },
      );

    if (!released) {
      continue;
    }

    releasedActiveOrders++;

    await StuckOrderAlertModel.updateMany(
      {
        orderId: order._id,
        status: {
          $in: ["open", "acknowledged"],
        },
      },
      {
        $set: {
          status: "resolved",
          resolvedAt: now,
          resolutionNote:
            `تمت إعادة الطلب إلى الطلبات المتاحة بعد تجاوز مدة الطلب النشط (${activeThresholdMinutes} دقيقة).`,
        },
      },
    );

    console.log(
      `AUTO ACTIVE ORDER RELEASE: #${
        order.orderNumber ??
        order._id
      } -> available`,
    );
  }

  // -------------------------------------------------------
  // 3) الطلبات العالقة:
  // العالق يكون من الطلبات المتاحة فقط وبدون كابتن.
  // يظل موجودًا في الطلبات المتاحة.
  // -------------------------------------------------------

  const availableOrders =
    await OrderModel.find({
      captainId: null,
      status: {
        $in: [
          "pending",
          "confirmed",
          "preparing",
          "ready_for_pickup",
        ],
      },
      updatedAt: {
        $lt: stuckCutoff,
      },
    }).select(
      "_id orderNumber status captainId updatedAt establishmentId",
    );

  let created = 0;

  const newAlerts: Array<{
    orderId: string;
    orderNumber?: string;
    status: string;
    reason: string;
  }> = [];

  for (const order of availableOrders) {
    const reason =
      `الطلب #${
        order.orderNumber ??
        order._id.toString()
      } لم يتم إسناده إلى كابتن منذ أكثر من ${stuckThresholdMinutes} دقيقة.`;

    const existing =
      await StuckOrderAlertModel.findOne({
        orderId: order._id,
        status: {
          $in: ["open", "acknowledged"],
        },
      });

    if (existing) {
      continue;
    }

    await StuckOrderAlertModel.create({
      orderId: order._id,
      reason,
    });

    created++;

    newAlerts.push({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      reason,
    });
  }

  // -------------------------------------------------------
  // 4) إرسال إشعار للإدارة عند إنشاء Alert جديد فقط.
  // -------------------------------------------------------

  if (newAlerts.length > 0) {
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
      for (const alert of newAlerts) {
        await createNotifications(
          adminIds,
          {
            type: "admin",
            title: "⚠️ طلب عالق",
            message: alert.reason,
            orderId: alert.orderId,
          },
        );
      }
    }
  }

  return {
    detected: created,
    releasedActiveOrders,
    stuckMinutes: stuckThresholdMinutes,
    activeMinutes: activeThresholdMinutes,
  };
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
  })
    .sort({ buildNumber: -1 })
    .lean();

  if (!latest) {
    return {
      updateRequired: false,
      forceUpdate: false,
      blocked: false,
      minimumSupportedBuild: null,
      latest: null,
    };
  }

  const minimumSupportedBuild =
    Number(latest.minimumSupportedBuild ?? 1);

  const latestBuild =
    Number(latest.buildNumber ?? 0);

  const updateRequired =
    buildNumber < latestBuild;

  const blocked =
    buildNumber < minimumSupportedBuild;

  const forceUpdate =
    Boolean(latest.forceUpdate) || blocked;

  return {
    updateRequired,
    forceUpdate,
    blocked,
    minimumSupportedBuild,
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
  const value = term.trim();

  if (value.length < 2) {
    return {
      orders: [],
      captains: [],
      establishments: [],
      locations: [],
      complaints: [],
      emergencies: [],
    };
  }

  const regex = new RegExp(
    value.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&"),
    "i",
  );

  // البحث عن التاريخ بصيغة YYYY-MM-DD
  let dateFilter:
    | {
        createdAt: {
          $gte: Date;
          $lt: Date;
        };
      }
    | null = null;

  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    const start = new Date(`${value}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    if (!Number.isNaN(start.getTime())) {
      dateFilter = {
        createdAt: {
          $gte: start,
          $lt: end,
        },
      };
    }
  }

  const [captains, establishments, locations, customers, orders, complaints, emergencies] =
    await Promise.all([
      UserModel.find({
        role: "captain",
        $or: [
          { fullName: regex },
          { phone: regex },
          { email: regex },
        ],
      })
        .select("_id fullName phone email status governorateId areaId")
        .limit(30)
        .lean(),

      EstablishmentModel.find({
        $or: [
          { name: regex },
          { phone: regex },
          { email: regex },
        ],
      })
        .select("_id name type phone email status governorateId areaId")
        .limit(30)
        .lean(),

      LocationModel.find({
        $or: [
          { name: regex },
          { "areas.name": regex },
        ],
      })
        .select("_id name isActive captainsEnabled establishmentsEnabled areas")
        .limit(30)
        .lean(),

      UserModel.find({
        $or: [
          { fullName: regex },
          { phone: regex },
          { email: regex },
        ],
      })
        .select("_id fullName phone email role status")
        .limit(30)
        .lean(),

      OrderModel.find(
        dateFilter
          ? dateFilter
          : {
              $or: [
                { orderNumber: regex },
                { customerNote: regex },
                { cancellationReason: regex },
              ],
            },
      )
        .populate("captainId", "fullName phone")
        .populate("establishmentId", "name type phone")
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

  const normalizedLocations = locations.map((location) => ({
    ...location,
    matchedAreas: location.areas?.filter((area) =>
      regex.test(String(area.name ?? "")),
    ) ?? [],
  }));

  return {
    query: value,
    orders,
    captains,
    establishments,
    locations: normalizedLocations,
    customers,
    complaints,
    emergencies,
  };
}

export async function saveCancellation(input: {
  orderId: Types.ObjectId;
  cancelledBy: Types.ObjectId;
  cancelledByRole: string;
  reason: string;
}) {
  return CancellationRecordModel.findOneAndUpdate(
    {
      orderId: input.orderId,
    },
    {
      $setOnInsert: {
        ...input,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
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
