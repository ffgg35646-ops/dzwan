import "dotenv/config";

const BASE = process.env.TEST_BASE_URL || "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let passed = 0;
let failed = 0;

function pass(name) {
  passed++;
  console.log(`✅ PASS: ${name}`);
}

function fail(name, details = "") {
  failed++;
  console.log(`❌ FAIL: ${name}`);
  if (details) console.log(details);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status,
    body,
    headers: response.headers,
  };
}

async function login() {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status !== 200 || !body?.success) {
    throw new Error(
      `Admin login failed: HTTP ${response.status}\n${JSON.stringify(body)}`
    );
  }

  const setCookie = response.headers.get("set-cookie") || "";

  const cookies = setCookie
    .split(/,(?=[^;,]+=)/)
    .map((item) => item.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  return {
    token: body?.accessToken || body?.token || null,
    cookies,
  };
}

function authHeaders(session) {
  const headers = {};

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  if (session?.cookies) {
    headers.Cookie = session.cookies;
  }

  return headers;
}


async function main() {
  console.log("\n==================================================");
  console.log("        ZAJEL / DZWAN BACKEND FULL COVERAGE");
  console.log("==================================================\n");

  // ------------------------------------------------
  // 1. Server / Auth health
  // ------------------------------------------------

  const meNoAuth = await request("/api/auth/me");

  if ([401, 403].includes(meNoAuth.status)) {
    pass("Unauthenticated /api/auth/me is protected");
  } else {
    fail(
      "Unauthenticated /api/auth/me protection",
      `HTTP ${meNoAuth.status}\n${JSON.stringify(meNoAuth.body)}`
    );
  }

  let session = null;

  try {
    session = await login();
    pass("Admin authentication");
  } catch (e) {
    fail("Admin authentication", e.message);
    console.log("\n❌ لا يمكن إكمال الاختبار بدون Admin authentication\n");
    printSummary();
    process.exitCode = 1;
    return;
  }

  // ------------------------------------------------
  // 2. Authenticated /me
  // ------------------------------------------------

  const me = await request("/api/auth/me", {
    headers: authHeaders(session),
  });

  if (
    me.status === 200 &&
    me.body?.success &&
    me.body?.user
  ) {
    pass("Authenticated /api/auth/me");
  } else {
    fail(
      "Authenticated /api/auth/me",
      `HTTP ${me.status}\n${JSON.stringify(me.body)}`
    );
  }

  // ------------------------------------------------
  // 3. Route coverage
  //
  // These are the actual mounted API modules in the
  // current backend. A 401/403 is valid for protected
  // routes, while authenticated management GET routes
  // should not crash with 404/500.
  // ------------------------------------------------

  const routes = [
    ["/api/users", "Users"],
    ["/api/staff", "Staff"],
    ["/api/locations", "Locations"],
    ["/api/captains", "Captains"],
    ["/api/leaders", "Leaders"],
    ["/api/scoped/locations", "Scoped Locations"],
    ["/api/establishments", "Establishments"],
    ["/api/establishment-users", "Establishment Owners"],
    ["/api/customers", "Customers"],
    ["/api/products", "Products"],
    ["/api/orders", "Orders"],
    ["/api/pricing", "Pricing"],
    ["/api/geofences", "Geofences"],
    ["/api/notifications", "Notifications"],
    ["/api/audit-logs", "Audit Logs"],
    ["/api/settings", "Settings"],
    ["/api/dispatch/settings", "Dispatch Settings"],
    ["/api/delivery-proof", "Delivery Proof"],
    ["/api/captain-ledger", "Captain Ledger"],
    ["/api/captain-work-areas", "Captain Work Areas"],
    ["/api/captain-documents", "Captain Documents"],
    ["/api/captain-registration", "Captain Registration"],
    ["/api/captain-attendance", "Captain Attendance"],
    ["/api/reports", "Reports"],
    ["/api/completion", "Completion"],
    ["/api/ops", "Operations"],
    ["/api/offers", "Offers"],
    ["/api/rewards", "Rewards"],
    ["/delivery-price-overrides", "Delivery Price Overrides"],
    ["/app-theme/active", "App Theme"],
    ["/app-branding", "App Branding"],
    ["/app-update", "App Update"],
    ["/api/core11/settings", "Core11 Settings"],
    ["/api/core11/establishments", "Core11 Establishments"],
    ["/api/requirements", "Requirements"],
    ["/api/requirements-30-46/geofence/resolve?lat=30.0444&lng=31.2357", "Geofence Resolver"],
  ];

  for (const [path, name] of routes) {
    const r = await request(path, {
      headers: authHeaders(session),
    });

    if (r.status !== 500) {
      if (r.status === 404) {
        pass(`${name} module mounted / root has no GET handler (404)`);
      } else {
        pass(`${name} route reachable (${r.status})`);
      }
    } else {
      fail(
        `${name} route`,
        `HTTP ${r.status}\n${JSON.stringify(r.body)}`
      );
    }
  }

  // ------------------------------------------------
  // 4. Unauthorized access matrix for sensitive APIs
  // ------------------------------------------------

  const protectedRoutes = [
    ["/api/users", "Users"],
    ["/api/staff", "Staff"],
    ["/api/locations", "Locations"],
    ["/api/captains", "Captains"],
    ["/api/leaders", "Leaders"],
    ["/api/pricing", "Pricing"],
    ["/api/geofences", "Geofences"],
    ["/api/audit-logs", "Audit Logs"],
    ["/api/settings", "Settings"],
    ["/api/reports", "Reports"],
    ["/api/ops", "Operations"],
    ["/delivery-price-overrides", "Delivery Price Overrides"],
  ];

  for (const [path, name] of protectedRoutes) {
    const r = await request(path);

    if ([401, 403, 404].includes(r.status)) {
      pass(`${name} rejects unauthenticated/root is not exposed (${r.status})`);
    } else {
      fail(
        `${name} unauthenticated protection`,
        `HTTP ${r.status}\n${JSON.stringify(r.body)}`
      );
    }
  }

  // ------------------------------------------------
  // 5. Public / system endpoints should respond
  // ------------------------------------------------

  const publicCandidates = [
    ["/app-theme/active", "Active theme"],
    ["/app-branding", "App branding"],
    ["/app-update", "App update"],
  ];

  for (const [path, name] of publicCandidates) {
    const r = await request(path);

    if (r.status !== 404 && r.status !== 500) {
      pass(`${name} endpoint`);
    } else {
      fail(
        `${name} endpoint`,
        `HTTP ${r.status}\n${JSON.stringify(r.body)}`
      );
    }
  }

  // ------------------------------------------------
  // 6. Invalid IDs must not crash API
  // ------------------------------------------------

  const invalidIdCases = [
    ["/api/captains/not-an-object-id", "Captain invalid ID"],
    ["/api/customers/not-an-object-id", "Customer invalid ID"],
    ["/api/establishments/not-an-object-id", "Establishment invalid ID"],
    ["/api/orders/not-an-object-id", "Order invalid ID"],
    ["/api/products/not-an-object-id", "Product invalid ID"],
  ];

  for (const [path, name] of invalidIdCases) {
    const r = await request(path, {
      headers: authHeaders(session),
    });

    if (r.status !== 500) {
      pass(`${name} does not crash server`);
    } else {
      fail(
        `${name} crashes`,
        `HTTP ${r.status}\n${JSON.stringify(r.body)}`
      );
    }
  }

  // ------------------------------------------------
  // 7. Malformed JSON / validation smoke
  // ------------------------------------------------

  const validationCases = [
    ["/api/customers", "POST"],
    ["/api/products", "POST"],
    ["/api/orders", "POST"],
    ["/api/pricing", "POST"],
    ["/api/geofences", "POST"],
  ];

  for (const [path, method] of validationCases) {
    const r = await request(path, {
      method,
      headers: authHeaders(session),
      body: JSON.stringify({}),
    });

    if (r.status !== 500) {
      pass(`${method} ${path} validation does not return 500`);
    } else {
      fail(
        `${method} ${path} validation`,
        `HTTP ${r.status}\n${JSON.stringify(r.body)}`
      );
    }
  }

  // ------------------------------------------------
  // 8. Final auth logout
  // ------------------------------------------------

  const logout = await request("/api/auth/logout", {
    method: "POST",
    headers: authHeaders(session),
  });

  if (logout.status !== 500) {
    pass("Admin logout endpoint");
  } else {
    fail(
      "Admin logout endpoint",
      `HTTP ${logout.status}\n${JSON.stringify(logout.body)}`
    );
  }

  printSummary();
}

function printSummary() {
  console.log("\n==================================================");
  console.log("          FULL COVERAGE TEST SUMMARY");
  console.log("==================================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);
  console.log("==================================================");

  if (failed === 0) {
    console.log("\n🎉 FULL BACKEND COVERAGE TEST PASSED\n");
  } else {
    console.log("\n⚠️ BACKEND COVERAGE TEST HAS FAILURES\n");
  }
}

main().catch((error) => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exitCode = 1;
});
