const BASE = "http://localhost:4000";

const EMAIL = "admin@dzwan.local";
const PASSWORD = "Dzwan@2026_Admin";

let pass = 0;
let fail = 0;

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD
    })
  });

  const body = await res.json();
  const cookies = res.headers.getSetCookie?.() ?? [];

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(
      `Admin login failed: ${JSON.stringify(body)}`
    );
  }

  return cookies
    .map(v => v.split(";", 1)[0])
    .join("; ");
}

async function get(path, cookies) {
  const res = await fetch(BASE + path, {
    headers: {
      Cookie: cookies
    }
  });

  const text = await res.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return {
    status: res.status,
    body
  };
}

function test(name, result, accepted = [200]) {
  const good = accepted.includes(result.status);

  if (good) {
    pass++;
    console.log(`✅ PASS ${name} [${result.status}]`);
  } else {
    fail++;
    console.log(
      `❌ FAIL ${name} [${result.status}]`
    );
    console.log(
      JSON.stringify(result.body)
    );
  }
}

async function main() {
  console.log("\n======================================");
  console.log(" ADMIN READ-ONLY AUDIT");
  console.log("======================================");

  const cookies = await login();

  console.log("\n========== AUTH ==========");

  let r = await get(
    "/api/auth/me",
    cookies
  );

  test("Admin /me", r);

  console.log("\n========== CORE ADMIN DATA ==========");

  test(
    "Users",
    await get("/api/users", cookies)
  );

  test(
    "Users duplicate route",
    await get("/api/users?limit=20", cookies)
  );

  test(
    "Captains",
    await get("/api/captains", cookies)
  );

  test(
    "Establishments",
    await get("/api/establishments", cookies)
  );

  test(
    "Establishment owners",
    await get("/api/establishment-users", cookies)
  );

  test(
    "Customers",
    await get("/api/customers", cookies)
  );

  test(
    "Locations",
    await get("/api/locations", cookies)
  );

  test(
    "Pricing",
    await get("/api/pricing", cookies)
  );

  test(
    "Geofences",
    await get("/api/geofences", cookies)
  );

  test(
    "Orders",
    await get("/api/orders", cookies)
  );

  test(
    "Reports",
    await get("/api/reports", cookies)
  );

  test(
    "Settings",
    await get("/api/settings", cookies)
  );

  test(
    "System settings",
    await get("/api/system-settings/", cookies)
  );

  test(
    "Dispatch settings",
    await get("/api/dispatch/settings", cookies)
  );

  test(
    "Notifications",
    await get("/api/notifications", cookies)
  );

  test(
    "Audit logs",
    await get("/api/audit-logs", cookies)
  );

  test(
    "Captain attendance",
    await get("/api/captain-attendance", cookies)
  );

  console.log("\n========== CAPTAIN MANAGEMENT ==========");

  test(
    "Captain documents",
    await get("/api/captain-documents/captain/6a9b1dc0292fbb53437a385c", cookies)
  );

  test(
    "Captain ledger",
    await get("/api/captain-ledger/6a9b1dc0292fbb53437a385c", cookies)
  );

  test(
    "Captain work area",
    await get("/api/captain-work-areas/6a9b1dc0292fbb53437a385c", cookies)
  );

  console.log("\n========== OFFERS / REWARDS ==========");

  test(
    "Offers",
    await get("/api/offers", cookies)
  );

  test(
    "Rewards",
    await get("/api/rewards", cookies)
  );

  console.log("\n========== APP / OPS ==========");

  test(
    "App branding",
    await get("/app-branding", cookies),
    [200, 403]
  );

  test(
    "App update",
    await get("/app-update", cookies),
    [200, 403]
  );

  test(
    "App theme",
    await get("/api/app-theme", cookies),
    [200, 403]
  );

  test(
    "Ops app versions",
    await get("/api/ops/app-versions", cookies)
  );

  test(
    "Ops maintenance",
    await get("/api/ops/maintenance", cookies),
    [200, 403]
  );

  console.log("\n========== CORE11 ROUTES ==========");

  test(
    "Core11 settings",
    await get("/api/core11/settings", cookies)
  );

  test(
    "Core11 establishments probe",
    await get("/api/core11/establishments/6a9c5be8b07e88e68d537866/location", cookies),
    [200, 400, 403, 404, 405]
  );

  console.log("\n======================================");
  console.log(" ADMIN READ-ONLY AUDIT SUMMARY");
  console.log("======================================");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);

  process.exit(fail ? 2 : 0);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
