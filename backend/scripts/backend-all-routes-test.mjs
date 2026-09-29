import fs from "node:fs";
import path from "node:path";

const BASE = process.env.TEST_BASE_URL || "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let passCount = 0;
let failCount = 0;
let skipCount = 0;

const routeFilesDir = path.resolve("src/routes");
const serverFile = path.resolve("src/server.ts");

function pass(name) {
  passCount++;
  console.log(`✅ PASS: ${name}`);
}

function fail(name, details = "") {
  failCount++;
  console.log(`❌ FAIL: ${name}`);
  if (details) console.log(details);
}

function skip(name, details = "") {
  skipCount++;
  console.log(`⚪ SKIP: ${name}${details ? ` — ${details}` : ""}`);
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
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
      ok: true,
      status: response.status,
      body,
      headers: response.headers,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: null,
      headers: new Headers(),
      error,
    };
  }
}

function extractSetCookie(headers) {
  const raw = headers.get("set-cookie");
  if (!raw) return "";

  return raw
    .split(/,(?=[^;,]+=)/)
    .map((x) => x.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function adminLogin() {
  const r = await fetchJson(`${BASE}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!r.ok) {
    throw new Error(`Login network error: ${String(r.error)}`);
  }

  if (r.status !== 200 || !r.body?.success) {
    throw new Error(
      `Login failed: HTTP ${r.status}\n${JSON.stringify(r.body)}`
    );
  }

  return {
    cookies: extractSetCookie(r.headers),
    token: r.body?.accessToken || r.body?.token || null,
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

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function discoverMounts() {
  const server = readText(serverFile);
  const mounts = [];

  /*
   * Handles forms such as:
   * app.use("/api/staff", staffRoutes)
   * app.use("/api/staff", staffRouter)
   * router mounting with optional whitespace.
   */
  const re =
    /(?:app|server)\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z0-9_]+)\s*\)/g;

  let match;

  while ((match = re.exec(server))) {
    mounts.push({
      prefix: match[1],
      variable: match[2],
    });
  }

  /*
   * Fallback for multiline / slightly different formatting.
   */
  const re2 =
    /(?:app|server)\.use\(\s*["'`]([^"'`]+)["'`]\s*,/g;

  while ((match = re2.exec(server))) {
    if (!mounts.some((x) => x.prefix === match[1])) {
      mounts.push({
        prefix: match[1],
        variable: null,
      });
    }
  }

  return mounts;
}

function discoverRouteFiles() {
  if (!fs.existsSync(routeFilesDir)) return [];

  return fs
    .readdirSync(routeFilesDir)
    .filter((f) => f.endsWith(".ts"))
    .sort()
    .map((f) => ({
      name: f,
      file: path.join(routeFilesDir, f),
      text: readText(path.join(routeFilesDir, f)),
    }));
}

function discoverRouterRoutes(routeFile) {
  const routes = [];

  const re =
    /\brouter\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/gi;

  let match;

  while ((match = re.exec(routeFile.text))) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: routeFile.name,
    });
  }

  return routes;
}

function substituteParams(routePath) {
  return routePath.replace(
    /:([A-Za-z0-9_]+)/g,
    (_, name) => {
      if (/id$/i.test(name)) return "not-an-object-id";
      if (/customer/i.test(name)) return "not-an-object-id";
      if (/captain/i.test(name)) return "not-an-object-id";
      if (/establishment/i.test(name)) return "not-an-object-id";
      return "not-found";
    }
  );
}

function normalizePath(prefix, routePath) {
  let p = `${prefix}/${routePath}`.replace(/\/+/g, "/");

  if (!p.startsWith("/")) p = `/${p}`;

  if (p.endsWith("/") && p.length > 1) {
    p = p.slice(0, -1);
  }

  return p;
}

function routeExpectedStatus(method, status) {
  /*
   * 500 is never acceptable for the generic route-contract test.
   *
   * Valid outcomes include:
   * 200/201/204 -> successful endpoint
   * 400          -> validation
   * 401/403      -> auth/scope
   * 404          -> resource does not exist
   * 405          -> method unsupported by framework
   * 409          -> conflict
   */
  return status !== 500 && status !== 0;
}

async function testUnauthenticated(path, method) {
  const options = {
    method,
  };

  if (method === "POST" ||
      method === "PATCH" ||
      method === "PUT") {
    options.body = JSON.stringify({});
  }

  const r = await fetchJson(`${BASE}${path}`, options);

  if (!r.ok) {
    fail(
      `${method} ${path} unauthenticated network`,
      String(r.error)
    );
    return;
  }

  if (routeExpectedStatus(method, r.status)) {
    pass(
      `${method} ${path} unauthenticated -> HTTP ${r.status}`
    );
  } else {
    fail(
      `${method} ${path} unauthenticated`,
      `HTTP ${r.status}\n${JSON.stringify(r.body)}`
    );
  }
}

async function testAuthenticated(path, method, session) {
  const options = {
    method,
    headers: authHeaders(session),
  };

  /*
   * For mutation endpoints, intentionally send an empty object.
   * The goal here is to verify schema/permission handling and make
   * sure invalid input does not crash the process.
   */
  if (
    method === "POST" ||
    method === "PATCH" ||
    method === "PUT"
  ) {
    options.headers = {
      ...options.headers,
      "Content-Type": "application/json",
    };

    options.body = JSON.stringify({});
  }

  const r = await fetchJson(`${BASE}${path}`, options);

  if (!r.ok) {
    fail(
      `${method} ${path} network`,
      String(r.error)
    );
    return;
  }

  if (r.status !== 500) {
    pass(
      `${method} ${path} authenticated -> HTTP ${r.status}`
    );
  } else {
    fail(
      `${method} ${path} authenticated`,
      `HTTP 500\n${JSON.stringify(r.body)}`
    );
  }
}

async function main() {
  console.log("\n==================================================");
  console.log("        ZAJEL / DZWAN ALL ROUTES TEST");
  console.log("==================================================\n");

  if (!fs.existsSync(serverFile)) {
    throw new Error(`لم يتم العثور على ${serverFile}`);
  }

  if (!fs.existsSync(routeFilesDir)) {
    throw new Error(`لم يتم العثور على ${routeFilesDir}`);
  }

  let session;

  try {
    session = await adminLogin();
    pass("Admin login for route test");
  } catch (error) {
    fail("Admin login for route test", String(error));
    printSummary();
    process.exitCode = 1;
    return;
  }

  const mounts = discoverMounts();
  const routeFiles = discoverRouteFiles();

  console.log(`\n📦 Route files discovered: ${routeFiles.length}`);
  console.log(`📌 Server mounts discovered: ${mounts.length}\n`);

  if (!routeFiles.length) {
    fail("Route discovery", "لا توجد ملفات routes");
    printSummary();
    process.exitCode = 1;
    return;
  }

  /*
   * Map route variable -> prefix when possible.
   */
  const variableToPrefix = new Map();

  for (const mount of mounts) {
    if (mount.variable) {
      variableToPrefix.set(
        mount.variable.toLowerCase(),
        mount.prefix
      );
    }
  }

  let testedRoutes = 0;

  for (const routeFile of routeFiles) {
    const discovered = discoverRouterRoutes(routeFile);

    if (!discovered.length) {
      skip(
        routeFile.name,
        "لا توجد router.get/post/patch/delete مباشرة في الملف"
      );
      continue;
    }

    /*
     * Try to identify this route file's mount prefix.
     */
    const baseName = routeFile.name
      .replace(/\.routes\.ts$/i, "")
      .replace(/\.route\.ts$/i, "")
      .toLowerCase();

    let prefix =
      variableToPrefix.get(`${baseName}routes`) ||
      variableToPrefix.get(`${baseName}router`) ||
      null;

    if (!prefix) {
      const candidate = mounts.find((m) =>
        String(m.prefix)
          .toLowerCase()
          .includes(`/${baseName}`)
      );

      prefix = candidate?.prefix || null;
    }

    if (!prefix) {
      skip(
        routeFile.name,
        "تعذر ربط ملف الراوت بالـmount تلقائيًا"
      );
      continue;
    }

    console.log(
      `\n### ${routeFile.name} -> ${prefix}`
    );

    for (const route of discovered) {
      const testPath = normalizePath(
        prefix,
        substituteParams(route.path)
      );

      testedRoutes++;

      /*
       * First verify unauthenticated behavior.
       */
      await testUnauthenticated(
        testPath,
        route.method
      );

      /*
       * Then verify authenticated behavior.
       */
      await testAuthenticated(
        testPath,
        route.method,
        session
      );
    }
  }

  console.log(`\n📊 Routes actually tested: ${testedRoutes}`);

  /*
   * Explicit checks for the known major modules.
   */
  const keyEndpoints = [
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
    ["/api/dispatch/settings", "Dispatch"],
    ["/api/captain-registration", "Captain Registration"],
    ["/api/captain-attendance", "Captain Attendance"],
    ["/api/captain-documents", "Captain Documents"],
    ["/api/captain-work-areas", "Captain Work Areas"],
    ["/api/captain-ledger", "Captain Ledger"],
    ["/api/reports", "Reports"],
    ["/api/completion", "Completion"],
    ["/api/ops", "Operations"],
    ["/api/offers", "Offers"],
    ["/api/rewards", "Rewards"],
    ["/delivery-price-overrides", "Delivery Price Overrides"],
    ["/app-branding", "App Branding"],
    ["/app-update", "App Update"],
    ["/app-theme/active", "App Theme"],
    ["/api/core11/settings", "Core11 Settings"],
    ["/api/core11/establishments", "Core11 Establishments"],
    ["/api/requirements", "Requirements"],
    [
      "/api/requirements-30-46/geofence/resolve?lat=30.0444&lng=31.2357",
      "Geofence Resolver",
    ],
  ];

  console.log("\n### Explicit module smoke checks");

  for (const [path, name] of keyEndpoints) {
    const r = await fetchJson(`${BASE}${path}`, {
      headers: authHeaders(session),
    });

    if (!r.ok) {
      fail(`${name} network`, String(r.error));
      continue;
    }

    if (r.status !== 500) {
      pass(`${name} smoke -> HTTP ${r.status}`);
    } else {
      fail(
        `${name} smoke`,
        `HTTP 500\n${JSON.stringify(r.body)}`
      );
    }
  }

  printSummary();
}

function printSummary() {
  console.log("\n==================================================");
  console.log("          ALL ROUTES TEST SUMMARY");
  console.log("==================================================");
  console.log(`✅ PASS: ${passCount}`);
  console.log(`❌ FAIL: ${failCount}`);
  console.log(`⚪ SKIP: ${skipCount}`);
  console.log("==================================================");

  if (failCount === 0) {
    console.log("\n🎉 ALL DISCOVERED ROUTES PASSED CONTRACT TEST\n");
  } else {
    console.log("\n⚠️ ROUTE CONTRACT TEST HAS FAILURES\n");
  }
}

main().catch((error) => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exitCode = 1;
});
