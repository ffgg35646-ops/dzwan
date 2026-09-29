const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const CAPTAIN_EMAIL = "approve-1788550589691@dzwan.local";
const CAPTAIN_PASSWORD = "Test@123456";

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

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const body = await res.json();
  const cookies = res.headers.getSetCookie?.() ?? [];

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(
      `Login failed: ${email}\n${JSON.stringify(body)}`
    );
  }

  return cookies
    .map(v => v.split(";", 1)[0])
    .join("; ");
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
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

function show(label, r) {
  console.log(`\n========== ${label} ==========`);
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));
}

async function main() {
  console.log("\n==========================================");
  console.log(" CAPTAIN COMPLETE FUNCTIONAL TEST");
  console.log("==========================================");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  const captainCookies = await login(
    CAPTAIN_EMAIL,
    CAPTAIN_PASSWORD
  );

  pass("Admin login");
  pass("Captain login");

  /*
   * 1. Captain profile
   */
  console.log("\n[1] CAPTAIN PROFILE");

  let r = await request("/api/auth/me", {
    headers: {
      Cookie: captainCookies
    }
  });

  show("CAPTAIN ME", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.user?.role === "captain"
  ) {
    pass("Captain profile /me");
  } else {
    fail(
      "Captain profile /me",
      JSON.stringify(r.body)
    );
  }

  /*
   * 2. Captain orders
   */
  console.log("\n[2] CAPTAIN ORDERS");

  r = await request("/api/orders", {
    headers: {
      Cookie: captainCookies
    }
  });

  show("CAPTAIN ORDERS", r);

  if (r.status === 200 && r.body?.success) {
    pass("Captain can access orders");
  } else {
    fail(
      "Captain orders endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 3. Captain attendance
   */
  console.log("\n[3] CAPTAIN ATTENDANCE");

  r = await request(
    `/api/captain-attendance`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("ATTENDANCE", r);

  if (r.status < 500) {
    pass("Captain attendance endpoint responds");
  } else {
    fail(
      "Captain attendance endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 4. Captain work area
   */
  console.log("\n[4] CAPTAIN WORK AREA");

  r = await request(
    `/api/captain-work-areas`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("WORK AREA", r);

  if (r.status < 500) {
    pass("Captain work-area endpoint responds");
  } else {
    fail(
      "Captain work-area endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 5. Captain documents
   */
  console.log("\n[5] CAPTAIN DOCUMENTS");

  r = await request(
    `/api/captain-documents`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("CAPTAIN DOCUMENTS", r);

  if (r.status < 500) {
    pass("Captain documents endpoint responds");
  } else {
    fail(
      "Captain documents endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 6. Captain ledger
   */
  console.log("\n[6] CAPTAIN LEDGER");

  r = await request(
    `/api/captain-ledger`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("CAPTAIN LEDGER", r);

  if (r.status < 500) {
    pass("Captain ledger endpoint responds");
  } else {
    fail(
      "Captain ledger endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 7. Notifications
   */
  console.log("\n[7] CAPTAIN NOTIFICATIONS");

  r = await request(
    `/api/notifications`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("NOTIFICATIONS", r);

  if (r.status === 200) {
    pass("Captain notifications");
  } else {
    fail(
      "Captain notifications",
      JSON.stringify(r.body)
    );
  }

  /*
   * 8. Dispatch settings access
   */
  console.log("\n[8] DISPATCH ACCESS CONTROL");

  r = await request(
    `/api/dispatch/settings`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("CAPTAIN DISPATCH SETTINGS", r);

  if (r.status === 401 || r.status === 403) {
    pass("Captain cannot modify/access protected dispatch settings");
  } else if (r.status === 200) {
    fail(
      "Captain unexpectedly has dispatch settings access",
      JSON.stringify(r.body)
    );
  } else {
    pass("Dispatch access is restricted");
  }

  /*
   * 9. System settings access
   */
  console.log("\n[9] SYSTEM SETTINGS ACCESS");

  r = await request(
    `/api/system-settings/`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("CAPTAIN SYSTEM SETTINGS", r);

  if (r.status === 401 || r.status === 403) {
    pass("Captain cannot access protected system settings");
  } else {
    fail(
      "System settings access control",
      JSON.stringify(r.body)
    );
  }

  /*
   * 10. Admin can still access captain
   */
  console.log("\n[10] ADMIN ACCESS TO CAPTAIN");

  const captainId =
    "6a9b1dc0292fbb53437a385c";

  const possibleRoutes = [
    `/api/captains/${captainId}`,
    `/api/users/${captainId}`
  ];

  let adminAccessWorked = false;

  for (const path of possibleRoutes) {
    r = await request(path, {
      headers: {
        Cookie: adminCookies
      }
    });

    console.log(`\nPATH: ${path}`);
    console.log("HTTP:", r.status);
    console.log(JSON.stringify(r.body, null, 2));

    if (r.status === 200) {
      adminAccessWorked = true;
      break;
    }
  }

  if (adminAccessWorked) {
    pass("Admin can read captain data");
  } else {
    fail("Admin captain data access");
  }

  /*
   * Summary
   */
  console.log("\n==========================================");
  console.log(" CAPTAIN COMPLETE TEST SUMMARY");
  console.log("==========================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed === 0) {
    console.log("\n🎉 ALL CAPTAIN TESTS PASSED");
    process.exit(0);
  }

  console.log("\n⚠️ CAPTAIN TESTS HAVE FAILURES");
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
