import "dotenv/config";
import mongoose, { Types } from "mongoose";

import { env } from "../src/config/env.js";
import { connectDatabase } from "../src/config/database.js";
import { UserModel } from "../src/models/User.js";
import { OrderModel } from "../src/models/Order.js";
import { DispatchSettingsModel } from "../src/models/DispatchSettings.js";
import { DispatchAssignmentModel } from "../src/models/DispatchAssignment.js";
import { DispatchQueueModel } from "../src/models/DispatchQueue.js";
import { CaptainWorkAreaModel } from "../src/models/CaptainWorkArea.js";
import { CaptainShiftModel } from "../src/models/CaptainShift.js";
import { CaptainLocationModel } from "../src/models/CaptainLocation.js";
import { EstablishmentModel } from "../src/models/Establishment.js";
import {
  dispatchOrder,
  expireAssignments,
  processDispatchQueue,
  acceptAssignment,
} from "../src/services/dispatch-manager.service.js";

function assertOk(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

async function ensureShift(captainId: Types.ObjectId) {
  const day = new Date().getDay();

  await CaptainShiftModel.findOneAndUpdate(
    { captainId, dayOfWeek: day },
    {
      captainId,
      dayOfWeek: day,
      startTime: "00:00",
      endTime: "23:59",
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function ensureWorkArea(
  captainId: Types.ObjectId,
  governorateId: Types.ObjectId,
  areaId: Types.ObjectId,
) {
  await CaptainWorkAreaModel.findOneAndUpdate(
    { captainId, governorateId, areaId },
    {
      captainId,
      governorateId,
      areaId,
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function setLocation(
  captainId: Types.ObjectId,
  latitude: number,
  longitude: number,
) {
  await CaptainLocationModel.findOneAndUpdate(
    { captainId },
    {
      captainId,
      latitude,
      longitude,
      updatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function getTwoCaptains() {
  const captains = await UserModel.find({
    role: "captain",
    status: "active",
    operationalEnabled: true,
  })
    .select("_id fullName phone governorateId areaId")
    .limit(2)
    .lean();

  assertOk(
    captains.length >= 2,
    "نحتاج كابتنين نشطين للاختبار.",
  );

  return captains;
}

async function createOrderForCaptainTests(
  establishmentId: Types.ObjectId,
) {
  const establishment =
    await EstablishmentModel.findById(establishmentId)
      .select("_id governorateId areaId")
      .lean();

  assertOk(establishment, "المنشأة غير موجودة.");

  const order = await OrderModel.create({
    orderNumber:
      "TEST-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 7).toUpperCase(),
    establishmentId,
    deliveryGovernorateId: establishment.governorateId,
    deliveryAreaId: establishment.areaId,
    items: [],
    subtotal: 1000,
    deliveryFee: 100,
    total: 1100,
    customerNote: "SMART DISPATCH TEST",
    status: "ready_for_pickup",
  });

  return order;
}

async function cleanupOrder(orderId: Types.ObjectId) {
  await DispatchAssignmentModel.deleteMany({ orderId });
  await DispatchQueueModel.deleteMany({ orderId });
  await OrderModel.deleteOne({ _id: orderId });
}

async function testBestCaptain(
  establishmentId: Types.ObjectId,
) {
  console.log("\n===== TEST 1: BEST CAPTAIN =====");

  const [a, b] = await getTwoCaptains();

  const establishment =
    await EstablishmentModel.findById(establishmentId)
      .select("latitude longitude governorateId areaId")
      .lean();

  assertOk(establishment, "بيانات المنشأة ناقصة.");

  const sameGov =
    String(a.governorateId) ===
    String(establishment.governorateId);

  const sameArea =
    String(a.areaId) ===
    String(establishment.areaId);

  if (!sameGov || !sameArea) {
    console.log(
      "⚠️ الكابتن الأول ليس في نفس نطاق المنشأة. سيتم تجهيز نطاق الاختبار.",
    );
  }

  for (const c of [a, b]) {
    await UserModel.updateOne(
      { _id: c._id },
      { $set: { isOnline: true } },
    );

    await ensureShift(
      c._id,
    );

    await ensureWorkArea(
      c._id,
      establishment.governorateId,
      establishment.areaId,
    );
  }

  await UserModel.updateOne(
    { _id: a._id },
    {
      $set: {
        governorateId: establishment.governorateId,
        areaId: establishment.areaId,
      },
    },
  );

  await UserModel.updateOne(
    { _id: b._id },
    {
      $set: {
        governorateId: establishment.governorateId,
        areaId: establishment.areaId,
      },
    },
  );

  const baseLat =
    Number(establishment.latitude ?? 30.5085);

  const baseLng =
    Number(establishment.longitude ?? 47.7804);

  await setLocation(
    a._id,
    baseLat,
    baseLng,
  );

  await setLocation(
    b._id,
    baseLat + 0.10,
    baseLng + 0.10,
  );

  const order =
    await createOrderForCaptainTests(
      establishmentId,
    );

  const settings =
    (await DispatchSettingsModel.findOne()) ??
    (await DispatchSettingsModel.create({}));

  settings.autoDispatchEnabled = true;
  settings.queueEnabled = true;
  settings.requireCaptainShift = true;
  settings.onlineOnly = true;
  settings.requireSameArea = true;
  settings.requireSameGovernorate = true;
  settings.maxActiveOrdersPerCaptain = Math.max(
    3,
    Number(settings.maxActiveOrdersPerCaptain ?? 3),
  );
  await settings.save();

  const result = await dispatchOrder(order._id);

  assertOk(result.assigned, "الطلب لم يُسند.");

  console.log(
    "Selected captain:",
    result.captain,
  );

  assertOk(
    String(result.captain?.id) === String(a._id),
    "لم يتم اختيار الكابتن الأقرب.",
  );

  console.log("✅ اختيار الكابتن الأقرب/الأفضل نجح.");

  await cleanupOrder(order._id);
}

async function testTimeoutReassignment(
  establishmentId: Types.ObjectId,
) {
  console.log(
    "\n===== TEST 2: TIMEOUT -> NEXT CAPTAIN =====",
  );

  const [a, b] = await getTwoCaptains();

  const establishment =
    await EstablishmentModel.findById(establishmentId)
      .select("latitude longitude governorateId areaId")
      .lean();

  assertOk(establishment, "المنشأة غير موجودة.");

  for (const c of [a, b]) {
    await UserModel.updateOne(
      { _id: c._id },
      {
        $set: {
          isOnline: true,
          governorateId: establishment.governorateId,
          areaId: establishment.areaId,
        },
      },
    );

    await ensureShift(c._id);
    await ensureWorkArea(
      c._id,
      establishment.governorateId,
      establishment.areaId,
    );
  }

  await setLocation(
    a._id,
    Number(establishment.latitude ?? 30.5085),
    Number(establishment.longitude ?? 47.7804),
  );

  await setLocation(
    b._id,
    Number(establishment.latitude ?? 30.5085) + 0.02,
    Number(establishment.longitude ?? 47.7804) + 0.02,
  );

  const settings =
    (await DispatchSettingsModel.findOne()) ??
    (await DispatchSettingsModel.create({}));

  settings.autoDispatchEnabled = true;
  settings.queueEnabled = true;
  settings.assignmentTimeoutSeconds = 10;
  settings.maxAssignmentAttempts = 5;
  settings.onlineOnly = true;
  settings.requireCaptainShift = true;
  settings.requireSameArea = true;
  settings.requireSameGovernorate = true;
  await settings.save();

  const order =
    await createOrderForCaptainTests(
      establishmentId,
    );

  const first =
    await dispatchOrder(order._id);

  assertOk(first.assigned, "لم يتم الإسناد الأول.");

  const firstCaptain =
    first.captain?.id;

  console.log(
    "First captain:",
    first.captain,
  );

  await new Promise((resolve) =>
    setTimeout(resolve, 11000),
  );

  // نجعل إسناد الاختبار منتهيًا بشكل صريح ثم نشغّل
  // نفس دالة انتهاء الإسنادات المستخدمة في النظام.
  await DispatchAssignmentModel.updateOne(
    {
      orderId: order._id,
      captainId: firstCaptain,
      status: "pending",
    },
    {
      $set: {
        expiresAt: new Date(Date.now() - 1000),
      },
    },
  );

  console.log("▶ EXPIRE ASSIGNMENT");

  await expireAssignments();

  console.log("✅ EXPIRE FINISHED");

  const refreshed =
    await OrderModel.findById(order._id)
      .select("captainId status")
      .lean();

  assertOk(
    !refreshed?.captainId,
    "الكابتن الأول ما زال مرتبطًا بالطلب بعد انتهاء المهلة.",
  );

  console.log("▶ REASSIGN SAME ORDER");

  const reassigned =
    await dispatchOrder(order._id);

  console.log(
    "Reassignment result:",
    reassigned,
  );

  assertOk(
    reassigned.assigned,
    "لم يتم إعادة إسناد الطلب بعد انتهاء المهلة.",
  );

  console.log("✅ REASSIGN FINISHED");

  const second =
    await DispatchAssignmentModel.findOne({
      orderId: order._id,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

  assertOk(
    second,
    "لم ينتقل الطلب إلى إسناد جديد.",
  );

  console.log(
    "Second captain:",
    second?.captainId,
  );

  assertOk(
    String(second?.captainId) !==
      String(firstCaptain),
    "تم إعادة الإسناد لنفس الكابتن.",
  );

  console.log(
    "✅ انتقال الطلب للكابتن التالي بعد انتهاء المهلة نجح.",
  );

  await cleanupOrder(order._id);
}

async function testConcurrentAcceptance(
  establishmentId: Types.ObjectId,
) {
  console.log(
    "\n===== TEST 3: TWO CAPTAINS ACCEPT SAME ORDER =====",
  );

  const [a, b] = await getTwoCaptains();

  const establishment =
    await EstablishmentModel.findById(establishmentId)
      .select("governorateId areaId latitude longitude")
      .lean();

  assertOk(establishment, "المنشأة غير موجودة.");

  for (const c of [a, b]) {
    await UserModel.updateOne(
      { _id: c._id },
      {
        $set: {
          isOnline: true,
          governorateId: establishment.governorateId,
          areaId: establishment.areaId,
        },
      },
    );

    await ensureShift(c._id);

    await ensureWorkArea(
      c._id,
      establishment.governorateId,
      establishment.areaId,
    );
  }

  const order =
    await createOrderForCaptainTests(
      establishmentId,
    );

  await DispatchQueueModel.findOneAndUpdate(
    { orderId: order._id },
    {
      orderId: order._id,
      priority: 0,
      status: "waiting",
      attempts: 0,
    },
    { upsert: true, new: true },
  );

  await order.updateOne({
    $set: {
      status: "assigned",
      captainId: null,
    },
  });

  const first =
    await DispatchAssignmentModel.create({
      orderId: order._id,
      captainId: a._id,
      status: "pending",
      expiresAt: new Date(Date.now() + 60000),
    });

  const second =
    await DispatchAssignmentModel.create({
      orderId: order._id,
      captainId: b._id,
      status: "pending",
      expiresAt: new Date(Date.now() + 60000),
    });

  const results =
    await Promise.allSettled([
      acceptAssignment(order._id, a._id),
      acceptAssignment(order._id, b._id),
    ]);

  const fulfilled =
    results.filter(
      (x) => x.status === "fulfilled",
    );

  const rejected =
    results.filter(
      (x) => x.status === "rejected",
    );

  console.log({
    fulfilled: fulfilled.length,
    rejected: rejected.length,
  });

  assertOk(
    fulfilled.length === 1 &&
      rejected.length === 1,
    "لم ينجح قفل القبول الذري: يجب أن ينجح كابتن واحد فقط.",
  );

  const finalOrder =
    await OrderModel.findById(order._id)
      .select("captainId status")
      .lean();

  assertOk(
    finalOrder?.captainId,
    "الطلب لم يُربط بكابتن بعد القبول المتزامن.",
  );

  console.log(
    "Winner:",
    finalOrder?.captainId,
  );

  const assignments =
    await DispatchAssignmentModel.find({
      orderId: order._id,
    })
      .select("captainId status")
      .lean();

  console.log(
    "Assignments:",
    assignments,
  );

  console.log(
    "✅ منع كابتنين من قبول نفس الطلب نجح.",
  );

  await cleanupOrder(order._id);
}

async function main() {
  console.log("========================================");
  console.log(" DZWAN SMART DISPATCH TEST");
  console.log("========================================");

  await connectDatabase();

  const establishment =
    await EstablishmentModel.findOne({
      status: "active",
    })
      .sort({ createdAt: -1 })
      .select("_id latitude longitude governorateId areaId")
      .lean();

  assertOk(
    establishment,
    "لا توجد منشأة active للاختبار.",
  );

  console.log("▶ START TEST 1");
  await testBestCaptain(
    establishment._id,
  );
  console.log("✅ TEST 1 FINISHED");

  console.log("▶ START TEST 2");
  await testTimeoutReassignment(
    establishment._id,
  );
  console.log("✅ TEST 2 FINISHED");

  console.log("▶ START TEST 3");
  await testConcurrentAcceptance(
    establishment._id,
  );
  console.log("✅ TEST 3 FINISHED");

  console.log("\n========================================");
  console.log("✅ SMART DISPATCH TEST COMPLETED");
  console.log("========================================");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("\n❌ SMART DISPATCH TEST FAILED");
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
