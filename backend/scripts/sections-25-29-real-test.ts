import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose, { Types } from "mongoose";
import { EstablishmentModel } from "../src/models/Establishment.js";
import { OrderModel } from "../src/models/Order.js";
import { OfferModel } from "../src/models/Offer.js";
import {
  getEstablishmentReport,
} from "../src/services/establishment-report.service.js";
import {
  calculateOfferDiscount,
  findValidOffer,
} from "../src/services/offer.service.js";

const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "";

if (!MONGO_URI) {
  throw new Error("MONGODB_URI غير موجود في البيئة.");
}

let passed = 0;
let failed = 0;

function pass(message: string) {
  passed++;
  console.log(`✅ ${message}`);
}

function fail(message: string, error?: unknown) {
  failed++;
  console.log(
    `❌ ${message}${
      error
        ? `: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`
        : ""
    }`,
  );
}

async function main() {
  await mongoose.connect(MONGO_URI);

  // =======================================================
  // 25 - تقارير المطاعم والمحلات
  // =======================================================
  let temporaryEstablishmentId: Types.ObjectId | null = null;

  try {
    let establishment =
      await EstablishmentModel.findOne().lean();

    // لا نعتمد على وجود بيانات تشغيلية مسبقًا.
    if (!establishment) {
      const captain = await (async () => {
        return null;
      })();

      void captain;

      establishment = await EstablishmentModel.create({
        name: "منشأة اختبار التقارير",
        type: "restaurant",
        status: "active",
        phone: `078${String(Date.now()).slice(-8)}`,
        email: `report-test-${Date.now()}@dzwan.local`,
        address: "عنوان اختبار مؤقت",
        governorateId: new Types.ObjectId(
          "6a9457bfaac212107823492c",
        ),
        areaId: new Types.ObjectId(
          "6a9457cbaac212107823492d",
        ),
        ownerUserId: null,
        captainId: null,
        description: "بيانات مؤقتة لاختبار التقارير",
        logoUrl: null,
      });

      temporaryEstablishmentId = establishment._id;
    }

    const to = new Date();
    const from = new Date(
      to.getTime() -
        30 * 24 * 60 * 60 * 1000,
    );

    const report =
      await getEstablishmentReport(
        establishment._id,
        from,
        to,
      );

    if (!report) {
      throw new Error(
        "لم يتم إرجاع تقرير المنشأة.",
      );
    }

    if (
      !report.establishment ||
      !report.orders ||
      !report.revenue ||
      !report.period
    ) {
      throw new Error(
        "تقرير المنشأة غير مكتمل.",
      );
    }

    const orderFields = [
      "total",
      "pending",
      "active",
      "delivered",
      "cancelled",
    ] as const;

    for (const field of orderFields) {
      if (
        typeof report.orders[field] !== "number"
      ) {
        throw new Error(
          `حقل الطلبات غير صحيح: ${field}`,
        );
      }
    }

    const revenueFields = [
      "subtotal",
      "deliveryFees",
      "gross",
      "averageOrderValue",
    ] as const;

    for (const field of revenueFields) {
      if (
        typeof report.revenue[field] !== "number"
      ) {
        throw new Error(
          `حقل الإيرادات غير صحيح: ${field}`,
        );
      }
    }

    if (report.orders.total < 0) {
      throw new Error(
        "إجمالي الطلبات غير صحيح.",
      );
    }

    if (report.revenue.gross < 0) {
      throw new Error(
        "إجمالي الإيرادات غير صحيح.",
      );
    }

    pass(
      `25 - تقارير المطاعم والمحلات (${report.establishment.name})`,
    );
  } catch (error) {
    fail(
      "25 - تقارير المطاعم والمحلات",
      error,
    );
  } finally {
    if (temporaryEstablishmentId) {
      await EstablishmentModel.deleteOne({
        _id: temporaryEstablishmentId,
      });
    }
  }

  // =======================================================
  // 29 - العروض
  // =======================================================
  let temporaryOfferId:
    | Types.ObjectId
    | null = null;

  try {
    const offer = await OfferModel.create({
      establishmentId: null,
      title: "عرض اختبار 29",
      code: `TEST29${Date.now()}`,
      type: "percentage",
      value: 20,
      minOrderAmount: 50,
      maxDiscount: 30,
      startsAt: new Date(
        Date.now() - 60 * 1000,
      ),
      endsAt: new Date(
        Date.now() + 60 * 60 * 1000,
      ),
      usageLimit: 10,
      usageCount: 0,
      isActive: true,
    });

    temporaryOfferId = offer._id;

    const found = await findValidOffer({
      establishmentId: null,
      code: offer.code!,
    });

    if (!found) {
      throw new Error(
        "لم يتم العثور على العرض.",
      );
    }

    const discount =
      await calculateOfferDiscount(
        found,
        100,
      );

    if (discount !== 20) {
      throw new Error(
        `الخصم غير صحيح: ${discount}`,
      );
    }

    const minimumRejected =
      await (async () => {
        try {
          await calculateOfferDiscount(
            found,
            40,
          );
          return false;
        } catch {
          return true;
        }
      })();

    if (!minimumRejected) {
      throw new Error(
        "العرض لم يرفض الطلب الأقل من الحد الأدنى.",
      );
    }

    pass("29 - إنشاء/التحقق/حساب العرض");
  } catch (error) {
    fail("29 - العروض", error);
  } finally {
    if (temporaryOfferId) {
      await OfferModel.deleteOne({
        _id: temporaryOfferId,
      });
    }
  }

  await mongoose.disconnect();

  console.log("");
  console.log("========================================");
  console.log(`Passed  : ${passed}`);
  console.log(`Failed  : ${failed}`);
  console.log("========================================");

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    "✅ تم اختبار الأقسام 25 و29.",
  );
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

process.stdin.resume();
process.stdin.setEncoding("utf8");
process.stdin.once("data", () => {
  process.exit(0);
});
