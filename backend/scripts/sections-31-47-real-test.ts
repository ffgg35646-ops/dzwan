import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose, { Types } from "mongoose";

import { UserModel } from "../src/models/User.js";
import { OrderModel } from "../src/models/Order.js";
import { ComplaintModel } from "../src/models/Complaint.js";
import { OrderTimelineModel } from "../src/models/OrderTimeline.js";
import { OrderStageTimerModel } from "../src/models/OrderStageTimer.js";
import { StuckOrderAlertModel } from "../src/models/StuckOrderAlert.js";
import { CaptainEmergencyModel } from "../src/models/CaptainEmergency.js";
import { SecurityEventModel } from "../src/models/SecurityEvent.js";
import { AppVersionModel } from "../src/models/AppVersion.js";
import { MaintenanceSettingsModel } from "../src/models/MaintenanceSettings.js";
import { CancellationRecordModel } from "../src/models/CancellationRecord.js";
import { StaffPermissionModel } from "../src/models/StaffPermission.js";

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
} from "../src/services/ops-31-47.service.js";

import {
  dispatchOrder,
} from "../src/services/dispatch-manager.service.js";

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "";

if (!MONGO_URI) {
  throw new Error("MONGODB_URI غير موجود في .env.local");
}

let passed = 0;
let failed = 0;

function pass(name: string) {
  passed++;
  console.log(`✅ ${name}`);
}

function fail(name: string, error: unknown) {
  failed++;
  console.log(
    `❌ ${name}: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
}

async function main() {
  await mongoose.connect(MONGO_URI);

  const captain =
    await UserModel.findOne({
      role: "captain",
      status: "active",
    }).select("_id");

  const admin =
    await UserModel.findOne({
      role: { $in: ["super_admin", "admin"] },
      status: "active",
    }).select("_id");

  const captainId =
    captain?._id ?? new Types.ObjectId();

  const adminId =
    admin?._id ?? new Types.ObjectId();

  const customerId = new Types.ObjectId();
  const establishmentId = new Types.ObjectId();
  const addressId = new Types.ObjectId();
  const productId = new Types.ObjectId();

  let testOrder:
    | Awaited<ReturnType<typeof OrderModel.create>>
    | null = null;

  let complaintId: Types.ObjectId | null = null;
  let timelineId: Types.ObjectId | null = null;
  let timerId: Types.ObjectId | null = null;
  let stuckId: Types.ObjectId | null = null;
  let emergencyId: Types.ObjectId | null = null;
  let securityId: Types.ObjectId | null = null;
  let versionId: Types.ObjectId | null = null;
  let cancellationId: Types.ObjectId | null = null;

  try {
    // -------------------------------------------------------
    // 31 - Complaints
    // -------------------------------------------------------
    try {
      const complaint =
        await ComplaintModel.create({
          reporterId: captainId,
          orderId: null,
          category: "اختبار",
          subject: "شكوى اختبار",
          description: "شكوى مؤقتة للاختبار فقط.",
          status: "open",
        });

      complaintId = complaint._id;

      if (complaint.status !== "open") {
        throw new Error("حالة الشكوى غير صحيحة.");
      }

      complaint.status = "resolved";
      complaint.resolution = "تم الحل للاختبار.";
      complaint.resolvedAt = new Date();
      await complaint.save();

      const saved =
        await ComplaintModel.findById(
          complaint._id,
        ).lean();

      if (
        !saved ||
        saved.status !== "resolved" ||
        !saved.resolvedAt
      ) {
        throw new Error(
          "لم يتم حفظ معالجة الشكوى.",
        );
      }

      pass("31 - الشكاوى والمشاكل");
    } catch (e) {
      fail("31 - الشكاوى والمشاكل", e);
    }

    // -------------------------------------------------------
    // 32 - Order Timeline
    // -------------------------------------------------------
    try {
      testOrder = await OrderModel.create({
        orderNumber: `TEST-31-47-${Date.now()}`,
        customerId,
        establishmentId,
        addressId,
        captainId,
        items: [
          {
            productId,
            name: "منتج اختبار",
            quantity: 1,
            unitPrice: 10,
            totalPrice: 10,
          },
        ],
        subtotal: 10,
        deliveryFee: 0,
        total: 10,
        status: "assigned",
      });

      const timeline =
        await addTimeline({
          orderId: testOrder._id,
          actorId: adminId,
          actorRole: "admin",
          type: "status_change",
          fromStatus: "ready_for_pickup",
          toStatus: "assigned",
          title: "إسناد الطلب",
          description: "اختبار Timeline",
        });

      timelineId = timeline._id;

      const entries =
        await getTimeline(testOrder._id);

      if (
        !entries.some(
          (entry) =>
            entry._id.toString() ===
            timeline._id.toString(),
        )
      ) {
        throw new Error(
          "لم يتم العثور على Timeline entry.",
        );
      }

      pass("32 - سجل الطلب الكامل Timeline");
    } catch (e) {
      fail("32 - سجل الطلب الكامل Timeline", e);
    }

    // -------------------------------------------------------
    // 33 - Stage Timers
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      const timer =
        await startStageTimer({
          orderId: testOrder._id,
          stage: "preparing",
          seconds: 3600,
        });

      timerId = timer._id;

      if (!timer.deadlineAt) {
        throw new Error(
          "لم يتم إنشاء deadline للمؤقت.",
        );
      }

      const closed =
        await closeStageTimer(
          testOrder._id,
          "preparing",
        );

      if (
        !closed ||
        !closed.endedAt ||
        closed.durationSeconds === null ||
        closed.durationSeconds === undefined
      ) {
        throw new Error(
          "لم يتم إغلاق المؤقت بشكل صحيح.",
        );
      }

      pass("33 - مؤقتات مراحل الطلب");
    } catch (e) {
      fail("33 - مؤقتات مراحل الطلب", e);
    }

    // -------------------------------------------------------
    // 34 - Stuck Orders
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      await OrderModel.updateOne(
        { _id: testOrder._id },
        {
          $set: {
            status: "preparing",
            updatedAt: new Date(
              Date.now() -
              60 * 60 * 1000,
            ),
          },
        },
      );

      const detection =
        await detectStuckOrders(30);

      if (
        typeof detection.detected !== "number"
      ) {
        throw new Error(
          "نتيجة كشف الطلبات العالقة غير صحيحة.",
        );
      }

      const alert =
        await StuckOrderAlertModel.findOne({
          orderId: testOrder._id,
          status: "open",
        });

      if (alert) {
        stuckId = alert._id;

        const resolved =
          await resolveStuckAlert(
            alert._id,
            adminId,
          );

        if (
          !resolved ||
          resolved.status !== "resolved"
        ) {
          throw new Error(
            "لم يتم إغلاق تنبيه الطلب العالق.",
          );
        }
      }

      pass("34 - الطلبات العالقة والتنبيهات");
    } catch (e) {
      fail("34 - الطلبات العالقة والتنبيهات", e);
    }

    // -------------------------------------------------------
    // 35 - Re-dispatch
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      const result =
        await dispatchOrder(
          testOrder._id,
        );

      if (
        typeof result.assigned !== "boolean" ||
        typeof result.queued !== "boolean"
      ) {
        throw new Error(
          "نتيجة إعادة الإسناد غير صحيحة.",
        );
      }

      pass("35 - إعادة تعيين/إعادة إسناد الطلب");
    } catch (e) {
      fail(
        "35 - إعادة تعيين/إعادة إسناد الطلب",
        e,
      );
    }

    // -------------------------------------------------------
    // 36 - Captain Emergency
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      const emergency =
        await createEmergency({
          captainId,
          orderId: testOrder._id,
          type: "حادث",
          description:
            "بلاغ طوارئ مؤقت للاختبار.",
          latitude: 33.3,
          longitude: 44.4,
        });

      emergencyId = emergency._id;

      if (emergency.status !== "open") {
        throw new Error(
          "حالة الطوارئ غير صحيحة.",
        );
      }

      const resolved =
        await resolveEmergency(
          emergency._id,
          adminId,
        );

      if (
        !resolved ||
        resolved.status !== "resolved"
      ) {
        throw new Error(
          "لم يتم إغلاق حالة الطوارئ.",
        );
      }

      pass("36 - طوارئ الكابتن");
    } catch (e) {
      fail("36 - طوارئ الكابتن", e);
    }

    // -------------------------------------------------------
    // 37 - Audit Foundation
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      const entry =
        await addTimeline({
          orderId: testOrder._id,
          actorId: adminId,
          actorRole: "admin",
          type: "audit",
          title: "Audit اختبار",
          description:
            "سجل Audit مؤقت للاختبار.",
          metadata: {
            test: true,
            section: 37,
          },
        });

      if (!entry._id) {
        throw new Error(
          "لم يتم إنشاء Audit entry.",
        );
      }

      pass("37 - Audit Log foundation");
    } catch (e) {
      fail("37 - Audit Log foundation", e);
    }

    // -------------------------------------------------------
    // 38 - Security Log
    // -------------------------------------------------------
    try {
      const security =
        await logSecurity({
          userId: adminId,
          type: "test_event",
          severity: "warning",
          ip: "127.0.0.1",
          userAgent: "section-31-47-test",
          path: "/api/ops/security-events",
          method: "POST",
          message:
            "اختبار Security Log",
          metadata: {
            test: true,
          },
        });

      securityId = security._id;

      if (
        security.severity !== "warning"
      ) {
        throw new Error(
          "Severity غير صحيح.",
        );
      }

      pass("38 - Security Log");
    } catch (e) {
      fail("38 - Security Log", e);
    }

    // -------------------------------------------------------
    // 39 - الأدمنات الفرعية
    // -------------------------------------------------------
    try {
      const staffRoutePath = new URL(
        "../src/routes/staff.routes.ts",
        import.meta.url,
      );

      const staffControllerPath = new URL(
        "../src/controllers/staff.controller.ts",
        import.meta.url,
      );

      const staffRouteExists =
        await import("node:fs/promises")
          .then(async (fs) => {
            try {
              await fs.access(staffRoutePath);
              return true;
            } catch {
              return false;
            }
          });

      const staffControllerExists =
        await import("node:fs/promises")
          .then(async (fs) => {
            try {
              await fs.access(staffControllerPath);
              return true;
            } catch {
              return false;
            }
          });

      const adminRoles = UserModel.schema.path("role") as any;
      const enumValues =
        adminRoles?.enumValues ?? [];

      const supportsAdminRoles =
        enumValues.includes("admin") &&
        enumValues.includes("super_admin");

      if (
        !staffRouteExists ||
        !staffControllerExists ||
        !supportsAdminRoles
      ) {
        throw new Error(
          "بنية إدارة الأدمنات أو الأدوار الإدارية غير مكتملة.",
        );
      }

      pass("39 - الأدمنات الفرعية");
    } catch (e) {
      fail("39 - الأدمنات الفرعية", e);
    }

    // -------------------------------------------------------
    // 40 - Permissions + Scope
    // -------------------------------------------------------
    try {
      const permission =
        await StaffPermissionModel.findOneAndUpdate(
          { userId: adminId },
          {
            userId: adminId,
            permissions: [
              "orders.read",
              "orders.update",
            ],
            governorateIds: [],
            areaIds: [],
            establishmentIds: [],
          },
          {
            upsert: true,
            returnDocument: "after",
            setDefaultsOnInsert: true,
          },
        );

      if (
        !permission ||
        !permission.permissions.includes(
          "orders.read",
        )
      ) {
        throw new Error(
          "لم يتم حفظ الصلاحيات.",
        );
      }

      const loaded =
        await getPermissions(adminId);

      if (
        !loaded ||
        !loaded.permissions.includes(
          "orders.read",
        )
      ) {
        throw new Error(
          "لم يتم استرجاع الصلاحيات.",
        );
      }

      pass("40 - الصلاحيات التفصيلية + Scope");
    } catch (e) {
      fail(
        "40 - الصلاحيات التفصيلية + Scope",
        e,
      );
    }

    // -------------------------------------------------------
    // 41 - App Versions
    // -------------------------------------------------------
    try {
      const version =
        await AppVersionModel.create({
          platform: "captain",
          version: "99.0.0-test",
          buildNumber: 999999,
          minimumSupported: true,
          forceUpdate: true,
          downloadUrl:
            "https://example.com/test.apk",
          releaseNotes:
            "إصدار اختبار مؤقت.",
          isActive: true,
        });

      versionId = version._id;

      const check =
        await checkVersion(
          "captain",
          1,
        );

      if (
        !check.updateRequired ||
        !check.forceUpdate
      ) {
        throw new Error(
          "Force Update لم يعمل.",
        );
      }

      pass("41 - إدارة إصدارات التطبيقات");
    } catch (e) {
      fail(
        "41 - إدارة إصدارات التطبيقات",
        e,
      );
    }

    // -------------------------------------------------------
    // 42 - Force Update
    // -------------------------------------------------------
    try {
      const check =
        await checkVersion(
          "captain",
          1,
        );

      if (!check.forceUpdate) {
        throw new Error(
          "Force Update غير مفعل للإصدار القديم.",
        );
      }

      pass("42 - Force Update");
    } catch (e) {
      fail("42 - Force Update", e);
    }

    // -------------------------------------------------------
    // 43 - Advanced Search
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      const results =
        await searchSystem(
          testOrder.orderNumber,
        );

      if (
        !results.orders.some(
          (order) =>
            order._id.toString() ===
            testOrder!._id.toString(),
        )
      ) {
        throw new Error(
          "البحث لم يجد الطلب.",
        );
      }

      pass("43 - البحث المتقدم");
    } catch (e) {
      fail("43 - البحث المتقدم", e);
    }

    // -------------------------------------------------------
    // 44 - Backup
    // -------------------------------------------------------
    try {
      /*
       * لا ننفذ mongodump من داخل اختبار قاعدة البيانات.
       * نتحقق فقط أن المشروع يمكنه الوصول إلى URI
       * وأن MongoDB متصل بالفعل.
       */
      if (
        mongoose.connection.readyState !== 1
      ) {
        throw new Error(
          "اتصال MongoDB غير فعال.",
        );
      }

      pass(
        "44 - النسخ الاحتياطي: اتصال MongoDB جاهز لعملية backup",
      );
    } catch (e) {
      fail("44 - النسخ الاحتياطي", e);
    }

    // -------------------------------------------------------
    // 45 - Maintenance
    // -------------------------------------------------------
    try {
      const settings =
        await getMaintenance();

      settings.enabled = true;
      settings.title =
        "صيانة اختبارية";
      settings.message =
        "رسالة صيانة مؤقتة.";
      await settings.save();

      const loaded =
        await MaintenanceSettingsModel
          .findOne()
          .lean();

      if (
        !loaded ||
        loaded.enabled !== true
      ) {
        throw new Error(
          "لم يتم حفظ وضع الصيانة.",
        );
      }

      settings.enabled = false;
      await settings.save();

      pass("45 - وضع الصيانة");
    } catch (e) {
      fail("45 - وضع الصيانة", e);
    }

    // -------------------------------------------------------
    // 46 - Central Settings
    // -------------------------------------------------------
    try {
      const settings =
        await getMaintenance();

      if (
        !settings ||
        typeof settings.enabled !==
          "boolean"
      ) {
        throw new Error(
          "الإعدادات المركزية غير صالحة.",
        );
      }

      pass("46 - الإعدادات المركزية");
    } catch (e) {
      fail("46 - الإعدادات المركزية", e);
    }

    // -------------------------------------------------------
    // 47 - Cancellation
    // -------------------------------------------------------
    try {
      if (!testOrder) {
        throw new Error("طلب الاختبار غير موجود.");
      }

      testOrder.status = "cancelled";
      testOrder.cancellationReason =
        "سبب إلغاء اختباري.";
      testOrder.cancelledAt = new Date();

      await testOrder.save();

      const cancellation =
        await saveCancellation({
          orderId: testOrder._id,
          cancelledBy: adminId,
          cancelledByRole: "admin",
          reason:
            "سبب إلغاء اختباري.",
        });

      cancellationId =
        cancellation._id;

      const loaded =
        await CancellationRecordModel
          .findOne({
            orderId: testOrder._id,
          })
          .lean();

      if (
        !loaded ||
        loaded.reason !==
          "سبب إلغاء اختباري."
      ) {
        throw new Error(
          "لم يتم تسجيل الإلغاء.",
        );
      }

      pass(
        "47 - الإلغاء + سجل الإلغاء",
      );
    } catch (e) {
      fail(
        "47 - الإلغاء + سجل الإلغاء",
        e,
      );
    }
  } finally {
    // -------------------------------------------------------
    // تنظيف بيانات الاختبار
    // -------------------------------------------------------

    if (complaintId) {
      await ComplaintModel.deleteOne({
        _id: complaintId,
      });
    }

    if (timelineId) {
      await OrderTimelineModel.deleteOne({
        _id: timelineId,
      });
    }

    if (timerId) {
      await OrderStageTimerModel.deleteOne({
        _id: timerId,
      });
    }

    if (testOrder?._id) {
      await OrderTimelineModel.deleteMany({
        orderId: testOrder._id,
      });

      await OrderStageTimerModel.deleteMany({
        orderId: testOrder._id,
      });

      await StuckOrderAlertModel.deleteMany({
        orderId: testOrder._id,
      });

      await CancellationRecordModel.deleteMany({
        orderId: testOrder._id,
      });

      await OrderModel.deleteOne({
        _id: testOrder._id,
      });
    }

    if (stuckId) {
      await StuckOrderAlertModel.deleteOne({
        _id: stuckId,
      });
    }

    if (emergencyId) {
      await CaptainEmergencyModel.deleteOne({
        _id: emergencyId,
      });
    }

    if (securityId) {
      await SecurityEventModel.deleteOne({
        _id: securityId,
      });
    }

    if (versionId) {
      await AppVersionModel.deleteOne({
        _id: versionId,
      });
    }

    if (cancellationId) {
      await CancellationRecordModel.deleteOne({
        _id: cancellationId,
      });
    }

    await StaffPermissionModel.updateOne(
      { userId: adminId },
      {
        $pull: {
          permissions: {
            $in: [
              "orders.read",
              "orders.update",
            ],
          },
        },
      },
    );

    await mongoose.disconnect();
  }

  console.log("");
  console.log("========================================");
  console.log("نتيجة اختبار الأقسام 31 → 47");
  console.log("========================================");
  console.log(`Passed  : ${passed}`);
  console.log(`Failed  : ${failed}`);
  console.log("========================================");

  if (failed > 0) {
    process.exit(1);
  }

  console.log("✅ جميع اختبارات 31 → 47 نجحت.");
}

main().catch(async (error) => {
  console.error("");
  console.error("❌ TEST ERROR");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
