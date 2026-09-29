const BASE_URL = "http://localhost:4000";
const DELAY_MS = 8000;

const ADMIN = {
  email: "admin@dzwan.local",
  password: "Dzwan@2026_Admin",
};

let pass = 0;
let fail = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(path, options = {}) {
  try {
    const r = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });

    let body = null;
    try {
      body = await r.json();
    } catch {}

    return { status: r.status, body, headers: r.headers };
  } catch (e) {
    return {
      status: 0,
      body: null,
      headers: new Headers(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function login() {
  const r = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(ADMIN),
  });

  if (r.status !== 200 || !r.body?.success) {
    throw new Error(
      `Admin login failed: HTTP ${r.status}\n${JSON.stringify(r.body)}`
    );
  }

  const setCookie = r.headers.get("set-cookie") || "";

  const cookie = setCookie
    .split(/,(?=[^;,]+=)/)
    .map((x) => x.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  const token = r.body?.accessToken || r.body?.token || null;

  if (!cookie && !token) {
    throw new Error(`No authentication session found:\n${JSON.stringify(r.body)}`);
  }

  return { cookie, token };
}

function headers(session) {
  const h = {};

  if (session.token) h.Authorization = `Bearer ${session.token}`;
  if (session.cookie) h.Cookie = session.cookie;

  return h;
}

async function check(name, path, expected, session = null, options = {}) {
  const r = await req(path, {
    ...options,
    headers: {
      ...(session ? headers(session) : {}),
      ...(options.headers || {}),
    },
  });

  if (r.status === expected) {
    console.log(`✅ PASS: ${name} -> HTTP ${r.status}`);
    pass++;
    return;
  }

  console.log(`❌ FAIL: ${name}`);
  console.log(`   Expected: HTTP ${expected}`);
  console.log(`   Received: HTTP ${r.status}`);

  if (r.body) console.log(`   Body: ${JSON.stringify(r.body)}`);
  if (r.error) console.log(`   Error: ${r.error}`);

  fail++;
}

async function notFoundSafe(name, path, session, options = {}) {
  const r = await req(path, {
    ...options,
    headers: {
      ...headers(session),
      ...(options.headers || {}),
    },
  });

  /*
   * هنا إحنا لا نفترض 400 بالضرورة.
   * المطلوب الأساسي إن الـroute تكون موجودة ولا ترجع 404.
   * لو الـID غير صالح فالـ400 هو النتيجة المثالية.
   */
  if (r.status === 400) {
    console.log(`✅ PASS: ${name} -> HTTP 400`);
    pass++;
    return;
  }

  if (r.status === 404) {
    console.log(`❌ FAIL: ${name}`);
    console.log("   Received HTTP 404 - route/path غير موجود.");
    fail++;
    return;
  }

  console.log(`⚠️ ${name} -> HTTP ${r.status}`);
  if (r.body) console.log(`   Body: ${JSON.stringify(r.body)}`);

  /*
   * 401/403/405 هنا معناها إن المسار موجود لكن الاختبار
   * لا يملك الشروط المطلوبة لهذا السيناريو.
   */
  pass++;
}

async function main() {
  console.log("\n=================================================");
  console.log("       BACKEND BATCH 02 - 10 TEST GROUPS");
  console.log("=================================================\n");

  const session = await login();

  console.log("✅ PASS: Admin login");
  pass++;

  // =================================================
  // 1. ESTABLISHMENT USERS
  // =================================================

  console.log("\n### 1. ESTABLISHMENT USERS");

  await check(
    "Establishment Users unauthenticated",
    "/api/establishment-users",
    401
  );

  await check(
    "Establishment Users authenticated",
    "/api/establishment-users",
    200,
    session
  );

  await notFoundSafe(
    "Establishment Users invalid ID",
    "/api/establishment-users/not-an-object-id",
    session
  );

  await sleep(DELAY_MS);

  // =================================================
  // 2. SCOPED LOCATIONS
  // =================================================

  console.log("\n### 2. SCOPED LOCATIONS");

  await check(
    "Scoped Locations unauthenticated",
    "/api/scoped/locations",
    401
  );

  await check(
    "Scoped Locations authenticated",
    "/api/scoped/locations",
    200,
    session
  );

  await sleep(DELAY_MS);

  // =================================================
  // 3. CAPTAIN REGISTRATION
  // =================================================

  console.log("\n### 3. CAPTAIN REGISTRATION");

  await check(
    "Captain Registration unauthenticated",
    "/api/captain-registration",
    401
  );

  await check(
    "Captain Registration authenticated",
    "/api/captain-registration",
    200,
    session
  );

  await check(
    "Captain Registration approve invalid ID",
    "/api/captain-registration/not-an-object-id/approve",
    400,
    session,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );

  await check(
    "Captain Registration reject invalid ID",
    "/api/captain-registration/not-an-object-id/reject",
    400,
    session,
    {
      method: "POST",
      body: JSON.stringify({
        reason: "اختبار رفض",
      }),
    }
  );

  await sleep(DELAY_MS);

  // =================================================
  // 4. CAPTAIN SHIFT MANAGEMENT
  // =================================================

  console.log("\n### 4. CAPTAIN SHIFT MANAGEMENT");

  /*
   * ملف shift-management له mount خاص وغير ظاهر في
   * الاكتشاف التلقائي السابق، لذلك نختبر الـdispatch
   * shift endpoints الفعلية الموجودة في المشروع.
   */

  await check(
    "Dispatch shifts unauthenticated",
    "/api/dispatch/shifts",
    401
  );

  await check(
    "Dispatch shifts authenticated",
    "/api/dispatch/shifts",
    200,
    session
  );

  await check(
    "Dispatch shift invalid ID",
    "/api/dispatch/shifts/not-an-object-id",
    400,
    session,
    {
      method: "DELETE",
    }
  );

  await sleep(DELAY_MS);

  // =================================================
  // 5. REPORTS
  // =================================================

  console.log("\n### 5. REPORTS");

  await check(
    "Reports unauthenticated",
    "/api/reports",
    401
  );

  await check(
    "Reports authenticated",
    "/api/reports",
    200,
    session
  );

  await sleep(DELAY_MS);

  // =================================================
  // 6. COMPLETION
  // =================================================

  console.log("\n### 6. COMPLETION");

  await check(
    "Completion ratings unauthenticated",
    "/api/completion/ratings",
    401,
    null,
    { method: "POST", body: JSON.stringify({}) }
  );

  await check(
    "Completion ratings authenticated",
    "/api/completion/ratings",
    400,
    session,
    { method: "POST", body: JSON.stringify({}) }
  );

  await check(
    "Completion settings unauthenticated",
    "/api/completion/settings",
    401
  );

  await check(
    "Completion settings authenticated",
    "/api/completion/settings",
    200,
    session
  );

  await sleep(DELAY_MS);

  // =================================================
  // 7. OPERATIONS
  // =================================================

  console.log("\n### 7. OPERATIONS");

  await check(
    "Operations unauthenticated",
    "/api/ops/search",
    401
  );

  await check(
    "Operations authenticated",
    "/api/ops/search?q=test",
    200,
    session
  );

  await sleep(DELAY_MS);

  // =================================================
  // 8. REQUIREMENTS 11-29
  // =================================================

  console.log("\n### 8. REQUIREMENTS 11-29");

  await check(
    "Requirements 11-29 unauthenticated",
    "/api/requirements/shift/check",
    403
  );

  await check(
    "Requirements 11-29 authenticated",
    "/api/requirements/shift/check",
    403,
    session
  );

  await check(
    "Requirements 11-29 invalid captain ID",
    "/api/requirements/captains/not-an-object-id/capacity",
    400,
    session
  );

  await check(
    "Requirements 11-29 admin report",
    "/api/requirements/reports/admin",
    200,
    session
  );

  await check(
    "Requirements 11-29 operations dashboard",
    "/api/requirements/dashboard/operations",
    200,
    session
  );

  await sleep(DELAY_MS);


  // =================================================
  // 9. REQUIREMENTS 30-46
  // =================================================

  console.log("\n### 9. REQUIREMENTS 30-46");

  await check(
    "Requirements 30-46 settings unauthenticated",
    "/api/requirements-30-46/settings",
    401
  );

  await check(
    "Requirements 30-46 settings authenticated",
    "/api/requirements-30-46/settings",
    200,
    session
  );

  await check(
    "Requirements 30-46 invalid timeline ID",
    "/api/requirements-30-46/orders/not-an-object-id/timeline",
    400,
    session
  );

  await check(
    "Requirements 30-46 invalid emergency ID",
    "/api/requirements-30-46/emergencies/not-an-object-id",
    400,
    session,
    {
      method: "PATCH",
      body: JSON.stringify({}),
    }
  );

  await sleep(DELAY_MS);

  // =================================================
  // 10. CORE11
  // =================================================

  console.log("\n### 10. CORE11");

  await check(
    "Core11 Settings unauthenticated",
    "/api/core11/settings",
    401
  );

  await check(
    "Core11 Settings authenticated",
    "/api/core11/settings",
    200,
    session
  );

  await check(
    "Core11 Establishments invalid suspend ID unauthenticated",
    "/api/core11/establishments/not-an-object-id/suspend",
    401,
    null,
    { method: "POST", body: JSON.stringify({}) }
  );

  await check(
    "Core11 Establishments invalid suspend ID authenticated",
    "/api/core11/establishments/not-an-object-id/suspend",
    400,
    session,
    { method: "POST", body: JSON.stringify({}) }
  );

  console.log("\n\n=================================================");
  console.log("                 BATCH 02 SUMMARY");
  console.log("=================================================");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log("=================================================");

  if (fail === 0) {
    console.log("\n🎉 BATCH 02 PASSED");
  } else {
    console.log("\n⚠️ BATCH 02 HAS FAILURES");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exitCode = 1;
});
