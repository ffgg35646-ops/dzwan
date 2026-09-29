import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";

import { UserModel } from "../src/models/User.js";
import { EstablishmentModel } from "../src/models/Establishment.js";
import { CustomerAddressModel } from "../src/models/CustomerAddress.js";
import { ProductModel } from "../src/models/Product.js";
import { OrderModel } from "../src/models/Order.js";

import { DispatchSettingsModel } from "../src/models/DispatchSettings.js";
import { DispatchQueueModel } from "../src/models/DispatchQueue.js";
import { DispatchAssignmentModel } from "../src/models/DispatchAssignment.js";
import { CaptainShiftModel } from "../src/models/CaptainShift.js";
import { NotificationModel } from "../src/models/Notification.js";

import {
  dispatchOrder,
  expireAssignments,
  processDispatchQueue,
  acceptAssignment,
} from "../src/services/dispatch-manager.service.js";

import {
  findBestCaptain,
  captainCanWorkNow,
} from "../src/services/dispatch.service.js";

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(text: string) {
  passed++;
  console.log(`✅ ${text}`);
}

function fail(text: string, error?: unknown) {
  failed++;
  console.log(`❌ ${text}`);
  if (error) console.log(error);
}

function skip(text: string) {
  skipped++;
  console.log(`⚠️ SKIP: ${text}`);
}

function id(value: unknown) {
  return value ? String(value) : "";
}

async function main() {
  console.log("");
  console.log("==================================================");
  console.log("  اختبار Smart Dispatch الحقيقي — الأقسام 6–11");
  console.log("==================================================");
  console.log("");

  await connectDatabase();

  /*
   * --------------------------------------------------
   * البحث عن بيانات حقيقية موجودة بالفعل
   * --------------------------------------------------
   */

  const customer = await UserModel.findOne({
    role: "customer",
    status: "active",
  });

  const establishment = await EstablishmentModel.findOne({
    status: "active",
  });

  if (!customer) {
    throw new Error("لا يوجد Customer فعال في قاعدة البيانات.");
  }

  if (!establishment) {
    throw new Error("لا يوجد Establishment فعال في قاعدة البيانات.");
  }

  const address = await CustomerAddressModel.findOne({
    userId: customer._id,
  });

  const product = await ProductModel.findOne({
    establishmentId: establishment._id,
    status: "active",
  });

  if (!address) {
    throw new Error(
      "لا يوجد عنوان للـ Customer المحدد في قاعدة البيانات.",
    );
  }

  if (!product) {
    throw new Error(
      "لا يوجد Product فعال تابع للـ Establishment المحدد.",
    );
  }

  const captain = await UserModel.findOne({
    role: "captain",
    status: "active",
    governorateId: establishment.governorateId,
  });

  if (!captain) {
    throw new Error(
      "لا يوجد Captain فعال في نفس محافظة الـ Establishment.",
    );
  }

  console.log(`👤 Customer      : ${customer.fullName}`);
  console.log(`🏪 Establishment : ${establishment.name}`);
  console.log(`📍 Address       : ${address.address}`);
  console.log(`🛍️ Product       : ${product.name}`);
  console.log(`🚴 Captain       : ${captain.fullName}`);
  console.log("");

  /*
   * --------------------------------------------------
   * حفظ الحالة الأصلية
   * --------------------------------------------------
   */

  const settingsBefore =
    (await DispatchSettingsModel.findOne().lean()) ?? null;

  const captainBefore = {
    isOnline: captain.isOnline,
  };

  /*
   * --------------------------------------------------
   * إنشاء Order اختبار حقيقي مؤقت
   * --------------------------------------------------
   */

  const testOrderNumber =
    `TEST-DISPATCH-${Date.now()}`;

  const unitPrice = Number(product.price);
  const quantity = 1;
  const subtotal = Number(unitPrice.toFixed(2));
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const testOrder = await OrderModel.create({
    orderNumber: testOrderNumber,

    customerId: customer._id,
    establishmentId: establishment._id,
    addressId: address._id,

    captainId: null,

    items: [
      {
        productId: product._id,
        name: product.name,
        quantity,
        unitPrice,
        totalPrice: subtotal,
      },
    ],

    subtotal,
    deliveryFee,
    total,

    status: "ready_for_pickup",

    customerNote: "طلب اختبار Smart Dispatch — سيتم حذفه تلقائياً.",
  });

  console.log(
    `🧪 تم إنشاء طلب اختبار: ${testOrder.orderNumber}`,
  );
  console.log("");

  let testShiftId: mongoose.Types.ObjectId | null = null;

  try {
    /*
     * --------------------------------------------------
     * 1 — Dispatch Settings
     * --------------------------------------------------
     */

    try {
      let settings =
        await DispatchSettingsModel.findOne();

      if (!settings) {
        settings =
          await DispatchSettingsModel.create({});
      }

      if (
        settings.queueEnabled &&
        settings.maxActiveOrdersPerCaptain >= 1 &&
        settings.assignmentTimeoutSeconds >= 10 &&
        settings.maxAssignmentAttempts >= 1
      ) {
        pass("Dispatch Settings تعمل");
      } else {
        fail("Dispatch Settings تحتوي على قيم غير صحيحة");
      }
    } catch (error) {
      fail("Dispatch Settings", error);
    }

    /*
     * --------------------------------------------------
     * 2 — Queue
     * --------------------------------------------------
     */

    try {
      const queue =
        await DispatchQueueModel.create({
          orderId: testOrder._id,
          priority: 50,
          status: "waiting",
          attempts: 0,
        });

      if (
        id(queue.orderId) === id(testOrder._id) &&
        queue.priority === 50 &&
        queue.status === "waiting"
      ) {
        pass("إنشاء الطلب داخل Dispatch Queue");
      } else {
        fail("Dispatch Queue لم تحفظ البيانات بشكل صحيح");
      }
    } catch (error) {
      fail("Dispatch Queue", error);
    }

    /*
     * --------------------------------------------------
     * 3 — Priority
     * --------------------------------------------------
     */

    try {
      const secondOrderId =
        new mongoose.Types.ObjectId();

      const high =
        await DispatchQueueModel.create({
          orderId: secondOrderId,
          priority: 999,
          status: "waiting",
          attempts: 0,
        });

      const list =
        await DispatchQueueModel.find({
          status: "waiting",
        })
          .sort({
            priority: -1,
            createdAt: 1,
          })
          .lean();

      const first = list[0];

      if (
        first &&
        Number(first.priority) === 999
      ) {
        pass("Queue ترتب الطلبات حسب Priority");
      } else {
        fail("Priority لا يتم ترتيبها بشكل صحيح");
      }

      await DispatchQueueModel.deleteOne({
        _id: high._id,
      });
    } catch (error) {
      fail("Priority", error);
    }

    /*
     * --------------------------------------------------
     * 4 — Captain Online / Capacity / Location
     * --------------------------------------------------
     */

    try {
      captain.isOnline = true;
      await captain.save();

      /*
       * Section 4 يختبر Online / Location / Capacity
       * بشكل مستقل عن نظام الشفت.
       */
      const eligibilitySettings =
        await DispatchSettingsModel.findOne();

      if (!eligibilitySettings) {
        throw new Error(
          "Dispatch Settings غير موجودة.",
        );
      }

      const originalRequireCaptainShift =
        eligibilitySettings.requireCaptainShift;

      eligibilitySettings.requireCaptainShift = false;
      eligibilitySettings.onlineOnly = true;

      await eligibilitySettings.save();

      const result =
        await findBestCaptain({
          orderId: testOrder._id,
        });

      eligibilitySettings.requireCaptainShift =
        originalRequireCaptainShift;

      await eligibilitySettings.save();

      if (result.captain) {
        pass(
          `العثور على Captain مناسب: ${result.captain.fullName}`,
        );
      } else {
        fail(
          `لم يتم العثور على Captain مناسب: ${result.reason}`,
        );
      }
    } catch (error) {
      fail("Captain eligibility / Capacity", error);
    }

    /*
     * --------------------------------------------------
     * 5 — Shifts
     * --------------------------------------------------
     */

    try {
      const shiftSettings =
        await DispatchSettingsModel.findOne();

      if (!shiftSettings) {
        throw new Error("Dispatch Settings غير موجودة.");
      }

      const originalRequireCaptainShift =
        shiftSettings.requireCaptainShift;

      shiftSettings.requireCaptainShift = true;
      await shiftSettings.save();

      const now = new Date();
      const dayOfWeek = now.getDay();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

      const startMinutes =
        Math.max(0, currentMinutes - 30);

      const endMinutes =
        Math.min(1439, currentMinutes + 30);

      const time = (minutes: number) => {
        const h =
          Math.floor(minutes / 60)
            .toString()
            .padStart(2, "0");

        const m =
          (minutes % 60)
            .toString()
            .padStart(2, "0");

        return `${h}:${m}`;
      };

      await CaptainShiftModel.deleteMany({
        captainId: captain._id,
        dayOfWeek,
      });

      const shift =
        await CaptainShiftModel.create({
          captainId: captain._id,
          dayOfWeek,
          startTime: time(startMinutes),
          endTime: time(endMinutes),
          isActive: true,
        });

      testShiftId = shift._id;

      const inside =
        await captainCanWorkNow(
          id(captain._id),
        );

      if (inside) {
        pass("Captain يعمل داخل الشفت");
      } else {
        fail("Captain مرفوض رغم وجوده داخل الشفت");
      }

      await CaptainShiftModel.deleteOne({
        _id: shift._id,
      });

      testShiftId = null;

      const outside =
        await captainCanWorkNow(
          id(captain._id),
        );

      if (!outside) {
        pass("منع العمل خارج الشفت");
      } else {
        fail("Captain مسموح له بالعمل خارج الشفت");
      }

      shiftSettings.requireCaptainShift =
        originalRequireCaptainShift;

      await shiftSettings.save();

    } catch (error) {
      fail("Shifts / Outside Shift", error);
    }

    /*
     * --------------------------------------------------
     * إعدادات الاختبار الفعلية
     * --------------------------------------------------
     */

    const settings =
      await DispatchSettingsModel.findOne();

    if (!settings) {
      throw new Error(
        "Dispatch Settings غير موجودة بعد الإنشاء.",
      );
    }

    /*
     * نوقف شرط الشفت أثناء اختبار Smart Dispatch
     * حتى نختبر التوزيع نفسه بشكل مستقل.
     */
    settings.autoDispatchEnabled = true;
    settings.queueEnabled = true;
    settings.onlineOnly = true;
    settings.requireSameGovernorate = true;
    settings.requireSameArea = false;
    settings.requireCaptainShift = false;
    settings.assignmentTimeoutSeconds = 10;
    settings.maxAssignmentAttempts = 5;

    await settings.save();

    /*
     * --------------------------------------------------
     * 6 — Smart Dispatch فعلي
     * --------------------------------------------------
     */

    let assignmentId: mongoose.Types.ObjectId | null =
      null;

    try {
      await DispatchQueueModel.deleteMany({
        orderId: testOrder._id,
      });

      await DispatchAssignmentModel.deleteMany({
        orderId: testOrder._id,
      });

      const result =
        await dispatchOrder(
          id(testOrder._id),
        );

      if (result.assigned) {
        pass(
          `Smart Dispatch أسند الطلب إلى ${result.captain?.name ?? "Captain"}`,
        );

        const assignment =
          await DispatchAssignmentModel.findOne({
            orderId: testOrder._id,
            status: "pending",
          });

        if (assignment) {
          assignmentId = assignment._id;

          pass(
            "تم إنشاء Assignment بحالة pending",
          );

          const assignedOrder =
            await OrderModel.findById(
              testOrder._id,
            ).lean();

          if (
            assignedOrder &&
            id(assignedOrder.captainId) ===
              id(assignment.captainId)
          ) {
            pass(
              "Order مرتبط بالكابتن المسند إليه",
            );
          } else {
            fail(
              "Order لا يحتوي على Captain الصحيح",
            );
          }

          const notification =
            await NotificationModel.findOne({
              orderId: testOrder._id,
              userId: assignment.captainId,
              type: "order",
            });

          if (notification) {
            pass(
              "تم إنشاء Notification للكابتن",
            );
          } else {
            fail(
              "لم يتم إنشاء Notification للكابتن",
            );
          }
        } else {
          fail(
            "Smart Dispatch أسند الطلب بدون Assignment",
          );
        }
      } else if (result.queued) {
        fail(
          `Smart Dispatch وضع الطلب في Queue رغم وجود Captain مؤهل: ${result.reason}`,
        );
      } else {
        fail(
          `Smart Dispatch فشل: ${result.reason}`,
        );
      }
    } catch (error) {
      fail("Smart Dispatch", error);
    }

    /*
     * --------------------------------------------------
     * 7 — Accept Assignment
     * --------------------------------------------------
     */

    try {
      if (!assignmentId) {
        fail(
          "Accept Assignment لم يُختبر لأن الإسناد لم يحدث",
        );
      } else {
        const assignment =
          await DispatchAssignmentModel.findById(
            assignmentId,
          );

        if (!assignment) {
          fail("Assignment غير موجود");
        } else {
          const result =
            await acceptAssignment(
              id(testOrder._id),
              id(assignment.captainId),
            );

          if (
            result.status === "accepted" &&
            result.acceptedAt
          ) {
            pass(
              "Captain قبل Assignment بنجاح",
            );

            const accepted =
              await DispatchAssignmentModel.findById(
                assignmentId,
              ).lean();

            if (
              accepted?.status === "accepted" &&
              accepted.acceptedAt
            ) {
              pass(
                "Assignment أصبح accepted مع acceptedAt",
              );
            } else {
              fail(
                "حالة Assignment بعد القبول غير صحيحة",
              );
            }
          } else {
            fail(
              `Captain رفض قبول Assignment: حالة الإسناد الحالية ${result.status ?? "غير معروفة"}`,
            );
          }
        }
      }
    } catch (error) {
      fail("Accept Assignment", error);
    }

    /*
     * --------------------------------------------------
     * 8 — Timeout / Reassign / Queue
     * --------------------------------------------------
     */

    try {
      /*
       * ننشئ Assignment جديد pending لاختبار الـ timeout
       */
      await DispatchAssignmentModel.deleteMany({
        orderId: testOrder._id,
      });

      await DispatchQueueModel.deleteMany({
        orderId: testOrder._id,
      });

      await OrderModel.findByIdAndUpdate(
        testOrder._id,
        {
          captainId: null,
          status: "ready_for_pickup",
          assignedAt: null,
        },
      );

      const first =
        await dispatchOrder(
          id(testOrder._id),
        );

      if (!first.assigned) {
        fail(
          `تعذر إنشاء Assignment لاختبار Timeout: ${first.reason}`,
        );
      } else {
        const pending =
          await DispatchAssignmentModel.findOne({
            orderId: testOrder._id,
            status: "pending",
          });

        if (!pending) {
          fail(
            "لم يتم إنشاء pending Assignment للـ Timeout",
          );
        } else {
          pending.expiresAt =
            new Date(Date.now() - 1000);

          await pending.save();

          await expireAssignments();

          const expired =
            await DispatchAssignmentModel.findById(
              pending._id,
            ).lean();

          if (expired?.status === "expired") {
            pass(
              "Assignment انتهى بالـ Timeout وأصبح expired",
            );
          } else {
            fail(
              "Assignment لم يتحول إلى expired",
            );
          }

          const after =
            await OrderModel.findById(
              testOrder._id,
            ).select("captainId");

          const queue =
            await DispatchQueueModel.findOne({
              orderId: testOrder._id,
            }).lean();

          if (
            !after?.captainId &&
            queue?.status === "waiting"
          ) {
            pass(
              "بعد Timeout تم فك الكابتن وإعادة الطلب للـ Queue",
            );
          } else {
            fail(
              "بعد Timeout لم تتم إعادة الطلب للـ Queue",
            );
          }

          const processed =
            await processDispatchQueue();

          if (processed >= 0) {
            pass(
              `تم تشغيل Queue Processor بنجاح (${processed} عنصر)`,
            );
          } else {
            fail(
              "Queue Processor أعاد نتيجة غير صحيحة",
            );
          }
        }
      }
    } catch (error) {
      fail(
        "Timeout / Reassign / Queue Processor",
        error,
      );
    }

    /*
     * --------------------------------------------------
     * 9 — Capacity
     * --------------------------------------------------
     */

    try {
      const settingsNow =
        await DispatchSettingsModel.findOne();

      if (!settingsNow) {
        throw new Error(
          "Dispatch Settings غير موجودة.",
        );
      }

      settingsNow.maxActiveOrdersPerCaptain = 1;
      settingsNow.onlineOnly = false;
      settingsNow.requireSameArea = false;
      settingsNow.requireSameGovernorate = false;
      settingsNow.requireCaptainShift = false;

      await settingsNow.save();

      /*
       * إنشاء Order مؤقت نشط للكابتن حتى نختبر
       * Capacity فعلياً بدون الاعتماد على بيانات تشغيلية موجودة.
       */
      const capacityOrder =
        await OrderModel.create({
          orderNumber: `TEST-CAPACITY-${Date.now()}`,
          customerId: customer._id,
          establishmentId: establishment._id,
          addressId: address._id,
          captainId: captain._id,

          items: [
            {
              productId: product._id,
              name: product.name,
              quantity: 1,
              unitPrice,
              totalPrice: subtotal,
            },
          ],

          subtotal,
          deliveryFee,
          total,

          status: "assigned",

          customerNote:
            "طلب مؤقت لاختبار Capacity — سيتم حذفه تلقائياً.",
        });

      try {
        const result =
          await findBestCaptain({
            orderId: testOrder._id,
          });

        if (
          !result.captain ||
          id(result.captain.captainId) !==
            id(captain._id)
        ) {
          pass(
            "Capacity تمنع Captain الذي وصل للحد الأقصى",
          );
        } else {
          fail(
            "Capacity لم تمنع Captain رغم وصوله للحد الأقصى",
          );
        }
      } finally {
        await OrderModel.deleteOne({
          _id: capacityOrder._id,
        });
      }
    } catch (error) {
      fail("Capacity", error);
    }
  } finally {
    /*
     * --------------------------------------------------
     * CLEANUP كامل
     * --------------------------------------------------
     */

    console.log("");
    console.log("🧹 تنظيف بيانات الاختبار...");

    await DispatchAssignmentModel.deleteMany({
      orderId: testOrder._id,
    });

    await DispatchQueueModel.deleteMany({
      orderId: testOrder._id,
    });

    await NotificationModel.deleteMany({
      orderId: testOrder._id,
    });

    if (testShiftId) {
      await CaptainShiftModel.deleteOne({
        _id: testShiftId,
      });
    }

    await CaptainShiftModel.deleteMany({
      captainId: captain._id,
      dayOfWeek: new Date().getDay(),
    });

    await OrderModel.deleteOne({
      _id: testOrder._id,
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

    console.log("🧹 Cleanup انتهى.");
  }

  console.log("");
  console.log("==================================================");
  console.log("                 النتيجة النهائية");
  console.log("==================================================");
  console.log(`✅ Passed  : ${passed}`);
  console.log(`❌ Failed  : ${failed}`);
  console.log(`⚠️ Skipped : ${skipped}`);
  console.log("==================================================");

  if (failed > 0) {
    console.log("❌ الاختبار كشف مشاكل في Smart Dispatch 6–11");
    process.exitCode = 1;
  } else if (skipped > 0) {
    console.log(
      "⚠️ الاختبار انتهى بدون أخطاء، لكن توجد أجزاء لم يمكن اختبارها بسبب بيانات التشغيل الحالية.",
    );
  } else {
    console.log(
      "✅ تم اختبار Smart Dispatch 6–11 بالكامل بنجاح.",
    );
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
