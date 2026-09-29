const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const governorateId = "6a9457bfaac212107823492c";
const areaId = "6a9457cbaac212107823492d";

const captainId = "6a9b1dc0292fbb53437a385c";

const suffix = Date.now();

const establishmentName = `مطعم مالك اختبار ${suffix}`;
const ownerFullName = `مالك اختبار ${suffix}`;
const ownerPhone = `011${String(suffix).slice(-8)}`;
const ownerEmail = `owner-${suffix}@dzwan.local`;
const ownerPassword = "Owner@123456";

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
    body: JSON.stringify({
      email,
      password
    })
  });

  const body = await res.json();
  const cookies = res.headers.getSetCookie?.() ?? [];

  console.log(`\n========== LOGIN ${email} ==========`);
  console.log("HTTP:", res.status);
  console.log(JSON.stringify(body, null, 2));

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(
      `Login failed: ${email}`
    );
  }

  return cookies
    .map(v => v.split(";", 1)[0])
    .join("; ");
}

async function req(path, options = {}) {
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
  console.log(" ESTABLISHMENT OWNER COMPLETE TEST");
  console.log("==========================================");

  /*
   * 1. ADMIN LOGIN
   */
  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  pass("Admin login");

  /*
   * 2. CREATE NEW ESTABLISHMENT WITHOUT OWNER
   */
  console.log("\n[1] CREATE TEST ESTABLISHMENT");

  let r = await req("/api/establishments", {
    method: "POST",
    headers: {
      Cookie: adminCookies
    },
    body: JSON.stringify({
      name: establishmentName,
      type: "restaurant",
      phone: `010${String(suffix).slice(-8)}`,
      email: `est-${suffix}@dzwan.local`,
      address: "عنوان اختبار مالك المنشأة",
      governorateId,
      areaId,
      ownerUserId: null,
      captainId,
      description: "منشأة اختبار حساب المالك",
      logoUrl: null,
      latitude: 30.0444,
      longitude: 31.2357
    })
  });

  show("CREATE ESTABLISHMENT", r);

  if (
    r.status >= 200 &&
    r.status < 300 &&
    r.body?.success &&
    r.body?.establishment?._id
  ) {
    pass("Create establishment without owner");
  } else {
    fail(
      "Create establishment",
      JSON.stringify(r.body)
    );
    process.exit(2);
  }

  const establishmentId =
    r.body.establishment._id;

  /*
   * 3. CREATE OWNER
   */
  console.log("\n[2] CREATE ESTABLISHMENT OWNER");

  r = await req("/api/establishment-users", {
    method: "POST",
    headers: {
      Cookie: adminCookies
    },
    body: JSON.stringify({
      establishmentId,
      fullName: ownerFullName,
      phone: ownerPhone,
      email: ownerEmail,
      password: ownerPassword
    })
  });

  show("CREATE OWNER", r);

  if (
    r.status >= 200 &&
    r.status < 300 &&
    r.body?.success &&
    r.body?.owner?._id
  ) {
    pass("Create establishment owner");
  } else {
    fail(
      "Create establishment owner",
      JSON.stringify(r.body)
    );
    process.exit(2);
  }

  const ownerId = r.body.owner._id;

  /*
   * 4. OWNER LOGIN
   */
  console.log("\n[3] OWNER LOGIN");

  let ownerCookies;

  try {
    ownerCookies = await login(
      ownerEmail,
      ownerPassword
    );
    pass("Owner login");
  } catch (error) {
    fail(
      "Owner login",
      String(error)
    );
    process.exit(2);
  }

  /*
   * 5. OWNER /ME
   */
  console.log("\n[4] OWNER PROFILE");

  r = await req("/api/auth/me", {
    headers: {
      Cookie: ownerCookies
    }
  });

  show("OWNER ME", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.user?.role === "shop" &&
    r.body?.user?._id === ownerId ||
    r.body?.user?.id === ownerId
  ) {
    pass("Owner profile");
  } else {
    fail(
      "Owner profile",
      JSON.stringify(r.body)
    );
  }

  /*
   * 6. OWNER ESTABLISHMENT READ
   */
  console.log("\n[5] OWNER ESTABLISHMENT ACCESS");

  r = await req(
    `/api/establishments/${establishmentId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER ESTABLISHMENT", r);

  if (r.status === 200) {
    pass("Owner can access establishment");
  } else {
    fail(
      "Owner establishment access",
      JSON.stringify(r.body)
    );
  }

  /*
   * 7. OWNER ORDERS
   */
  console.log("\n[6] OWNER ORDERS");

  r = await req(
    `/api/orders?establishmentId=${establishmentId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER ORDERS", r);

  if (r.status < 500) {
    pass("Owner orders endpoint responds");
  } else {
    fail(
      "Owner orders endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 8. OWNER PRODUCTS
   */
  console.log("\n[7] OWNER PRODUCTS");

  r = await req(
    `/api/products?establishmentId=${establishmentId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER PRODUCTS", r);

  if (r.status < 500) {
    pass("Owner products endpoint responds");
  } else {
    fail(
      "Owner products endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 9. OWNER SHOULD NOT ACCESS SYSTEM SETTINGS
   */
  console.log("\n[8] OWNER PROTECTED SYSTEM SETTINGS");

  r = await req(
    "/api/system-settings/",
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER SYSTEM SETTINGS", r);

  if (r.status === 401 || r.status === 403) {
    pass("Owner cannot access system settings");
  } else {
    fail(
      "Owner system settings protection",
      JSON.stringify(r.body)
    );
  }

  /*
   * 10. OWNER SHOULD NOT ACCESS DISPATCH SETTINGS
   */
  console.log("\n[9] OWNER PROTECTED DISPATCH SETTINGS");

  r = await req(
    "/api/dispatch/settings",
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER DISPATCH SETTINGS", r);

  if (r.status === 401 || r.status === 403) {
    pass("Owner cannot access dispatch settings");
  } else {
    fail(
      "Owner dispatch settings protection",
      JSON.stringify(r.body)
    );
  }

  /*
   * 11. ADMIN READ OWNER
   */
  console.log("\n[10] ADMIN READ OWNER");

  r = await req(
    `/api/establishment-users/${ownerId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("GET OWNER BY ADMIN", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Admin can read owner");
  } else {
    fail(
      "Admin read owner",
      JSON.stringify(r.body)
    );
  }

  /*
   * 12. UPDATE OWNER PROFILE
   */
  console.log("\n[11] UPDATE OWNER");

  const updatedName =
    `${ownerFullName} - معدل`;

  r = await req(
    `/api/establishment-users/${ownerId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        fullName: updatedName
      })
    }
  );

  show("UPDATE OWNER", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.owner?.fullName === updatedName
  ) {
    pass("Update owner name");
  } else {
    fail(
      "Update owner name",
      JSON.stringify(r.body)
    );
  }

  /*
   * 13. VERIFY OWNER UPDATE
   */
  console.log("\n[12] VERIFY OWNER UPDATE");

  r = await req(
    `/api/establishment-users/${ownerId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("VERIFY OWNER", r);

  if (
    r.status === 200 &&
    r.body?.owner?.fullName === updatedName
  ) {
    pass("Owner update persisted");
  } else {
    fail(
      "Owner update persistence",
      JSON.stringify(r.body)
    );
  }

  /*
   * 14. OWNER LOGIN STILL WORKS
   */
  console.log("\n[13] OWNER LOGIN AFTER UPDATE");

  try {
    await login(
      ownerEmail,
      ownerPassword
    );
    pass("Owner login remains valid");
  } catch (error) {
    fail(
      "Owner login after update",
      String(error)
    );
  }

  /*
   * 15. FINAL ESTABLISHMENT
   */
  console.log("\n[14] FINAL ESTABLISHMENT");

  r = await req(
    `/api/establishments/${establishmentId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("FINAL ESTABLISHMENT", r);

  if (
    r.status === 200 &&
    r.body?.establishment?.ownerUserId
  ) {
    pass("Establishment linked to owner");
  } else {
    fail(
      "Establishment owner linkage",
      JSON.stringify(r.body)
    );
  }

  /*
   * SUMMARY
   */
  console.log("\n==========================================");
  console.log(" OWNER TEST SUMMARY");
  console.log("==========================================");

  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  console.log(`\nESTABLISHMENT ID: ${establishmentId}`);
  console.log(`OWNER ID: ${ownerId}`);
  console.log(`OWNER EMAIL: ${ownerEmail}`);

  if (failed === 0) {
    console.log("\n🎉 ALL OWNER TESTS PASSED");
    process.exit(0);
  }

  console.log("\n⚠️ OWNER TESTS HAVE FAILURES");
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
