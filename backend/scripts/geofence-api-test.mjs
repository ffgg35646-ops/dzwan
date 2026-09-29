const BASE = "http://localhost:4000";

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

async function login() {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });

  const text = await response.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  const cookies = response.headers.getSetCookie?.() ?? [];

  if (
    !response.ok ||
    !body?.success ||
    cookies.length === 0
  ) {
    throw new Error(
      `Login failed\nHTTP: ${response.status}\n${JSON.stringify(body)}`
    );
  }

  const accessCookie = cookies.find(
    cookie => cookie.startsWith("dzwan_access=")
  );

  if (!accessCookie) {
    throw new Error("dzwan_access cookie not found");
  }

  const token = accessCookie
    .slice("dzwan_access=".length)
    .split(";")[0];

  if (!token) {
    throw new Error("Access token is empty");
  }

  return token;
}

async function request(token, method, path, body = undefined) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(
    `${BASE}${path}`,
    options
  );

  const text = await response.text();

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    status: response.status,
    body: parsed
  };
}

function getId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if (value.$oid) {
      return String(value.$oid);
    }

    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }
  }

  return String(value);
}

(async () => {
  console.log("\n==============================================");
  console.log(" GEOFENCE API COMPLETE TEST");
  console.log("==============================================");

  const token = await login();

  pass("Admin login");

  const stamp = Date.now();

  const governorateId =
    "6a9457bfaac212107823492c";

  const areaId =
    "6a9457cbaac212107823492d";

  const coordinates = [
    [51.100, 12.100],
    [51.100, 12.110],
    [51.110, 12.110],
    [51.110, 12.100]
  ];

  const name =
    `Geofence اختبار ${stamp}`;

  let geofenceId = null;

  // =====================================================
  // 1. LIST
  // =====================================================

  let r = await request(
    token,
    "GET",
    "/api/geofences/"
  );

  if (
    r.status === 200 &&
    Array.isArray(r.body)
  ) {
    pass("List geofences");
  } else {
    fail(
      "List geofences",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 2. CREATE
  // =====================================================

  r = await request(
    token,
    "POST",
    "/api/geofences/",
    {
      name,
      description:
        "اختبار المنطقة الجغرافية",
      governorateId,
      areaId,
      coordinates,
      isActive: true
    }
  );

  geofenceId =
    getId(r.body?._id) ??
    getId(r.body?.id);

  if (
    r.status === 201 &&
    geofenceId &&
    r.body?.isActive === true &&
    Array.isArray(r.body?.coordinates)
  ) {
    pass("Create geofence");
  } else {
    fail(
      "Create geofence",
      JSON.stringify(r.body)
    );

    process.exit(2);
  }

  // =====================================================
  // 3. LIST PERSISTENCE
  // =====================================================

  r = await request(
    token,
    "GET",
    "/api/geofences/"
  );

  const created =
    Array.isArray(r.body)
      ? r.body.find(
          x =>
            getId(x?._id) ===
            String(geofenceId)
        )
      : null;

  if (
    r.status === 200 &&
    created &&
    created.name === name &&
    created.isActive === true &&
    Array.isArray(created.coordinates) &&
    created.coordinates.length === 4
  ) {
    pass("Created geofence persisted");
  } else {
    fail(
      "Created geofence persistence",
      JSON.stringify(created)
    );
  }

  // =====================================================
  // 4. UPDATE NAME
  // =====================================================

  const updatedName =
    `Geofence معدلة ${stamp}`;

  r = await request(
    token,
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      name: updatedName
    }
  );

  if (
    r.status === 200 &&
    r.body?.name === updatedName
  ) {
    pass("Update geofence name");
  } else {
    fail(
      "Update geofence name",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 5. UPDATE POLYGON
  // =====================================================

  const newCoordinates = [
    [51.101, 12.101],
    [51.101, 12.111],
    [51.111, 12.111],
    [51.111, 12.101]
  ];

  r = await request(
    token,
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      coordinates: newCoordinates
    }
  );

  if (
    r.status === 200 &&
    Array.isArray(r.body?.coordinates) &&
    r.body.coordinates.length === 4
  ) {
    pass("Update geofence polygon");
  } else {
    fail(
      "Update geofence polygon",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 6. DISABLE
  // =====================================================

  r = await request(
    token,
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      isActive: false
    }
  );

  if (
    r.status === 200 &&
    r.body?.isActive === false
  ) {
    pass("Disable geofence");
  } else {
    fail(
      "Disable geofence",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 7. ENABLE
  // =====================================================

  r = await request(
    token,
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      isActive: true
    }
  );

  if (
    r.status === 200 &&
    r.body?.isActive === true
  ) {
    pass("Enable geofence");
  } else {
    fail(
      "Enable geofence",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 8. INSIDE POINT
  // =====================================================

  r = await request(
    token,
    "GET",
    "/api/requirements-30-46/geofence/resolve?lat=51.106&lng=12.106"
  );

  console.log("\n========== INSIDE POINT ==========");
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));

  if (
    r.status === 200 &&
    r.body &&
    getId(r.body._id) ===
      String(geofenceId)
  ) {
    pass(
      "Inside point resolves to geofence"
    );
  } else {
    fail(
      "Inside point resolution",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 9. OUTSIDE POINT
  // =====================================================

  r = await request(
    token,
    "GET",
    "/api/requirements-30-46/geofence/resolve?lat=52.000&lng=13.000"
  );

  console.log("\n========== OUTSIDE POINT ==========");
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));

  if (
    r.status === 200 &&
    (
      r.body === null ||
      !r.body?._id
    )
  ) {
    pass(
      "Outside point does not resolve"
    );
  } else {
    fail(
      "Outside point resolution",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 10. DISABLE AND CHECK RESOLUTION
  // =====================================================

  r = await request(
    token,
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      isActive: false
    }
  );

  if (
    r.status === 200 &&
    r.body?.isActive === false
  ) {
    r = await request(
      token,
      "GET",
      "/api/requirements-30-46/geofence/resolve?lat=51.106&lng=12.106"
    );

    if (
      r.status === 200 &&
      (
        r.body === null ||
        !r.body?._id ||
        getId(r.body._id) !==
          String(geofenceId)
      )
    ) {
      pass(
        "Disabled geofence is ignored"
      );
    } else {
      fail(
        "Disabled geofence resolution",
        JSON.stringify(r.body)
      );
    }
  } else {
    fail(
      "Disable geofence before resolver test",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 11. RE-ENABLE
  // =====================================================

  r = await request(
    token,
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      isActive: true
    }
  );

  if (
    r.status === 200 &&
    r.body?.isActive === true
  ) {
    pass("Re-enable geofence");
  } else {
    fail(
      "Re-enable geofence",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 12. DELETE
  // =====================================================

  r = await request(
    token,
    "DELETE",
    `/api/geofences/${geofenceId}`
  );

  if (
    r.status === 200 &&
    r.body?.success === true
  ) {
    pass("Delete geofence");
  } else {
    fail(
      "Delete geofence",
      JSON.stringify(r.body)
    );
  }

  // =====================================================
  // 13. VERIFY DELETE
  // =====================================================

  r = await request(
    token,
    "GET",
    "/api/geofences/"
  );

  const deleted =
    Array.isArray(r.body)
      ? r.body.find(
          x =>
            getId(x?._id) ===
            String(geofenceId)
        )
      : null;

  if (!deleted) {
    pass(
      "Deleted geofence is no longer listed"
    );
  } else {
    fail(
      "Deleted geofence still exists",
      JSON.stringify(deleted)
    );
  }

  console.log("\n==============================================");
  console.log(" GEOFENCE API TEST SUMMARY");
  console.log("==============================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed === 0) {
    console.log(
      "\n🎉 ALL GEOFENCE API TESTS PASSED"
    );
    process.exit(0);
  }

  console.log(
    "\n⚠️ GEOFENCE API TESTS HAVE FAILURES"
  );

  process.exit(2);

})().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
