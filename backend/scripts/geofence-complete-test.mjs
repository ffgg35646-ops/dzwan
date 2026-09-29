const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let cookie = "";
let passed = 0;
let failed = 0;
let geofenceId = null;

function pass(name, extra = "") {
  passed++;
  console.log(`✅ ${name}${extra ? ` — ${extra}` : ""}`);
}

function fail(name, extra = "") {
  failed++;
  console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`);
}

async function req(method, path, body = undefined, useCookie = true) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (useCookie && cookie) {
    headers["Cookie"] = cookie;
  }

  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await r.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  const setCookies =
    typeof r.headers.getSetCookie === "function"
      ? r.headers.getSetCookie()
      : [];

  if (setCookies.length) {
    cookie = setCookies
      .map(x => x.split(";", 1)[0])
      .join("; ");
  }

  return {
    status: r.status,
    body: parsed,
  };
}

function print(label, r) {
  console.log(`\n========== ${label} ==========`);
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));
}

async function main() {
  console.log("\n========== GEOFENCE COMPLETE TEST ==========\n");

  // =====================================================
  // 1. LOGIN
  // =====================================================

  const login = await req(
    "POST",
    "/api/auth/login",
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
    false
  );

  if (
    login.status === 200 &&
    login.body?.success === true &&
    cookie
  ) {
    pass("Admin Login", `HTTP ${login.status}`);
  } else {
    fail("Admin Login", `HTTP ${login.status}`);
    print("LOGIN", login);
    process.exit(1);
  }

  // =====================================================
  // 2. LOCATIONS
  // =====================================================

  const locations = await req(
    "GET",
    "/api/locations"
  );

  if (
    locations.status !== 200 ||
    locations.body?.success !== true ||
    !Array.isArray(locations.body?.locations)
  ) {
    fail(
      "List Locations",
      `HTTP ${locations.status}`
    );
    print("LOCATIONS", locations);
    process.exit(2);
  }

  pass(
    "List Locations",
    `count=${locations.body.locations.length}`
  );

  const location =
    locations.body.locations.find(
      x =>
        x?._id &&
        Array.isArray(x.areas) &&
        x.areas.some(
          a => a?._id && a?.isActive !== false
        )
    ) ||
    locations.body.locations.find(x => x?._id);

  if (!location) {
    fail(
      "Find Governorate",
      "لا توجد محافظة في قاعدة البيانات"
    );
    process.exit(2);
  }

  const governorateId = String(location._id);

  pass(
    "Find Governorate",
    `id=${governorateId}, name=${location.name}`
  );

  const area =
    location.areas?.find(
      a => a?._id && a?.isActive !== false
    ) ||
    location.areas?.find(a => a?._id);

  const areaId = area?._id
    ? String(area._id)
    : null;

  if (!areaId) {
    fail(
      "Find Area",
      `المحافظة ${location.name} لا تحتوي على Area`
    );
    process.exit(2);
  }

  pass(
    "Find Area",
    `id=${areaId}, name=${area.name}`
  );

  // =====================================================
  // 3. CREATE GEOFENCE
  // =====================================================

  const stamp = Date.now();

  const polygon = [
    [29.900, 30.900],
    [29.900, 30.910],
    [29.910, 30.910],
    [29.910, 30.900],
  ];

  const name =
    `Zajel E2E Geofence ${stamp}`;

  let r = await req(
    "POST",
    "/api/geofences/",
    {
      name,
      description: "Zajel E2E Geofence Test",
      governorateId,
      areaId,
      coordinates: polygon,
      isActive: true,
    }
  );

  print("CREATE GEOFENCE", r);

  geofenceId =
    r.body?._id ||
    r.body?.id ||
    null;

  if (
    r.status === 201 &&
    geofenceId &&
    r.body?.isActive === true &&
    Array.isArray(r.body?.coordinates) &&
    r.body.coordinates.length === 4
  ) {
    pass(
      "Create Geofence",
      `id=${geofenceId}`
    );
  } else {
    fail(
      "Create Geofence",
      `HTTP ${r.status}`
    );
    process.exit(2);
  }

  // =====================================================
  // 4. LIST PERSISTENCE
  // =====================================================

  r = await req(
    "GET",
    "/api/geofences/"
  );

  const listed =
    Array.isArray(r.body)
      ? r.body.find(
          x =>
            String(x?._id) ===
            String(geofenceId)
        )
      : null;

  if (
    r.status === 200 &&
    listed &&
    listed.name === name &&
    listed.isActive === true &&
    Array.isArray(listed.coordinates) &&
    listed.coordinates.length === 4
  ) {
    pass("Geofence Appears In List");
  } else {
    fail(
      "Geofence List Persistence",
      JSON.stringify(listed)
    );
  }

  // =====================================================
  // 5. INVALID POLYGON
  // =====================================================

  r = await req(
    "POST",
    "/api/geofences/",
    {
      name: `Invalid Geofence ${stamp}`,
      governorateId,
      areaId,
      coordinates: [
        [29.9, 30.9],
        [29.91, 30.91],
      ],
      isActive: true,
    }
  );

  if (r.status === 400) {
    pass(
      "Invalid Polygon Rejected",
      "HTTP 400"
    );
  } else {
    fail(
      "Invalid Polygon Rejected",
      `HTTP ${r.status}`
    );
  }

  // =====================================================
  // 6. UPDATE NAME
  // =====================================================

  const updatedName =
    `Zajel E2E Geofence Updated ${stamp}`;

  r = await req(
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      name: updatedName,
    }
  );

  if (
    r.status === 200 &&
    r.body?.name === updatedName
  ) {
    pass("Update Geofence Name");
  } else {
    fail(
      "Update Geofence Name",
      `HTTP ${r.status}`
    );
  }

  // =====================================================
  // 7. UPDATE COORDINATES
  // =====================================================

  const updatedPolygon = [
    [29.901, 30.901],
    [29.901, 30.911],
    [29.911, 30.911],
    [29.911, 30.901],
  ];

  r = await req(
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      coordinates: updatedPolygon,
    }
  );

  if (
    r.status === 200 &&
    Array.isArray(r.body?.coordinates) &&
    r.body.coordinates.length === 4
  ) {
    pass("Update Geofence Coordinates");
  } else {
    fail(
      "Update Geofence Coordinates",
      `HTTP ${r.status}`
    );
  }

  // =====================================================
  // 8. DISABLE
  // =====================================================

  r = await req(
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      isActive: false,
    }
  );

  if (
    r.status === 200 &&
    r.body?.isActive === false
  ) {
    pass("Disable Geofence");
  } else {
    fail(
      "Disable Geofence",
      `HTTP ${r.status}`
    );
  }

  // =====================================================
  // 9. RE-ENABLE
  // =====================================================

  r = await req(
    "PATCH",
    `/api/geofences/${geofenceId}`,
    {
      isActive: true,
    }
  );

  if (
    r.status === 200 &&
    r.body?.isActive === true
  ) {
    pass("Re-enable Geofence");
  } else {
    fail(
      "Re-enable Geofence",
      `HTTP ${r.status}`
    );
  }

  // =====================================================
  // 10. AUTH PROTECTION
  // =====================================================

  const unauth = await req(
    "GET",
    "/api/geofences/",
    undefined,
    false
  );

  if (
    [401, 403].includes(unauth.status)
  ) {
    pass(
      "Geofence Authentication",
      `HTTP ${unauth.status}`
    );
  } else {
    fail(
      "Geofence Authentication",
      `HTTP ${unauth.status}`
    );
  }

  // =====================================================
  // 11. DELETE
  // =====================================================

  r = await req(
    "DELETE",
    `/api/geofences/${geofenceId}`
  );

  if (
    r.status === 200 &&
    r.body?.success === true
  ) {
    pass("Delete Geofence");
  } else {
    fail(
      "Delete Geofence",
      `HTTP ${r.status}`
    );
  }

  // =====================================================
  // 12. VERIFY DELETE
  // =====================================================

  r = await req(
    "GET",
    "/api/geofences/"
  );

  const stillExists =
    Array.isArray(r.body) &&
    r.body.some(
      x =>
        String(x?._id) ===
        String(geofenceId)
    );

  if (
    r.status === 200 &&
    !stillExists
  ) {
    pass("Verify Geofence Deleted");
  } else {
    fail("Verify Geofence Deleted");
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  console.log("\n==============================================");
  console.log(" GEOFENCE TEST SUMMARY");
  console.log("==============================================");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("==============================================\n");

  if (failed === 0) {
    console.log("✅ GEOFENCE COMPLETE TEST PASSED");
    process.exit(0);
  } else {
    console.log("❌ GEOFENCE COMPLETE TEST FAILED");
    process.exit(2);
  }
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
