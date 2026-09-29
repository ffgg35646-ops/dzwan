import { Types } from "mongoose";
import { OrderModel } from "../models/Order.js";
import { DispatchQueueModel } from "../models/DispatchQueue.js";
import { DispatchAssignmentModel } from "../models/DispatchAssignment.js";
import { DispatchSettingsModel } from "../models/DispatchSettings.js";
import {
  findBestCaptain,
  captainCanWorkNow,
} from "./dispatch.service.js";
import { canCaptainReceiveOrder } from "./captain-work-eligibility.service.js";
import { createNotification } from "./notification.service.js";

async function getSettings() {
  return (
    (await DispatchSettingsModel.findOne()) ??
    (await DispatchSettingsModel.create({}))
  );
}

export async function enqueueOrder(
  orderId: Types.ObjectId,
  priority = 0,
) {
  const existing =
    await DispatchQueueModel.findOne({
      orderId,
    });

  if (existing) {
    return existing;
  }

  return DispatchQueueModel.create({
    orderId,
    priority,
    status: "waiting",
  });
}

export async function dispatchOrder(
  orderId: Types.ObjectId,
) {
  const settings = await getSettings();

  if (!settings.autoDispatchEnabled) {
    return {
      assigned: false,
      queued: false,
      reason:
        "التوزيع التلقائي متوقف من إعدادات الإدارة.",
    };
  }

  const queue = await enqueueOrder(
    orderId,
  );

  if (
    queue.attempts >=
    settings.maxAssignmentAttempts
  ) {
    queue.status = "waiting";
    queue.lastAttemptAt = new Date();
    await queue.save();

    return {
      assigned: false,
      queued: true,
      reason:
        "تم الوصول إلى الحد الأقصى لمحاولات الإسناد.",
    };
  }

  const previous =
    await DispatchAssignmentModel.find({
      orderId,
      status: {
        $in: [
          "pending",
          "accepted",
          "expired",
          "reassigned",
        ],
      },
    })
      .select("captainId")
      .lean();

  const excluded = previous.map(
    (item: { captainId: import("mongoose").Types.ObjectId }) =>
      item.captainId,
  );

  const result =
    await findBestCaptain({
      orderId,
      excludeCaptainIds: excluded,
    });

  if (!result.captain) {
    if (settings.queueEnabled) {
      queue.status = "waiting";
      queue.lastAttemptAt = new Date();
      queue.attempts += 1;
      await queue.save();

      return {
        assigned: false,
        queued: true,
        reason: result.reason,
      };
    }

    return {
      assigned: false,
      queued: false,
      reason: result.reason,
    };
  }

  const captain =
    result.captain;

  const eligibility =
    await canCaptainReceiveOrder(
      captain.captainId,
    );

  if (!eligibility.allowed) {
    return {
      assigned: false,
      queued: true,
      reason:
        eligibility.reason ||
        "الكابتن غير مؤهل لاستلام الطلب.",
    };
  }

  if (
    !(await captainCanWorkNow(
      captain.captainId,
    ))
  ) {
    return {
      assigned: false,
      queued: true,
      reason:
        "الكابتن خارج الشفت الحالي.",
    };
  }

  const order =
    await OrderModel.findById(orderId);

  if (!order) {
    return {
      assigned: false,
      queued: false,
      reason: "الطلب غير موجود.",
    };
  }

  if (order.captainId) {
    return {
      assigned: false,
      queued: false,
      reason:
        "الطلب تم إسناده بالفعل.",
    };
  }

  order.captainId =
    captain.captainId;

  if (
    order.status ===
    "ready_for_pickup"
  ) {
    order.status = "assigned";
    order.assignedAt = new Date();
  }

  await order.save();

  const expiresAt = new Date(
    Date.now() +
      settings.assignmentTimeoutSeconds *
        1000,
  );

  await DispatchAssignmentModel.create({
    orderId,
    captainId:
      captain.captainId,
    status: "pending",
    expiresAt,
  });

  queue.status = "assigned";
  queue.assignedCaptainId =
    captain.captainId;
  queue.lastAttemptAt = new Date();
  queue.attempts += 1;

  await queue.save();

  await createNotification({
    userId: captain.captainId,
    type: "order",
    title: "طلب جديد",
    message:
      `تم إسناد طلب جديد إليك. لديك ${settings.assignmentTimeoutSeconds} ثانية لقبوله.`,
    orderId: order._id,
  });

  return {
    assigned: true,
    queued: false,
    captain: {
      id: captain.captainId,
      name: captain.fullName,
    },
    expiresAt,
  };
}

export async function acceptAssignment(
  orderId: Types.ObjectId,
  captainId: Types.ObjectId,
) {
  const assignment = await DispatchAssignmentModel.findOne({
    orderId,
    captainId,
    status: "pending",
  });

  if (!assignment) {
    throw new Error("لا يوجد إسناد معلق لهذا الكابتن.");
  }

  if (assignment.expiresAt.getTime() < Date.now()) {
    assignment.status = "expired";
    assignment.reason = "انتهت مهلة قبول الطلب.";
    await assignment.save();
    throw new Error("انتهت مهلة قبول الطلب.");
  }

  const canWork = await captainCanWorkNow(captainId);

  if (!canWork) {
    throw new Error("لا يمكنك قبول الطلب خارج الشفت.");
  }

  // حجز ذري: الطلب لا يمكن أن ينجح معه كابتنان.
  const order = await OrderModel.findOneAndUpdate(
    {
      _id: orderId,
      status: { $in: ["pending", "assigned"] },
      $or: [
        { captainId: captainId },
        { captainId: null },
      ],
    },
    {
      $set: {
        captainId,
        status: "assigned",
        assignedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

  if (!order) {
    throw new Error("تم استلام الطلب بالفعل أو لم يعد متاحًا.");
  }

  assignment.status = "accepted";
  assignment.acceptedAt = new Date();
  await assignment.save();

  // إغلاق أي عرض آخر لنفس الطلب.
  await DispatchAssignmentModel.updateMany(
    {
      orderId,
      _id: { $ne: assignment._id },
      status: "pending",
    },
    {
      $set: {
        status: "expired",
        reason: "تم استلام الطلب بواسطة كابتن آخر.",
      },
    },
  );

  await DispatchQueueModel.updateOne(
    { orderId },
    {
      $set: {
        status: "assigned",
        assignedCaptainId: captainId,
      },
    },
  );

  return {
    assignment,
    order,
  };
}

export async function expireAssignments() {
  const expired =
    await DispatchAssignmentModel.find({
      status: "pending",
      expiresAt: {
        $lte: new Date(),
      },
    });

  for (const assignment of expired) {
    assignment.status = "expired";
    assignment.reason =
      "انتهت مهلة قبول الإسناد.";

    await assignment.save();

    await OrderModel.updateOne(
      {
        _id: assignment.orderId,
        captainId:
          assignment.captainId,
      },
      {
        $set: {
          captainId: null,
        },
      },
    );

    await DispatchQueueModel.updateOne(
      {
        orderId: assignment.orderId,
      },
      {
        $set: {
          status: "waiting",
          assignedCaptainId: null,
        },
      },
    );

    // تتم إعادة المحاولة لاحقًا بواسطة processDispatchQueue().
  }

  return expired.length;
}

export async function processDispatchQueue() {
  const queueItems =
    await DispatchQueueModel.find({
      status: "waiting",
    })
      .sort({
        priority: -1,
        createdAt: 1,
      })
      .limit(50);

  let processed = 0;

  for (const item of queueItems) {
    const result =
      await dispatchOrder(
        item.orderId,
      );

    if (result.assigned) {
      processed += 1;
    }
  }

  return processed;
}
