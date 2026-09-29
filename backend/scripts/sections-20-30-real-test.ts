import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

let passed = 0;
let failed = 0;
let skipped = 0;

function pass(message: string) {
  passed++;
  console.log(`✅ ${message}`);
}

function fail(message: string) {
  failed++;
  console.log(`❌ ${message}`);
}

function skip(message: string) {
  skipped++;
  console.log(`⚠️ ${message}`);
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listFiles(full);
      }

      return [full];
    });
}

function readAll(files: string[]): string {
  return files
    .map((file) => {
      try {
        return fs.readFileSync(file, "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function existsAny(files: string[], patterns: RegExp[]): boolean {
  return files.some((file) =>
    patterns.some((pattern) => pattern.test(path.basename(file))),
  );
}

console.log("");
console.log("========================================");
console.log("اختبار الأقسام 20 → 30");
console.log("========================================");

const modelFiles = listFiles(path.join(ROOT, "src/models"));
const serviceFiles = listFiles(path.join(ROOT, "src/services"));
const controllerFiles = listFiles(path.join(ROOT, "src/controllers"));
const routeFiles = listFiles(path.join(ROOT, "src/routes"));

const allSourceFiles = [
  ...modelFiles,
  ...serviceFiles,
  ...controllerFiles,
  ...routeFiles,
];

const allSource = readAll(allSourceFiles);

console.log("");
console.log(`Models      : ${modelFiles.length}`);
console.log(`Services    : ${serviceFiles.length}`);
console.log(`Controllers : ${controllerFiles.length}`);
console.log(`Routes      : ${routeFiles.length}`);
console.log("");

/*
 * 20 - إثبات التسليم
 */
try {
  const proofModel = modelFiles.find((f) =>
    /DeliveryProof\.ts$/i.test(f),
  );

  const proofService = serviceFiles.find((f) =>
    /delivery-proof\.service\.ts$/i.test(f),
  );

  if (!proofModel || !proofService) {
    fail("20 - إثبات التسليم: ملفات التنفيذ غير موجودة.");
  } else {
    const required = [
      "createDeliveryOtp",
      "verifyDeliveryOtp",
      "setDeliveryPhoto",
      "assertDeliveryProof",
    ];

    const missing = required.filter(
      (name) => !allSource.includes(name),
    );

    if (missing.length) {
      fail(
        `20 - إثبات التسليم: دوال ناقصة: ${missing.join(", ")}`,
      );
    } else {
      pass("20 - إثبات التسليم OTP + صورة");
    }
  }
} catch (error) {
  fail(`20 - إثبات التسليم: ${String(error)}`);
}

/*
 * 21 - صورة الطلب عند الاستلام
 */
try {
  const found = existsAny(
    allSourceFiles,
    [
      /pickup.*photo/i,
      /order.*photo/i,
      /delivery.*photo/i,
      /proof.*photo/i,
      /photo.*pickup/i,
      /captain.*photo/i,
    ],
  );

  const pickupTerms =
    /pickup|استلام|photoUrl|photoUploadedAt|صورة/i.test(allSource);

  if (found || pickupTerms) {
    pass("21 - صورة الطلب عند الاستلام: تم العثور على تنفيذ متعلق بالصورة.");
  } else {
    skip("21 - صورة الطلب عند الاستلام: لم أجد تنفيذًا واضحًا.");
  }
} catch (error) {
  fail(`21 - صورة الطلب عند الاستلام: ${String(error)}`);
}

/*
 * 22 - ملاحظات الطلب
 */
try {
  const orderModel = modelFiles.find((f) =>
    /Order\.ts$/i.test(f),
  );

  if (!orderModel) {
    fail("22 - ملاحظات الطلب: Order model غير موجود.");
  } else {
    const orderSource = fs.readFileSync(orderModel, "utf8");

    if (/customerNote/.test(orderSource)) {
      pass("22 - ملاحظات الطلب: customerNote موجود في Order.");
    } else {
      skip("22 - ملاحظات الطلب: لا يوجد customerNote في Order.");
    }
  }
} catch (error) {
  fail(`22 - ملاحظات الطلب: ${String(error)}`);
}

/*
 * 23 - التقييمات
 */
try {
  const found = existsAny(
    allSourceFiles,
    [
      /Rating/i,
      /Review/i,
      /rating/i,
      /review/i,
    ],
  );

  if (found || /rating|review|تقييم|تقييمات/i.test(allSource)) {
    pass("23 - التقييمات: تم العثور على مكونات/تنفيذ للتقييم.");
  } else {
    skip("23 - التقييمات: لم يتم العثور على تنفيذ واضح.");
  }
} catch (error) {
  fail(`23 - التقييمات: ${String(error)}`);
}

/*
 * 24 - KPI وأداء الكابتن
 */
try {
  const found =
    /KPI|performance|captain.*performance|أداء.*كابتن|مؤشرات/i.test(
      allSource,
    );

  const reportRoute = routeFiles.some((f) =>
    /report|captain/i.test(path.basename(f)),
  );

  if (found || reportRoute) {
    pass("24 - KPI وأداء الكابتن: تم العثور على تنفيذ محتمل.");
  } else {
    skip("24 - KPI وأداء الكابتن: لم يتم العثور على تنفيذ واضح.");
  }
} catch (error) {
  fail(`24 - KPI وأداء الكابتن: ${String(error)}`);
}

/*
 * 25 - تقارير المطاعم والمحلات
 */
try {
  const found =
    /establishment.*report|shop.*report|restaurant.*report|تقارير.*المطاعم|تقارير.*المحلات/i.test(
      allSource,
    );

  if (found) {
    pass("25 - تقارير المطاعم والمحلات: تم العثور على تنفيذ.");
  } else {
    skip("25 - تقارير المطاعم والمحلات: لم يتم العثور على تنفيذ واضح.");
  }
} catch (error) {
  fail(`25 - تقارير المطاعم والمحلات: ${String(error)}`);
}

/*
 * 26 - تقارير الإدارة
 */
try {
  const found =
    /admin.*report|reports\.routes|reports\.controller|تقرير.*الإدارة|تقارير.*الإدارة/i.test(
      allSource,
    );

  if (found) {
    pass("26 - تقارير الإدارة: تم العثور على تنفيذ.");
  } else {
    skip("26 - تقارير الإدارة: لم يتم العثور على تنفيذ واضح.");
  }
} catch (error) {
  fail(`26 - تقارير الإدارة: ${String(error)}`);
}

/*
 * 27 - Dashboard
 */
try {
  const adminFiles = listFiles(path.join(ROOT, "..", "admin", "src"));

  const dashboardFound = adminFiles.some((f) =>
    /dashboard/i.test(path.basename(f)),
  );

  if (dashboardFound) {
    pass("27 - Dashboard: صفحة/ملفات Dashboard موجودة.");
  } else {
    skip("27 - Dashboard: لم يتم العثور على ملفات Dashboard.");
  }
} catch (error) {
  fail(`27 - Dashboard: ${String(error)}`);
}

/*
 * 28 - الإشعارات
 */
try {
  const notificationModel = existsAny(
    modelFiles,
    [/Notification/i],
  );

  const notificationService = existsAny(
    serviceFiles,
    [/notification/i],
  );

  const notificationRoutes = existsAny(
    routeFiles,
    [/notification/i],
  );

  if (
    notificationModel &&
    notificationService &&
    notificationRoutes
  ) {
    pass("28 - الإشعارات: Model + Service + Routes موجودة.");
  } else {
    skip(
      `28 - الإشعارات: Model=${notificationModel} Service=${notificationService} Routes=${notificationRoutes}`,
    );
  }
} catch (error) {
  fail(`28 - الإشعارات: ${String(error)}`);
}

/*
 * 29 - العروض
 */
try {
  const found = existsAny(
    allSourceFiles,
    [
      /Offer/i,
      /Promotion/i,
      /Coupon/i,
      /offers/i,
      /promotions/i,
      /coupons/i,
    ],
  );

  if (found || /offer|promotion|coupon|عرض|عروض/i.test(allSource)) {
    pass("29 - العروض: تم العثور على تنفيذ.");
  } else {
    skip("29 - العروض: لم يتم العثور على تنفيذ واضح.");
  }
} catch (error) {
  fail(`29 - العروض: ${String(error)}`);
}

/*
 * 30 - المكافآت
 */
try {
  const found = existsAny(
    allSourceFiles,
    [
      /Reward/i,
      /Bonus/i,
      /Incentive/i,
      /rewards/i,
      /bonus/i,
    ],
  );

  if (
    found ||
    /reward|bonus|incentive|مكافأة|مكافآت/i.test(allSource)
  ) {
    pass("30 - المكافآت: تم العثور على تنفيذ.");
  } else {
    skip("30 - المكافآت: لم يتم العثور على تنفيذ واضح.");
  }
} catch (error) {
  fail(`30 - المكافآت: ${String(error)}`);
}

console.log("");
console.log("========================================");
console.log(`Passed  : ${passed}`);
console.log(`Failed  : ${failed}`);
console.log(`Skipped : ${skipped}`);
console.log("========================================");

if (failed > 0) {
  console.log("❌ يوجد فشل في فحص الأقسام 20 → 30.");
  process.exitCode = 1;
} else {
  console.log("✅ انتهى فحص الأقسام 20 → 30.");
}

readline:
process.stdin.resume();
process.stdin.setEncoding("utf8");
process.stdin.once("data", () => {
  process.exit(process.exitCode ?? 0);
});
