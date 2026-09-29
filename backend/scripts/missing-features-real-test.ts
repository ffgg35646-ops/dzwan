
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose, { Types } from "mongoose";

import { OrderModel } from "../src/models/Order.js";
import { CaptainCashTransactionModel } from "../src/models/CaptainCashTransaction.js";
import { CaptainRatingModel } from "../src/models/CaptainRating.js";
import { AuditLogModel } from "../src/models/AuditLog.js";
import { NotificationRuleModel } from "../src/models/NotificationRule.js";
import { OperationsSettingsModel } from "../src/models/OperationsSettings.js";
import { UserModel } from "../src/models/User.js";

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "";

if (!uri) {
  throw new Error(
    "MONGODB_URI غير موجود.",
  );
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
      error instanceof Error
        ? error.message
        : String(error)
    }`,
  );
}

await mongoose.connect(uri);

const captain =
  await UserModel.findOne({
    role: "captain",
    status: "active",
  }).select("_id");

const captainId =
  captain?._id ??
  new Types.ObjectId();

let order:
  | Awaited<
      ReturnType<typeof OrderModel.create>
    >
  | null = null;

let ratingId:
  | Types.ObjectId
  | null = null;

let auditId:
  | Types.ObjectId
  | null = null;

try {
  // 17/18 الكاش
  try {
    order = await OrderModel.create({
      orderNumber:
        `TEST-CASH-${Date.now()}`,
      customerId:
        new Types.ObjectId(),
      establishmentId:
        new Types.ObjectId(),
      addressId:
        new Types.ObjectId(),
      captainId,
      items: [{
        productId:
          new Types.ObjectId(),
        name: "اختبار كاش",
        quantity: 1,
        unitPrice: 25000,
        totalPrice: 25000,
      }],
      subtotal: 25000,
      deliveryFee: 5000,
      total: 30000,
      status: "delivered",
    });

    await CaptainCashTransactionModel.create([
      {
        captainId,
        orderId: order._id,
        type: "paid_to_establishment",
        amount: 25000,
      },
      {
        captainId,
        orderId: order._id,
        type: "collected_from_customer",
        amount: 30000,
      },
      {
        captainId,
        orderId: order._id,
        type: "delivery_fee",
        amount: 5000,
      },
    ]);

    const rows =
      await CaptainCashTransactionModel.find({
        orderId: order._id,
      }).lean();

    if (rows.length !== 3) {
      throw new Error(
        "حركات الكاش الثلاث لم تحفظ.",
      );
    }

    const paid = rows
      .filter(
        (x) =>
          x.type ===
          "paid_to_establishment",
      )
      .reduce(
        (s, x) => s + x.amount,
        0,
      );

    const collected = rows
      .filter(
        (x) =>
          x.type ===
          "collected_from_customer",
      )
      .reduce(
        (s, x) => s + x.amount,
        0,
      );

    const fees = rows
      .filter(
        (x) =>
          x.type === "delivery_fee",
      )
      .reduce(
        (s, x) => s + x.amount,
        0,
      );

    if (
      paid !== 25000 ||
      collected !== 30000 ||
      fees !== 5000
    ) {
      throw new Error(
        "حساب الكاش غير صحيح.",
      );
    }

    pass("الكاش الحقيقي + كشف الحركة");
  } catch (e) {
    fail(
      "الكاش الحقيقي + كشف الحركة",
      e,
    );
  }

  // التقييم
  try {
    if (!order) {
      throw new Error(
        "طلب الاختبار غير موجود.",
      );
    }

    const rating =
      await CaptainRatingModel.create({
        captainId,
        establishmentId:
          order.establishmentId,
        orderId: order._id,
        stars: 5,
        comment:
          "تقييم اختبار.",
      });

    ratingId = rating._id;

    if (rating.stars !== 5) {
      throw new Error(
        "التقييم لم يحفظ.",
      );
    }

    pass("التقييمات");
  } catch (e) {
    fail("التقييمات", e);
  }

  // Audit
  try {
    const row =
      await AuditLogModel.create({
        actorId: captainId,
        actorRole: "captain",
        action: "test.action",
        entityType: "Order",
        entityId:
          order?._id ??
          new Types.ObjectId(),
        before: {
          status: "assigned",
        },
        after: {
          status: "delivered",
        },
        ip: "127.0.0.1",
        userAgent:
          "missing-features-test",
        description:
          "اختبار Audit.",
      });

    auditId = row._id;

    const loaded =
      await AuditLogModel.findById(
        row._id,
      ).lean();

    if (
      !loaded ||
      !loaded.before ||
      !loaded.after ||
      !loaded.actorId
    ) {
      throw new Error(
        "Audit record ناقص.",
      );
    }

    pass("Audit Log");
  } catch (e) {
    fail("Audit Log", e);
  }

  // Notification Rules
  try {
    const rules =
      await NotificationRuleModel.countDocuments();

    if (rules < 3) {
      throw new Error(
        "قواعد إشعارات الأحداث غير مكتملة.",
      );
    }

    pass("إشعارات الأحداث");
  } catch (e) {
    fail(
      "إشعارات الأحداث",
      e,
    );
  }

  // Central settings
  try {
    const settings =
      await OperationsSettingsModel.findOne();

    if (!settings) {
      throw new Error(
        "Operations settings غير موجودة.",
      );
    }

    if (
      !settings.pricingMode ||
      !settings.stuckOrderMinutes
    ) {
      throw new Error(
        "الإعدادات المركزية ناقصة.",
      );
    }

    pass("الإعدادات المركزية");
  } catch (e) {
    fail(
      "الإعدادات المركزية",
      e,
    );
  }
} finally {
  if (order?._id) {
    await CaptainCashTransactionModel.deleteMany({
      orderId: order._id,
    });

    await CaptainRatingModel.deleteMany({
      orderId: order._id,
    });

    await AuditLogModel.deleteMany({
      entityId: order._id,
    });

    await OrderModel.deleteOne({
      _id: order._id,
    });
  }

  if (ratingId) {
    await CaptainRatingModel.deleteOne({
      _id: ratingId,
    });
  }

  if (auditId) {
    await AuditLogModel.deleteOne({
      _id: auditId,
    });
  }

  await mongoose.disconnect();
}

console.log("");
console.log("========================================");
console.log("نتيجة الاختبار");
console.log("========================================");
console.log(`Passed : ${passed}`);
console.log(`Failed : ${failed}`);
console.log("========================================");

if (failed > 0) {
  process.exit(1);
}

console.log(
  "✅ نجحت الاختبارات الخاصة بالإضافات.",
);

process.stdin.resume();
process.stdin.once("data", () =>
  process.exit(0),
);
