const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let passed = 0;
let failed = 0;

const stamp = Date.now();

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
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  const cookies = res.headers.getSetCookie?.() ?? [];

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(
      `Login failed\nHTTP ${res.status}\n${JSON.stringify(body)}`
    );
  }

  return cookies.map(x => x.split(";", 1)[0]).join("; ");
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
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
    body,
  };
}

function show(label, r) {
  console.log(`\n========== ${label} ==========`);
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));
}

async function main() {
  console.log("\n==============================================");
  console.log(" ADMIN LOCATION COMPLETE FUNCTIONAL TEST");
  console.log("==============================================");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  pass("Admin login");

  // ==================================================
  // 1. Initial locations list
  // ==================================================
  let r = await request("/api/locations/", {
    headers: {
      Cookie: adminCookies,
    },
  });

  show("INITIAL LOCATIONS", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    Array.isArray(r.body?.locations)
  ) {
    pass("Admin can list locations");
  } else {
    fail(
      "Initial locations list",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 2. Create governorate
  // ==================================================
  const governorateName =
    `محافظة اختبار ${stamp}`;

  r = await request("/api/locations/", {
    method: "POST",
    headers: {
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      name: governorateName,
    }),
  });

  show("CREATE GOVERNORATE", r);

  const governorateId =
    r.body?.location?._id ??
    r.body?.location?.id ??
    null;

  if (
    r.status === 201 &&
    r.body?.success &&
    governorateId &&
    r.body?.location?.name === governorateName &&
    r.body?.location?.isActive === true
  ) {
    pass("Create governorate");
  } else {
    fail(
      "Create governorate",
      JSON.stringify(r.body)
    );
    throw new Error("Cannot continue without governorate");
  }

  // ==================================================
  // 3. Verify governorate persisted
  // ==================================================
  r = await request("/api/locations/", {
    headers: {
      Cookie: adminCookies,
    },
  });

  const createdGov = Array.isArray(r.body?.locations)
    ? r.body.locations.find(
        x => String(x._id) === String(governorateId)
      )
    : null;

  if (
    r.status === 200 &&
    createdGov &&
    createdGov.name === governorateName &&
    createdGov.isActive === true
  ) {
    pass("Governorate persisted");
  } else {
    fail(
      "Governorate persistence",
      JSON.stringify(createdGov)
    );
  }

  // ==================================================
  // 4. Duplicate governorate
  // ==================================================
  r = await request("/api/locations/", {
    method: "POST",
    headers: {
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      name: governorateName,
    }),
  });

  show("DUPLICATE GOVERNORATE", r);

  if (r.status === 409) {
    pass("Duplicate governorate is rejected");
  } else {
    fail(
      "Duplicate governorate validation",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 5. Invalid governorate
  // ==================================================
  r = await request("/api/locations/", {
    method: "POST",
    headers: {
      Cookie: adminCookies,
    },
    body: JSON.stringify({
      name: "x",
    }),
  });

  show("INVALID GOVERNORATE", r);

  if (r.status === 400) {
    pass("Invalid governorate name is rejected");
  } else {
    fail(
      "Invalid governorate validation",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 6. Update governorate name
  // ==================================================
  const updatedGovernorateName =
    `محافظة معدلة ${stamp}`;

  r = await request(
    `/api/locations/${governorateId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        name: updatedGovernorateName,
      }),
    }
  );

  show("UPDATE GOVERNORATE", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.location?.name === updatedGovernorateName
  ) {
    pass("Update governorate name");
  } else {
    fail(
      "Update governorate name",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 7. Disable governorate
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        isActive: false,
      }),
    }
  );

  show("DISABLE GOVERNORATE", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.location?.isActive === false
  ) {
    pass("Disable governorate");
  } else {
    fail(
      "Disable governorate",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 8. Verify disabled persisted
  // ==================================================
  r = await request("/api/locations/", {
    headers: {
      Cookie: adminCookies,
    },
  });

  const disabledGov = Array.isArray(r.body?.locations)
    ? r.body.locations.find(
        x => String(x._id) === String(governorateId)
      )
    : null;

  if (
    disabledGov &&
    disabledGov.isActive === false
  ) {
    pass("Disabled governorate persisted");
  } else {
    fail(
      "Disabled governorate persistence",
      JSON.stringify(disabledGov)
    );
  }

  // ==================================================
  // 9. Re-enable governorate
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        isActive: true,
      }),
    }
  );

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.location?.isActive === true
  ) {
    pass("Re-enable governorate");
  } else {
    fail(
      "Re-enable governorate",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 10. Create area
  // ==================================================
  const areaName =
    `منطقة اختبار ${stamp}`;

  r = await request(
    `/api/locations/${governorateId}/areas`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        name: areaName,
      }),
    }
  );

  show("CREATE AREA", r);

  let locationAfterArea =
    r.body?.location ?? null;

  let area =
    Array.isArray(locationAfterArea?.areas)
      ? locationAfterArea.areas.find(
          x => x.name === areaName
        )
      : null;

  const areaId =
    area?._id ??
    null;

  if (
    r.status === 201 &&
    r.body?.success &&
    areaId &&
    area?.name === areaName &&
    area?.isActive === true
  ) {
    pass("Create area");
  } else {
    fail(
      "Create area",
      JSON.stringify(r.body)
    );
    throw new Error("Cannot continue without area");
  }

  // ==================================================
  // 11. Duplicate area
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}/areas`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        name: areaName,
      }),
    }
  );

  show("DUPLICATE AREA", r);

  if (r.status === 409) {
    pass("Duplicate area is rejected");
  } else {
    fail(
      "Duplicate area validation",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 12. Invalid area
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}/areas`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        name: "x",
      }),
    }
  );

  if (r.status === 400) {
    pass("Invalid area name is rejected");
  } else {
    fail(
      "Invalid area validation",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 13. Update area name
  // ==================================================
  const updatedAreaName =
    `منطقة معدلة ${stamp}`;

  r = await request(
    `/api/locations/${governorateId}/areas/${areaId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        name: updatedAreaName,
      }),
    }
  );

  show("UPDATE AREA", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    const updatedArea =
      r.body?.location?.areas?.find(
        x => String(x._id) === String(areaId)
      );

    if (
      updatedArea &&
      updatedArea.name === updatedAreaName
    ) {
      pass("Update area name");
    } else {
      fail(
        "Update area response",
        JSON.stringify(r.body)
      );
    }
  } else {
    fail(
      "Update area",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 14. Disable area
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}/areas/${areaId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        isActive: false,
      }),
    }
  );

  show("DISABLE AREA", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    const disabledArea =
      r.body?.location?.areas?.find(
        x => String(x._id) === String(areaId)
      );

    if (
      disabledArea &&
      disabledArea.isActive === false
    ) {
      pass("Disable area");
    } else {
      fail(
        "Disable area response",
        JSON.stringify(r.body)
      );
    }
  } else {
    fail(
      "Disable area",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 15. Verify area disabled
  // ==================================================
  r = await request("/api/locations/", {
    headers: {
      Cookie: adminCookies,
    },
  });

  const verifyGov = Array.isArray(r.body?.locations)
    ? r.body.locations.find(
        x => String(x._id) === String(governorateId)
      )
    : null;

  const verifyArea =
    verifyGov?.areas?.find(
      x => String(x._id) === String(areaId)
    );

  if (
    verifyArea &&
    verifyArea.isActive === false
  ) {
    pass("Disabled area persisted");
  } else {
    fail(
      "Disabled area persistence",
      JSON.stringify(verifyArea)
    );
  }

  // ==================================================
  // 16. Re-enable area
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}/areas/${areaId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        isActive: true,
      }),
    }
  );

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    const enabledArea =
      r.body?.location?.areas?.find(
        x => String(x._id) === String(areaId)
      );

    if (
      enabledArea &&
      enabledArea.isActive === true
    ) {
      pass("Re-enable area");
    } else {
      fail(
        "Re-enable area response",
        JSON.stringify(r.body)
      );
    }
  } else {
    fail(
      "Re-enable area",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 17. Non-existing area
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}/areas/000000000000000000000000`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        name: "منطقة غير موجودة",
      }),
    }
  );

  if (r.status === 404) {
    pass("Unknown area returns 404");
  } else {
    fail(
      "Unknown area handling",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 18. Delete area
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}/areas/${areaId}`,
    {
      method: "DELETE",
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("DELETE AREA", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Delete area");
  } else {
    fail(
      "Delete area",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 19. Verify area deleted
  // ==================================================
  r = await request("/api/locations/", {
    headers: {
      Cookie: adminCookies,
    },
  });

  const finalGovBeforeDelete =
    Array.isArray(r.body?.locations)
      ? r.body.locations.find(
          x => String(x._id) === String(governorateId)
        )
      : null;

  const deletedArea =
    finalGovBeforeDelete?.areas?.find(
      x => String(x._id) === String(areaId)
    );

  if (!deletedArea) {
    pass("Deleted area is gone");
  } else {
    fail(
      "Deleted area still exists",
      JSON.stringify(deletedArea)
    );
  }

  // ==================================================
  // 20. Delete governorate
  // ==================================================
  r = await request(
    `/api/locations/${governorateId}`,
    {
      method: "DELETE",
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("DELETE GOVERNORATE", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Delete governorate");
  } else {
    fail(
      "Delete governorate",
      JSON.stringify(r.body)
    );
  }

  // ==================================================
  // 21. Verify governorate deleted
  // ==================================================
  r = await request("/api/locations/", {
    headers: {
      Cookie: adminCookies,
    },
  });

  const deletedGovFinal =
    Array.isArray(r.body?.locations)
      ? r.body.locations.find(
          x => String(x._id) === String(governorateId)
        )
      : null;

  if (!deletedGovFinal) {
    pass("Deleted governorate is gone");
  } else {
    fail(
      "Deleted governorate still exists",
      JSON.stringify(deletedGovFinal)
    );
  }

  console.log("\n==============================================");
  console.log(" ADMIN LOCATION TEST SUMMARY");
  console.log("==============================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed === 0) {
    console.log("\n🎉 ALL ADMIN LOCATION TESTS PASSED");
    process.exit(0);
  }

  console.log("\n⚠️ ADMIN LOCATION TESTS HAVE FAILURES");
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
