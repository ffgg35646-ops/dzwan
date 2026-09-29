import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import ComplaintModel from "../src/models/Complaint.js";

const BASE = "http://localhost:4000/api";
const EMAIL = "admin@dzwan.local";
const PASSWORD = "Dzwan@2026_Admin";

let PASS = 0;
let FAIL = 0;

function ok(x: string) {
  console.log(`✅ ${x}`);
  PASS++;
}

function bad(x: string, y?: unknown) {
  console.log(`❌ ${x}`);
  if (y !== undefined) console.log(JSON.stringify(y, null, 2));
  FAIL++;
}

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
  });

  const body = await r.json().catch(() => null);
  const cookies = r.headers.getSetCookie?.() ?? [];

  if (!r.ok || !body?.success || !cookies.length) {
    throw new Error(`Login failed HTTP ${r.status}`);
  }

  return cookies.map(x => x.split(";", 1)[0]).join("; ");
}

async function req(
  method: string,
  path: string,
  cookie?: string,
  body?: unknown,
) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await r.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: r.status, data };
}

async function main() {
  console.log();
  console.log("==========================================");
  console.log("      COMPLAINTS COMPLETE TEST");
  console.log("==========================================");
  console.log();

  const cookie = await login();
  ok("Admin Login");

  const me = await req("GET", "/auth/me", cookie);

  if (me.status === 200 && me.data?.user?.id) {
    ok("Auth /me");
  } else {
    bad("Auth /me", me);
    process.exit(1);
  }

  const userId = new mongoose.Types.ObjectId(me.data.user.id);

  console.log();
  console.log("1) POST /api/complaints");

  const created = await req(
    "POST",
    "/complaints",
    cookie,
    {
      type: "order",
      title: `اختبار شكوى ${Date.now()}`,
      description: "شكوى اختبارية للتأكد من تكامل تطبيق زاجل مع الباك إند.",
    },
  );

  if (
    created.status === 201 &&
    created.data?.success === true &&
    created.data?.complaint?._id
  ) {
    ok("إنشاء الشكوى");
  } else {
    bad("إنشاء الشكوى", created);
  }

  const complaintId = created.data?.complaint?._id;

  console.log();
  console.log("2) التحقق من الحقول المحفوظة");

  if (
    created.data?.complaint?.openedBy?.toString() === userId.toString() &&
    created.data?.complaint?.category === "order" &&
    created.data?.complaint?.title
  ) {
    ok("ربط المستخدم + category + title");
  } else {
    bad("بيانات الشكوى المحفوظة", created.data?.complaint);
  }

  console.log();
  console.log("3) GET /api/complaints/my");

  const mine = await req(
    "GET",
    "/complaints/my",
    cookie,
  );

  if (
    mine.status === 200 &&
    mine.data?.success === true &&
    Array.isArray(mine.data?.complaints) &&
    mine.data.complaints.some(
      (x: any) => x._id === complaintId,
    )
  ) {
    ok("قراءة شكاوى المستخدم");
  } else {
    bad("قراءة شكاوى المستخدم", mine);
  }

  console.log();
  console.log("4) التأكد أن الشكوى ملك للمستخدم");

  const saved = await ComplaintModel.findById(complaintId).lean();

  if (
    saved &&
    saved.openedBy?.toString() === userId.toString()
  ) {
    ok("ملكية الشكوى صحيحة");
  } else {
    bad("ملكية الشكوى", saved);
  }

  console.log();
  console.log("5) حماية POST بدون Login");

  const noAuthPost = await req(
    "POST",
    "/complaints",
    undefined,
    {
      type: "order",
      title: "اختبار بدون تسجيل",
      description: "يجب رفض الطلب.",
    },
  );

  if (noAuthPost.status === 401) {
    ok("POST محمي");
  } else {
    bad("POST بدون Login", noAuthPost);
  }

  console.log();
  console.log("6) حماية GET /my بدون Login");

  const noAuthGet = await req(
    "GET",
    "/complaints/my",
  );

  if (noAuthGet.status === 401) {
    ok("GET /my محمي");
  } else {
    bad("GET /my بدون Login", noAuthGet);
  }

  console.log();
  console.log("7) رفض عنوان فارغ");

  const badTitle = await req(
    "POST",
    "/complaints",
    cookie,
    {
      type: "order",
      title: "",
      description: "تفاصيل صحيحة.",
    },
  );

  if (badTitle.status === 400) {
    ok("رفض title غير صالح");
  } else {
    bad("title validation", badTitle);
  }

  console.log();
  console.log("8) رفض description فارغ");

  const badDescription = await req(
    "POST",
    "/complaints",
    cookie,
    {
      type: "order",
      title: "عنوان صحيح",
      description: "",
    },
  );

  if (badDescription.status === 400) {
    ok("رفض description غير صالح");
  } else {
    bad("description validation", badDescription);
  }

  if (complaintId) {
    console.log();
    console.log("9) تنظيف بيانات الاختبار");

    const deleted = await ComplaintModel.deleteOne({
      _id: complaintId,
      openedBy: userId,
    });

    if (deleted.deletedCount === 1) {
      ok("تنظيف الشكوى الاختبارية");
    } else {
      bad("تنظيف الشكوى");
    }
  }

  await mongoose.connection.close();

  console.log();
  console.log("==========================================");
  console.log(`Passed: ${PASS}`);
  console.log(`Failed: ${FAIL}`);
  console.log("==========================================");
  console.log();

  if (FAIL === 0) {
    console.log("✅ COMPLAINTS COMPLETE TEST PASSED");
    process.exit(0);
  }

  console.log("❌ COMPLAINTS NEED FIXES");
  process.exit(1);
}

await connectDatabase();
await main();
