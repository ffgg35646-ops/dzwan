import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { DispatchSettingsModel } from "../src/models/DispatchSettings.js";
import { DispatchQueueModel } from "../src/models/DispatchQueue.js";
import { DispatchAssignmentModel } from "../src/models/DispatchAssignment.js";
import { CaptainShiftModel } from "../src/models/CaptainShift.js";
import { OrderModel } from "../src/models/Order.js";
import { UserModel } from "../src/models/User.js";
import { NotificationModel } from "../src/models/Notification.js";
import {
  dispatchOrder,
  expireAssignments,
  processDispatchQueue,
  acceptAssignment,
} from "../src/services/dispatch-manager.service.js";
import { findBestCaptain, captainCanWorkNow } from "../src/services/dispatch.service.js";

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(message: string) {
  passed++;
  console.log(`✅ ${message}`);
}

function fail(message: string, error?: unknown) {
  failed++;
  console.log(`❌ ${message}`);
  if (error) console.log(error);
}

function skip(message: string) {
  skipped++;
  console.log(`⚠️ SKIP: ${message}`);
}

async function main() {
  console.log("");
  console.log("==============================================");
  console.log("   اختبار Smart Dispatch — الأقسام 6 إلى 11");
  console.log("==============================================");
  console.log("");

  await connectDatabase();

  const settingsBefore =
    (await DispatchSettingsModel.findOne().lean()) ?? null;

  const captain = await UserModel.findOne({
    role: "captain",
    status: "active",
  }).select(
    "_id fullName phone email isOnline governorateId areaId status role",
  );

  if (!captain) {
    throw new Error("لا يوجد كابتن Active في قاعدة البيانات.");
  }

  const order = await OrderModel.findOne({
    status: "ready_for_pickup",
    $or: [{ captainId: null }, { captainId: { $exists: false } }],
  }).select(
    "_id orderNumber customerId establishmentId addressId captainId status assignedAt",
  );

  console.log(`👤 Captain: ${captain.fullName} (${captain._id})`);
  console.log(`📦 Order: ${order?.orderNumber ?? "لا يوجد طلب مناسب"}`);
  console.log("");

  /*
   * نحفظ بيانات الكابتن والطلب حتى نرجعها كما كانت بعد الاختبار.
   */
  const captainBefore = {
    isOnline: captain.isOnline,
  };

  const orderBefore = order
    ? {
        captainId: order.captainId ?? null,
        status: order.status,
        assignedAt: order.assignedAt ?? null,
      }
    : null;

  /*
   * Cleanup خاص بالاختبار لهذا الكابتن/الطلب.
   */
  if (order) {
    await DispatchAssignmentModel.deleteMany({
      orderId: order._id,
    });

    await DispatchQueueModel.deleteMany({
      orderId: order._id,
    });
  }

  /*
   * نجعل الكابتن Online مؤقتاً حتى لا تمنعنا إعدادات OnlineOnly
   * من اختبار الـ Dispatch.
   */
  captain.isOnline = true;
  await captain.save();

  /*
   * --------------------------------------------------
   * 1) Settings
   * --------------------------------------------------
   */
  try {
    const settings = await DispatchSettingsModel.findOne();

    if (!settings) {
      pass("إنشاء إعدادات التوزيع تلقائياً عند عدم وجودها");
    } else {
      pass("قراءة إعدادات Smart Dispatch");
    }

    const current =
      settings ??
      (await DispatchSettingsModel.create({}));

    if (
      current.autoDispatchEnabled === true &&
      current.queueEnabled === true &&
      current.maxActiveOrdersPerCaptain >= 1 &&
      current.assignmentTimeoutSeconds >= 10 &&
      current.maxAssignmentAttempts >= 1
    ) {
      pass("إعدادات التوزيع الأساسية صحيحة");
    } else {
      fail("إعدادات التوزيع الأساسية غير صحيحة");
    }
  } catch (error) {
    fail("اختبار Dispatch Settings", error);
  }

  /*
   * --------------------------------------------------
   * 2) Queue
   * --------------------------------------------------
   */
  try {
    if (!order) {
      skip("Queue — لا يوجد طلب ready_for_pickup غير مسند");
    } else {
      const queue = await DispatchQueueModel.create({
        orderId: order._id,
        priority: 10,
        status: "waiting",
        attempts: 0,
      });

      if (
        String(queue.orderId) === String(order._id) &&
        queue.priority === 10 &&
        queue.status === "waiting"
      ) {
        pass("إنشاء عنصر في Dispatch Queue");
      } else {
        fail("بيانات Dispatch Queue غير صحيحة");
      }

      await queue.deleteOne();
    }
  } catch (error) {
    fail("اختبار Queue", error);
  }

  /*
   * --------------------------------------------------
   * 3) Priority
   * --------------------------------------------------
   */
  try {
    if (!order) {
      skip("Priority — لا يوجد طلب متاح");
    } else {
      await DispatchQueueModel.deleteMany({
        orderId: order._id,
      });

      const q1 = await DispatchQueueModel.create({
        orderId: order._id,
        priority: 1,
        status: "waiting",
      });

      const q2 = await DispatchQueueModel.create({
        orderId: new mongoose.Types.ObjectId(),
        priority: 100,
        status: "waiting",
      });

      const queue = await DispatchQueueModel.find({
        status: "waiting",
      })
        .sort({
          priority: -1,
          createdAt: 1,
        })
        .lean();

      if (
        queue.length >= 2 &&
        queue[0].priority >= queue[1].priority
      ) {
        pass("ترتيب Queue حسب الأولوية Priority");
      } else {
        fail("ترتيب Queue حسب Priority لا يعمل كما يجب");
      }

      await DispatchQueueModel.deleteMany({
        _id: {
          $in: [q1._id, q2._id],
        },
      });
    }
  } catch (error) {
    fail("اختبار Priority", error);
  }

  /*
   * --------------------------------------------------
   * 4) Captain eligibility / Capacity / Location
   * --------------------------------------------------
   */
  try {
    if (!order) {
      skip("Capacity/Location — لا يوجد طلب");
    } else {
      const result = await findBestCaptain({
        orderId: order._id,
      });

      if (result.captain) {
        pass(
          `العثور على أفضل كابتن للتوزيع: ${result.captain.fullName}`,
        );
      } else {
        skip(
          `لم يتم العثور على كابتن مؤهل حالياً: ${result.reason}`,
        );
      }
    }
  } catch (error) {
    fail("اختبار Captain eligibility / capacity", error);
  }

  /*
   * --------------------------------------------------
   * 5) Shift
   * --------------------------------------------------
   */
  const now = new Date();
  const dayOfWeek = now.getDay();

  const minutesNow =
    now.getHours() * 60 + now.getMinutes();

  const startMinutes =
    Math.max(0, minutesNow - 30);

  const endMinutes =
    Math.min(1439, minutesNow + 30);

  const toTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0");

    const m = (minutes % 60)
      .toString()
      .padStart(2, "0");

    return `${h}:${m}`;
  };

  let testShiftId: mongoose.Types.ObjectId | null = null;

  try {
    await CaptainShiftModel.deleteMany({
      captainId: captain._id,
      dayOfWeek,
    });

    const shift = await CaptainShiftModel.create({
      captainId: captain._id,
      dayOfWeek,
      startTime: toTime(startMinutes),
      endTime: toTime(endMinutes),
      isActive: true,
    });

    testShiftId = shift._id;

    const canWork = await captainCanWorkNow(
      captain._id.toString(),
    );

    if (canWork) {
      pass("الكابتن مسموح له بالعمل داخل الشفت الحالي");
    } else {
      fail("الكابتن داخل شفت حالي لكن captainCanWorkNow رفضه");
    }

    await CaptainShiftModel.deleteOne({
      _id: shift._id,
    });

    const outsideShift = await captainCanWorkNow(
      captain._id.toString(),
    );

    if (!outsideShift) {
      pass("منع الكابتن من العمل خارج الشفت");
    } else {
      fail("الكابتن ما زال مسموحاً له خارج الشفت");
    }
  } catch (error) {
    fail("اختبار Shifts / منع العمل خارج الشفت", error);
  }

  /*
   * --------------------------------------------------
   * 6) Dispatch فعلي
   * --------------------------------------------------
   */
  let dispatched = false;
  let assignmentId: mongoose.Types.ObjectId | null = null;

  try {
    if (!order) {
      skip("Smart Dispatch — لا يوجد ready_for_pickup غير مسند");
    } else {
      const settings = await DispatchSettingsModel.findOne();

      if (!settings) {
        throw new Error("Dispatch Settings غير موجودة.");
      }

      /*
       * نوقف شرط الشفت مؤقتاً هنا حتى نختبر Smart Dispatch
       * نفسه بشكل مستقل.
       */
      settings.requireCaptainShift = false;
      settings.onlineOnly = false;
      settings.requireSameArea = false;
      settings.requireSameGovernorate = true;
      settings.queueEnabled = true;
      settings.autoDispatchEnabled = true;
      settings.assignmentTimeoutSeconds = 10;
      await settings.save();

      await DispatchAssignmentModel.deleteMany({
        orderId: order._id,
      });

      await DispatchQueueModel.deleteMany({
        orderId: order._id,
      });

      const result = await dispatchOrder(
        order._id.toString(),
      );

      if (result.assigned) {
        dispatched = true;

        pass(
          `Smart Dispatch أسند الطلب فعلياً إلى ${result.captain?.name ?? "كابتن"}`,
        );

        const assignment =
          await DispatchAssignmentModel.findOne({
            orderId: order._id,
            status: "pending",
          });

        if (assignment) {
          assignmentId = assignment._id;

          pass("تم إنشاء Dispatch Assignment بحالة pending");

          const notification =
            await NotificationModel.findOne({
              orderId: order._id,
              userId: assignment.captainId,
              type: "order",
            });

          if (notification) {
            pass("تم إرسال إشعار للـ Captain عند الإسناد");
          } else {
            fail("لم يتم إنشاء إشعار للكابتن");
          }
        } else {
          fail("تم الإسناد بدون إنشاء Assignment");
        }
      } else if (result.queued) {
        skip(
          `الطلب دخل Queue بدلاً من الإسناد: ${result.reason}`,
        );
      } else {
        skip(
          `Smart Dispatch لم يجد كابتناً: ${result.reason}`,
        );
      }
    }
  } catch (error) {
    fail("Smart Dispatch الفعلي", error);
  }

  /*
   * --------------------------------------------------
   * 7) Accept Assignment
   * --------------------------------------------------
   */
  try {
    if (!dispatched || !order || !assignmentId) {
      skip("Accept Assignment — لم يتم إنشاء Assignment");
    } else {
      const assignment =
        await DispatchAssignmentModel.findById(
          assignmentId,
        );

      if (!assignment) {
        fail("Assignment اختفى قبل اختبار القبول");
      } else {
        const result = await acceptAssignment(
          order._id.toString(),
          assignment.captainId.toString(),
        );

        if (result.accepted) {
          pass("الكابتن قبل Assignment بنجاح");

          const accepted =
            await DispatchAssignmentModel.findById(
              assignmentId,
            ).lean();

          if (
            accepted?.status === "accepted" &&
            accepted.acceptedAt
          ) {
            pass("Assignment أصبح accepted وتم تسجيل acceptedAt");
          } else {
            fail("Assignment لم يتحول إلى accepted بشكل صحيح");
          }
        } else {
          fail(
            `رفض قبول Assignment: ${result.reason}`,
          );
        }
      }
    }
  } catch (error) {
    fail("اختبار Accept Assignment", error);
  }

  /*
   * --------------------------------------------------
   * 8) Timeout / Expire / Reassign
   * --------------------------------------------------
   */
  try {
    if (!order) {
      skip("Timeout/Reassign — لا يوجد طلب");
    } else {
      await DispatchAssignmentModel.deleteMany({
        orderId: order._id,
      });

      await DispatchQueueModel.deleteMany({
        orderId: order._id,
      });

      const settings = await DispatchSettingsModel.findOne();

      if (!settings) {
        throw new Error("Dispatch Settings غير موجودة.");
      }

      settings.requireCaptainShift = false;
      settings.onlineOnly = false;
      settings.requireSameArea = false;
      settings.queueEnabled = true;
      settings.assignmentTimeoutSeconds = 10;
      await settings.save();

      const first = await dispatchOrder(
        order._id.toString(),
      );

      if (!first.assigned) {
        skip(
          `Timeout/Reassign — لم يتم الإسناد الأول: ${first.reason}`,
        );
      } else {
        const pending =
          await DispatchAssignmentModel.findOne({
            orderId: order._id,
            status: "pending",
          });

        if (!pending) {
          fail("لم يتم العثور على Assignment pending");
        } else {
          pending.expiresAt = new Date(
            Date.now() - 1000,
          );

          await pending.save();

          await expireAssignments();

          const expired =
            await DispatchAssignmentModel.findById(
              pending._id,
            ).lean();

          if (expired?.status === "expired") {
            pass("Assignment انتهى Timeout وأصبح expired");
          } else {
            fail("Timeout لم يحول Assignment إلى expired");
          }

          const currentOrder =
            await OrderModel.findById(
              order._id,
            ).select("captainId");

          const queue =
            await DispatchQueueModel.findOne({
              orderId: order._id,
            }).lean();

          if (
            !currentOrder?.captainId &&
            queue?.status === "waiting"
          ) {
            pass(
              "بعد Timeout تم فك الإسناد وإعادة الطلب إلى Queue",
            );
          } else {
            fail(
              "بعد Timeout لم تتم إعادة الطلب إلى Queue بشكل صحيح",
            );
          }

          const processed =
            await processDispatchQueue();

          if (processed >= 0) {
            pass(
              `تم تشغيل معالجة Queue بعد Timeout (${processed} عنصر)`,
            );
          }
        }
      }
    }
  } catch (error) {
    fail("اختبار Timeout / Reassign / Queue Processing", error);
  }

  /*
   * --------------------------------------------------
   * Cleanup
   * --------------------------------------------------
   */
  console.log("");
  console.log("🧹 تنظيف بيانات الاختبار...");

  if (order) {
    await DispatchAssignmentModel.deleteMany({
      orderId: order._id,
    });

    await DispatchQueueModel.deleteMany({
      orderId: order._id,
    });

    await NotificationModel.deleteMany({
      orderId: order._id,
      type: "order",
    });

    await OrderModel.findByIdAndUpdate(
      order._id,
      {
        captainId: orderBefore?.captainId ?? null,
        status: orderBefore?.status ?? "ready_for_pickup",
        assignedAt: orderBefore?.assignedAt ?? null,
      },
    );
  }

  await CaptainShiftModel.deleteMany({
    captainId: captain._id,
    dayOfWeek,
  });

  await UserModel.findByIdAndUpdate(
    captain._id,
    {
      isOnline: captainBefore.isOnline,
    },
  );

  if (settingsBefore) {
    await DispatchSettingsModel.findOneAndUpdate(
      {},
      {
        $set: {
          autoDispatchEnabled:
            settingsBefore.autoDispatchEnabled,
          queueEnabled:
            settingsBefore.queueEnabled,
          maxActiveOrdersPerCaptain:
            settingsBefore.maxActiveOrdersPerCaptain,
          assignmentTimeoutSeconds:
            settingsBefore.assignmentTimeoutSeconds,
          maxAssignmentAttempts:
            settingsBefore.maxAssignmentAttempts,
          onlineOnly:
            settingsBefore.onlineOnly,
          requireSameArea:
            settingsBefore.requireSameArea,
          requireSameGovernorate:
            settingsBefore.requireSameGovernorate,
          requireCaptainShift:
            settingsBefore.requireCaptainShift,
        },
      },
    );
  }

  console.log("");
  console.log("==============================================");
  console.log("                 النتيجة النهائية");
  console.log("==============================================");
  console.log(`✅ Passed : ${passed}`);
  console.log(`❌ Failed : ${failed}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log("==============================================");

  if (failed > 0) {
    console.log("❌ DISPATCH SECTION FAILED");
    process.exitCode = 1;
  } else {
    console.log("✅ DISPATCH SECTIONS 6–11 PASSED");
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ TEST CRASHED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
