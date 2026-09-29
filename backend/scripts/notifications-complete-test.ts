import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { NotificationModel } from "../src/models/Notification.js";

const BASE = "http://localhost:4000/api";
const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let PASS = 0;
let FAIL = 0;

function ok(name: string) {
  console.log(`✅ ${name}`);
  PASS++;
}

function bad(name: string, extra?: unknown) {
  console.log(`❌ ${name}`);
  if (extra !== undefined) {
    console.log(typeof extra === "string" ? extra : JSON.stringify(extra, null, 2));
  }
  FAIL++;
}

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  const body = await res.json().catch(() => null);
  const cookies = res.headers.getSetCookie?.() ?? [];

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(`Login failed: HTTP ${res.status} ${JSON.stringify(body)}`);
  }

  return cookies.map((v) => v.split(";", 1)[0]).join("; ");
}

async function request(
  method: string,
  path: string,
  cookie?: string,
  body?: unknown,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await res.text();

  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  return {
    status: res.status,
    data,
  };
}

async function main() {
  console.log();
  console.log("==========================================");
  console.log("     اختبار Notifications — كامل");
  console.log("==========================================");
  console.log();

  let cookie = "";

  try {
    console.log("1) تسجيل الدخول...");
    cookie = await login();
    ok("Admin Login");
  } catch (error) {
    bad("Admin Login", String(error));
    process.exit(1);
  }

  let me: any = null;

  console.log();
  console.log("2) معرفة المستخدم الحالي...");
  const meRes = await request("GET", "/auth/me", cookie);

  if (
    meRes.status === 200 &&
    meRes.data?.success &&
    meRes.data?.user?.id
  ) {
    me = meRes.data.user;
    ok("قراءة المستخدم الحالي");
  } else {
    bad("قراءة المستخدم الحالي", meRes);
    process.exit(1);
  }

  const userId = new mongoose.Types.ObjectId(me.id);

  console.log();
  console.log("3) إنشاء إشعارات اختبارية في MongoDB...");

  const created = await NotificationModel.insertMany([
    {
      userId,
      type: "system",
      title: "اختبار إشعار 1",
      message: "إشعار اختبار Notifications رقم 1",
      isRead: false,
    },
    {
      userId,
      type: "order",
      title: "اختبار إشعار 2",
      message: "إشعار اختبار Notifications رقم 2",
      isRead: false,
    },
    {
      userId,
      type: "captain",
      title: "اختبار إشعار 3",
      message: "إشعار اختبار Notifications رقم 3",
      isRead: true,
    },
  ]);

  ok(`إنشاء ${created.length} إشعارات اختبارية`);

  try {
    console.log();
    console.log("4) GET /notifications...");
    const list1 = await request("GET", "/notifications", cookie);

    if (
      list1.status === 200 &&
      list1.data?.success === true &&
      Array.isArray(list1.data?.notifications) &&
      typeof list1.data?.unreadCount === "number"
    ) {
      ok("قراءة قائمة الإشعارات + unreadCount");
    } else {
      bad("قراءة قائمة الإشعارات", list1);
    }

    console.log();
    console.log("5) التحقق من عزل إشعارات المستخدم...");
    const wrongUserId = new mongoose.Types.ObjectId().toString();

    const isolated = await request(
      "PATCH",
      `/notifications/${wrongUserId}/read`,
      cookie,
    );

    if (isolated.status === 404) {
      ok("عدم الوصول لإشعار غير مملوك للمستخدم");
    } else {
      bad("عزل إشعارات المستخدم", isolated);
    }

    console.log();
    console.log("6) اختبار ID غير صالح...");
    const invalidId = await request(
      "PATCH",
      "/notifications/not-an-object-id/read",
      cookie,
    );

    if (
      invalidId.status === 400 &&
      invalidId.data?.success === false
    ) {
      ok("رفض ID غير صالح");
    } else {
      bad("رفض ID غير صالح", invalidId);
    }

    console.log();
    console.log("7) تعليم إشعار واحد كمقروء...");
    const unreadId = created.find((n) => !n.isRead)?._id?.toString();

    if (!unreadId) {
      bad("اختيار إشعار غير مقروء");
    } else {
      const markOne = await request(
        "PATCH",
        `/notifications/${unreadId}/read`,
        cookie,
      );

      if (
        markOne.status === 200 &&
        markOne.data?.success === true &&
        markOne.data?.notification?.isRead === true
      ) {
        ok("تعليم إشعار واحد كمقروء");
      } else {
        bad("تعليم إشعار واحد كمقروء", markOne);
      }

      const afterOne = await NotificationModel.findById(unreadId).lean();

      if (afterOne?.isRead === true) {
        ok("التحقق من تغيّر isRead في قاعدة البيانات");
      } else {
        bad("التحقق من isRead في قاعدة البيانات", afterOne);
      }
    }

    console.log();
    console.log("8) POST /notifications/read-all...");
    const markAll = await request(
      "POST",
      "/notifications/read-all",
      cookie,
    );

    if (
      markAll.status === 200 &&
      markAll.data?.success === true
    ) {
      ok("تعليم جميع الإشعارات كمقروءة");
    } else {
      bad("تعليم جميع الإشعارات", markAll);
    }

    const remainingUnread = await NotificationModel.countDocuments({
      userId,
      isRead: false,
    });

    if (remainingUnread === 0) {
      ok("التحقق من عدم وجود إشعارات غير مقروءة");
    } else {
      bad(`ما زال هناك ${remainingUnread} إشعار غير مقروء`);
    }

    console.log();
    console.log("9) اختبار حماية GET بدون تسجيل دخول...");
    const noAuthGet = await request("GET", "/notifications");

    if (
      noAuthGet.status === 401 &&
      noAuthGet.data?.success === false
    ) {
      ok("GET محمي من غير تسجيل الدخول");
    } else {
      bad("حماية GET", noAuthGet);
    }

    console.log();
    console.log("10) اختبار حماية read-all بدون تسجيل دخول...");
    const noAuthAll = await request("POST", "/notifications/read-all");

    if (
      noAuthAll.status === 401 &&
      noAuthAll.data?.success === false
    ) {
      ok("read-all محمي من غير تسجيل الدخول");
    } else {
      bad("حماية read-all", noAuthAll);
    }

    console.log();
    console.log("11) اختبار limit...");
    const limited = await request(
      "GET",
      "/notifications?limit=1",
      cookie,
    );

    if (
      limited.status === 200 &&
      limited.data?.success === true &&
      Array.isArray(limited.data?.notifications) &&
      limited.data.notifications.length <= 1
    ) {
      ok("limit يعمل بشكل صحيح");
    } else {
      bad("اختبار limit", limited);
    }
  } finally {
    console.log();
    console.log("12) تنظيف إشعارات الاختبار...");
    const deleted = await NotificationModel.deleteMany({
      _id: { $in: created.map((n) => n._id) },
    });

    if (deleted.deletedCount === created.length) {
      ok("تنظيف بيانات الاختبار");
    } else {
      bad("تنظيف بيانات الاختبار", deleted);
    }

    await mongoose.connection.close();
  }

  console.log();
  console.log("==========================================");
  console.log("النتيجة");
  console.log("==========================================");
  console.log(`Passed: ${PASS}`);
  console.log(`Failed: ${FAIL}`);
  console.log();

  if (FAIL === 0) {
    console.log("✅ NOTIFICATIONS COMPLETE TEST PASSED");
    process.exit(0);
  } else {
    console.log("❌ NOTIFICATIONS NEED FIXES");
    process.exit(1);
  }
}

await connectDatabase();
await main();
