const BASE = process.env.TEST_BASE_URL || "http://localhost:4000";

const ADMIN = {
  email: "admin@dzwan.local",
  password: "Dzwan@2026_Admin",
};

let pass = 0;
let fail = 0;

function ok(name) {
  pass++;
  console.log(`✅ PASS: ${name}`);
}

function bad(name, details = "") {
  fail++;
  console.log(`❌ FAIL: ${name}`);
  if (details) console.log(details);
}

async function req(path, options = {}) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });

    let body = null;
    try {
      body = await r.json();
    } catch {}

    return { status: r.status, body, headers: r.headers };
  } catch (e) {
    return { status: 0, body: null, error: String(e) };
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
    .map(x => x.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  return {
    token: r.body?.accessToken || r.body?.token || null,
    cookie,
  };
}

function headers(session) {
  const h = {};
  if (session.token) h.Authorization = `Bearer ${session.token}`;
  if (session.cookie) h.Cookie = session.cookie;
  return h;
}

async function main() {
  console.log("\n==============================================");
  console.log(" STAFF + USERS + LEADERS COMPLETE TEST");
  console.log("==============================================\n");

  const session = await login();
  ok("Admin login");

  // -----------------------------
  // STAFF
  // -----------------------------
  let r = await req("/api/staff", {
    headers: headers(session),
  });

  if (r.status === 200) ok("List staff");
  else bad("List staff", JSON.stringify(r.body));

  // -----------------------------
  // USERS
  // -----------------------------
  r = await req("/api/users", {
    headers: headers(session),
  });

  if (r.status === 200) ok("List users");
  else bad("List users", JSON.stringify(r.body));

  // Invalid user ID must not crash
  r = await req("/api/users/not-an-object-id", {
    headers: headers(session),
  });

  if (r.status !== 500 && r.status !== 0) {
    ok("Invalid user ID handled");
  } else {
    bad(
      "Invalid user ID handled",
      `HTTP ${r.status}\n${JSON.stringify(r.body)}`
    );
  }

  // -----------------------------
  // LEADERS
  // -----------------------------
  r = await req("/api/leaders", {
    headers: headers(session),
  });

  if (r.status === 200) ok("List leaders");
  else bad("List leaders", JSON.stringify(r.body));

  r = await req("/api/leaders/not-an-object-id", {
    headers: headers(session),
  });

  if (r.status !== 500 && r.status !== 0) {
    ok("Invalid leader ID handled");
  } else {
    bad(
      "Invalid leader ID handled",
      `HTTP ${r.status}\n${JSON.stringify(r.body)}`
    );
  }

  // -----------------------------
  // AUTH PROTECTION
  // -----------------------------
  for (const [path, name] of [
    ["/api/staff", "Staff"],
    ["/api/users", "Users"],
    ["/api/leaders", "Leaders"],
  ]) {
    r = await req(path);

    if ([401, 403].includes(r.status)) {
      ok(`${name} rejects unauthenticated access`);
    } else {
      bad(
        `${name} authentication protection`,
        `HTTP ${r.status}\n${JSON.stringify(r.body)}`
      );
    }
  }

  console.log("\n==============================================");
  console.log(" STAFF + USERS + LEADERS SUMMARY");
  console.log("==============================================");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);

  if (fail === 0) {
    console.log("\n🎉 STAFF + USERS + LEADERS TEST PASSED\n");
  } else {
    console.log("\n⚠️ TEST HAS FAILURES\n");
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error("\n💥 TEST CRASHED");
  console.error(e);
  process.exitCode = 1;
});
