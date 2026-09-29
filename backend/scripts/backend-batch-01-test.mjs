const BASE_URL = "http://localhost:4000";

const ADMIN = {
  email: "admin@dzwan.local",
  password: "Dzwan@2026_Admin",
};

const DELAY_MS = 8000;

let pass = 0;
let fail = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function req(path, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
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
      body = await response.json();
    } catch {}

    return {
      status: response.status,
      body,
      headers: response.headers,
    };
  } catch (error) {
    return {
      status: 0,
      body: null,
      headers: new Headers(),
      error: error instanceof Error ? error.message : String(error),
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
      `Admin login failed: ${r.status}\n${JSON.stringify(r.body)}`
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
    throw new Error(
      `Login succeeded but no session found:\n${JSON.stringify(r.body)}`
    );
  }

  return {
    cookie,
    token,
  };
}

function authHeaders(session) {
  const headers = {};

  if (session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  if (session.cookie) {
    headers.Cookie = session.cookie;
  }

  return headers;
}

async function expectStatus(name, path, expected, session, options = {}) {
  const r = await req(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders(session),
    },
  });

  if (r.status === expected) {
    console.log(`✅ PASS: ${name} -> HTTP ${r.status}`);
    pass++;
    return true;
  }

  console.log(`❌ FAIL: ${name}`);
  console.log(`   Expected: HTTP ${expected}`);
  console.log(`   Received: HTTP ${r.status}`);
  if (r.body) console.log(`   Body: ${JSON.stringify(r.body)}`);
  if (r.error) console.log(`   Error: ${r.error}`);
  fail++;
  return false;
}

async function test(name, fn) {
  try {
    await fn();
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(error instanceof Error ? error.message : String(error));
    fail++;
  }
}

async function attendance(session) {
  console.log("\n### 1. ATTENDANCE");

  await expectStatus(
    "Attendance unauthenticated",
    "/api/captain-attendance/me",
    401,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Attendance authenticated",
    "/api/captain-attendance/me",
    200,
    session,
  );

  await expectStatus(
    "Attendance missing check-in data handled",
    "/api/captain-attendance/check-in",
    400,
    session,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

async function documents(session) {
  console.log("\n### 2. DOCUMENTS");

  await expectStatus(
    "Documents unauthenticated",
    "/api/captain-documents/me",
    401,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Documents authenticated",
    "/api/captain-documents/me",
    200,
    session,
  );

  await expectStatus(
    "Documents invalid ID handled",
    "/api/captain-documents/not-an-object-id/review",
    400,
    session,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "approved",
      }),
    },
  );
}

async function workAreas(session) {
  console.log("\n### 3. WORK AREAS");

  await expectStatus(
    "Work Areas unauthenticated",
    "/api/captain-work-areas/me",
    401,
    { cookie: "", token: null },
    { method: "GET" },
  );

  await expectStatus(
    "Work Areas authenticated",
    "/api/captain-work-areas/me",
    200,
    session,
    { method: "GET" },
  );

  await expectStatus(
    "Work Areas invalid ID handled",
    "/api/captain-work-areas/not-an-object-id",
    400,
    session,
    { method: "GET" },
  );
}

async function ledger(session) {
  console.log("\n### 4. LEDGER");

  await expectStatus(
    "Ledger unauthenticated",
    "/api/captain-ledger/me",
    401,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Ledger authenticated",
    "/api/captain-ledger/me",
    200,
    session,
  );

  await expectStatus(
    "Ledger invalid ID handled",
    "/api/captain-ledger/not-an-object-id",
    400,
    session,
  );
}

async function notifications(session) {
  console.log("\n### 5. NOTIFICATIONS");

  await expectStatus(
    "Notifications unauthenticated",
    "/api/notifications",
    401,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Notifications authenticated",
    "/api/notifications",
    200,
    session,
  );

  await expectStatus(
    "Notification invalid ID handled",
    "/api/notifications/not-an-object-id/read",
    400,
    session,
    { method: "PATCH", body: JSON.stringify({}) },
  );
}

async function auditLogs(session) {
  console.log("\n### 6. AUDIT LOGS");

  await expectStatus(
    "Audit Logs unauthenticated",
    "/api/audit-logs",
    401,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Audit Logs authenticated",
    "/api/audit-logs",
    200,
    session,
  );

  await expectStatus(
    "Audit Logs invalid ID handled",
    "/api/audit-logs/not-an-object-id",
    400,
    session,
  );
}

async function support(session) {
  console.log("\n### 7. SUPPORT");

  await expectStatus(
    "Support unauthenticated",
    "/support",
    200,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Support authenticated",
    "/support",
    200,
    session,
  );
}

async function offers(session) {
  console.log("\n### 8. OFFERS");

  await expectStatus(
    "Offers unauthenticated",
    "/api/offers",
    200,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Offers authenticated",
    "/api/offers",
    200,
    session,
  );

  await expectStatus(
    "Offers invalid ID handled",
    "/api/offers/not-an-object-id",
    400,
    session,
    { method: "PATCH", body: JSON.stringify({}) },
  );
}

async function rewards(session) {
  console.log("\n### 9. REWARDS");

  await expectStatus(
    "Rewards unauthenticated",
    "/rewards",
    200,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Rewards authenticated",
    "/rewards",
    200,
    session,
  );

  await expectStatus(
    "Rewards invalid ID handled",
    "/rewards/not-an-object-id",
    400,
    session,
    { method: "PATCH", body: JSON.stringify({}) },
  );
}

async function deliveryPriceOverrides(session) {
  console.log("\n### 10. DELIVERY PRICE OVERRIDES");

  await expectStatus(
    "Delivery Price Overrides unauthenticated",
    "/delivery-price-overrides",
    401,
    { cookie: "", token: null },
  );

  await expectStatus(
    "Delivery Price Overrides authenticated",
    "/delivery-price-overrides",
    200,
    session,
  );

  await expectStatus(
    "Delivery Price Override invalid ID handled",
    "/delivery-price-overrides/not-an-object-id",
    400,
    session,
    { method: "PATCH", body: JSON.stringify({}) },
  );
}

async function main() {
  console.log("\n=================================================");
  console.log("       BACKEND BATCH 01 - 10 TESTS");
  console.log("=================================================\n");

  const session = await login();

  console.log("✅ PASS: Admin login");
  pass++;

  const suites = [
    ["Attendance", attendance],
    ["Documents", documents],
    ["Work Areas", workAreas],
    ["Ledger", ledger],
    ["Notifications", notifications],
    ["Audit Logs", auditLogs],
    ["Support", support],
    ["Offers", offers],
    ["Rewards", rewards],
    ["Delivery Price Overrides", deliveryPriceOverrides],
  ];

  for (let i = 0; i < suites.length; i++) {
    const [name, fn] = suites[i];

    console.log(`\n\n===============================================`);
    console.log(`[${i + 1}/10] ${name}`);
    console.log(`===============================================`);

    await test(name, () => fn(session));

    if (i < suites.length - 1) {
      console.log("\n⏳ استراحة 8 ثواني للسيرفر...");
      await sleep(DELAY_MS);
    }
  }

  console.log("\n\n=================================================");
  console.log("                 BATCH 01 SUMMARY");
  console.log("=================================================");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);
  console.log("=================================================");

  if (fail === 0) {
    console.log("\n🎉 BATCH 01 PASSED");
  } else {
    console.log("\n⚠️ BATCH 01 HAS FAILURES");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exitCode = 1;
});
