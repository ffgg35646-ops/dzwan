const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const establishmentId = "6a96e60b688a25a312eb163f";
const governorateId = "6a9457bfaac212107823492c";
const areaId = "6a9457cbaac212107823492d";
const captainId = "6a9b1dc0292fbb53437a385c";

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

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(
      `Login failed: ${email}\n${JSON.stringify(body)}`
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
  console.log(" ESTABLISHMENT COMPLETE FUNCTIONAL TEST");
  console.log("==========================================");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  pass("Admin login");

  /*
   * 1. LIST
   */
  console.log("\n[1] LIST ESTABLISHMENTS");

  let r = await req("/api/establishments", {
    headers: {
      Cookie: adminCookies
    }
  });

  show("LIST ESTABLISHMENTS", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    Array.isArray(r.body?.establishments)
  ) {
    pass("List establishments");
  } else {
    fail(
      "List establishments",
      JSON.stringify(r.body)
    );
  }

  /*
   * 2. GET
   */
  console.log("\n[2] GET ESTABLISHMENT");

  r = await req(
    `/api/establishments/${establishmentId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("GET ESTABLISHMENT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.establishment?._id === establishmentId
  ) {
    pass("Get establishment");
  } else {
    fail(
      "Get establishment",
      JSON.stringify(r.body)
    );
  }

  /*
   * 3. UPDATE
   *
   * Change description only.
   * Then read it back.
   */
  console.log("\n[3] UPDATE ESTABLISHMENT");

  const testDescription =
    "اختبار وظيفي للمنشأة - " + Date.now();

  r = await req(
    `/api/establishments/${establishmentId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        description: testDescription
      })
    }
  );

  show("UPDATE ESTABLISHMENT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.establishment?.description === testDescription
  ) {
    pass("Update establishment");
  } else {
    fail(
      "Update establishment",
      JSON.stringify(r.body)
    );
  }

  r = await req(
    `/api/establishments/${establishmentId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  if (
    r.status === 200 &&
    r.body?.establishment?.description === testDescription
  ) {
    pass("Updated establishment value persisted");
  } else {
    fail(
      "Updated value persistence",
      JSON.stringify(r.body)
    );
  }

  /*
   * 4. LOCATION UPDATE
   */
  console.log("\n[4] UPDATE LOCATION");

  r = await req(
    `/api/establishments/${establishmentId}/location`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        latitude: 30.0444,
        longitude: 31.2357
      })
    }
  );

  show("UPDATE LOCATION", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    Number(r.body?.data?.latitude) === 30.0444 &&
    Number(r.body?.data?.longitude) === 31.2357
  ) {
    pass("Update establishment location");
  } else {
    fail(
      "Update establishment location",
      JSON.stringify(r.body)
    );
  }

  /*
   * Invalid location
   */
  console.log("\n[5] INVALID LOCATION");

  r = await req(
    `/api/establishments/${establishmentId}/location`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        latitude: 999,
        longitude: 999
      })
    }
  );

  show("INVALID LOCATION", r);

  if (r.status === 400) {
    pass("Invalid location rejected");
  } else {
    fail(
      "Invalid location rejection",
      JSON.stringify(r.body)
    );
  }

  /*
   * 5. CAPTAIN ASSIGNMENT
   *
   * Temporarily assign known active captain,
   * then verify persisted.
   *
   * We don't delete or clean afterward.
   */
  console.log("\n[6] CAPTAIN ASSIGNMENT");

  r = await req(
    `/api/establishments/${establishmentId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        captainId
      })
    }
  );

  show("ASSIGN CAPTAIN TO ESTABLISHMENT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    String(r.body?.establishment?.captainId) === captainId
  ) {
    pass("Captain assignment");
  } else {
    fail(
      "Captain assignment",
      JSON.stringify(r.body)
    );
  }

  /*
   * 6. SUSPEND
   */
  console.log("\n[7] SUSPEND ESTABLISHMENT");

  r = await req(
    `/api/establishments/${establishmentId}/suspend`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        reason: "اختبار إيقاف المنشأة"
      })
    }
  );

  show("SUSPEND", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.data?.status === "suspended"
  ) {
    pass("Suspend establishment");
  } else {
    fail(
      "Suspend establishment",
      JSON.stringify(r.body)
    );
  }

  /*
   * 7. REACTIVATE
   */
  console.log("\n[8] REACTIVATE ESTABLISHMENT");

  r = await req(
    `/api/establishments/${establishmentId}/reactivate`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("REACTIVATE", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.data?.status === "active"
  ) {
    pass("Reactivate establishment");
  } else {
    fail(
      "Reactivate establishment",
      JSON.stringify(r.body)
    );
  }

  /*
   * 8. OWNER LIST
   */
  console.log("\n[9] ESTABLISHMENT OWNERS");

  r = await req(
    "/api/establishment-users",
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("OWNERS LIST", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    Array.isArray(r.body?.owners)
  ) {
    pass("List establishment owners");
  } else {
    fail(
      "List establishment owners",
      JSON.stringify(r.body)
    );
  }

  /*
   * Existing establishment already has owner.
   * Verify owner is associated with it.
   */
  const ownerMatch =
    Array.isArray(r.body?.owners)
      ? r.body.owners.find(
          x =>
            x?.establishment?._id ===
            establishmentId
        )
      : null;

  if (ownerMatch) {
    pass("Existing establishment owner association");
  } else {
    fail(
      "Existing establishment owner association",
      "No owner association returned"
    );
  }

  /*
   * 9. PRODUCTS THROUGH ESTABLISHMENT
   */
  console.log("\n[10] ESTABLISHMENT PRODUCTS");

  r = await req(
    `/api/products?establishmentId=${establishmentId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("PRODUCTS", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Establishment products endpoint");
  } else {
    fail(
      "Establishment products endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 10. ESTABLISHMENT REPORT
   */
  console.log("\n[11] ESTABLISHMENT REPORT");

  r = await req(
    `/api/establishments/${establishmentId}/report`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("ESTABLISHMENT REPORT", r);

  if (r.status < 500) {
    pass("Establishment report endpoint responds");
  } else {
    fail(
      "Establishment report endpoint",
      JSON.stringify(r.body)
    );
  }

  /*
   * 11. APPROVE
   */
  console.log("\n[12] APPROVE CURRENT ESTABLISHMENT");

  r = await req(
    `/api/establishments/${establishmentId}/approve`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("APPROVE", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.establishment?.status === "active"
  ) {
    pass("Approve establishment");
  } else {
    fail(
      "Approve establishment",
      JSON.stringify(r.body)
    );
  }

  /*
   * FINAL READ
   */
  console.log("\n[13] FINAL ESTABLISHMENT STATE");

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
    r.body?.establishment?.status === "active"
  ) {
    pass("Final establishment is active");
  } else {
    fail(
      "Final establishment state",
      JSON.stringify(r.body)
    );
  }

  console.log("\n==========================================");
  console.log(" ESTABLISHMENT TEST SUMMARY");
  console.log("==========================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  console.log(`\nESTABLISHMENT ID: ${establishmentId}`);

  if (failed === 0) {
    console.log("\n🎉 ALL ESTABLISHMENT TESTS PASSED");
    process.exit(0);
  }

  console.log(
    "\n⚠️ ESTABLISHMENT TESTS HAVE FAILURES"
  );

  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
