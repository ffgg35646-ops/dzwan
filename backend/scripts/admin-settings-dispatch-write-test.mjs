const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const CAPTAIN_ID = "6a9b1dc0292fbb53437a385c";

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

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
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

async function request(path, cookies, method = "GET", body = undefined) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies
    }
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(BASE + path, options);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    data
  };
}

function show(title, result) {
  console.log(`\n========== ${title} ==========`);
  console.log("HTTP:", result.status);
  console.log(JSON.stringify(result.data, null, 2));
}

async function main() {
  console.log("\n==========================================");
  console.log(" ADMIN SETTINGS + DISPATCH WRITE TEST");
  console.log("==========================================");

  const cookies = await login();
  ok("Admin login");

  /*
   * SYSTEM SETTINGS
   */
  console.log("\n[1] SYSTEM SETTINGS");

  let r = await request(
    "/api/system-settings/",
    cookies
  );

  show("SYSTEM SETTINGS BEFORE", r);

  if (
    r.status === 200 &&
    r.data?.settings
  ) {
    ok("Read system settings");
  } else {
    bad("Read system settings", JSON.stringify(r.data));
    process.exit(2);
  }

  const originalSystem = r.data.settings;

  const systemPatch = {
    requireDeliveryPhoto:
      !Boolean(originalSystem.requireDeliveryPhoto),
    deliveryOtpExpirationMinutes:
      Number(originalSystem.deliveryOtpExpirationMinutes) === 10
        ? 15
        : 10,
    deliveryOtpMaxAttempts:
      Number(originalSystem.deliveryOtpMaxAttempts) === 5
        ? 6
        : 5,
    requireCaptainWorkArea:
      !Boolean(originalSystem.requireCaptainWorkArea)
  };

  r = await request(
    "/api/system-settings/",
    cookies,
    "PATCH",
    systemPatch
  );

  show("SYSTEM SETTINGS PATCH", r);

  if (
    r.status === 200 &&
    r.data?.settings
  ) {
    ok("Update system settings");
  } else {
    bad("Update system settings", JSON.stringify(r.data));
  }

  r = await request(
    "/api/system-settings/",
    cookies
  );

  show("SYSTEM SETTINGS AFTER PATCH", r);

  const changed =
    r.data?.settings?.requireDeliveryPhoto ===
      systemPatch.requireDeliveryPhoto &&
    Number(r.data?.settings?.deliveryOtpExpirationMinutes) ===
      systemPatch.deliveryOtpExpirationMinutes &&
    Number(r.data?.settings?.deliveryOtpMaxAttempts) ===
      systemPatch.deliveryOtpMaxAttempts &&
    r.data?.settings?.requireCaptainWorkArea ===
      systemPatch.requireCaptainWorkArea;

  if (r.status === 200 && changed) {
    ok("System settings persisted");
  } else {
    bad("System settings persistence", JSON.stringify(r.data));
  }

  /*
   * restore system settings
   */
  r = await request(
    "/api/system-settings/",
    cookies,
    "PATCH",
    {
      requireDeliveryOtp:
        Boolean(originalSystem.requireDeliveryOtp),
      requireDeliveryPhoto:
        Boolean(originalSystem.requireDeliveryPhoto),
      deliveryOtpExpirationMinutes:
        Number(originalSystem.deliveryOtpExpirationMinutes),
      deliveryOtpMaxAttempts:
        Number(originalSystem.deliveryOtpMaxAttempts),
      requireCaptainWorkArea:
        Boolean(originalSystem.requireCaptainWorkArea)
    }
  );

  if (
    r.status === 200 &&
    r.data?.settings
  ) {
    ok("System settings restored");
  } else {
    bad("System settings restore", JSON.stringify(r.data));
  }

  /*
   * CORE11 SETTINGS
   */
  console.log("\n[2] CORE11 SETTINGS");

  r = await request(
    "/api/core11/settings/",
    cookies
  );

  show("CORE11 BEFORE", r);

  if (r.status === 200 && r.data?.data) {
    ok("Read Core11 settings");
  } else {
    bad("Read Core11 settings", JSON.stringify(r.data));
  }

  const originalCore = r.data?.data;

  if (originalCore) {
    const corePatch = {
      pricingMode:
        originalCore.pricingMode === "area_to_area"
          ? "geofencing"
          : "area_to_area",
      dispatchTimeoutSeconds:
        Number(originalCore.dispatchTimeoutSeconds) === 60
          ? 90
          : 60,
      maxDispatchAttempts:
        Number(originalCore.maxDispatchAttempts) === 5
          ? 6
          : 5,
      strictShiftEnforcement:
        !Boolean(originalCore.strictShiftEnforcement)
    };

    r = await request(
      "/api/core11/settings/",
      cookies,
      "PATCH",
      corePatch
    );

    show("CORE11 PATCH", r);

    if (
      r.status === 200 &&
      r.data?.success
    ) {
      ok("Update Core11 settings");
    } else {
      bad("Update Core11 settings", JSON.stringify(r.data));
    }

    r = await request(
      "/api/core11/settings/",
      cookies
    );

    show("CORE11 AFTER PATCH", r);

    const coreChanged =
      r.data?.data?.pricingMode === corePatch.pricingMode &&
      Number(r.data?.data?.dispatchTimeoutSeconds) ===
        corePatch.dispatchTimeoutSeconds &&
      Number(r.data?.data?.maxDispatchAttempts) ===
        corePatch.maxDispatchAttempts &&
      r.data?.data?.strictShiftEnforcement ===
        corePatch.strictShiftEnforcement;

    if (r.status === 200 && coreChanged) {
      ok("Core11 settings persisted");
    } else {
      bad("Core11 persistence", JSON.stringify(r.data));
    }

    /*
     * restore
     */
    r = await request(
      "/api/core11/settings/",
      cookies,
      "PATCH",
      {
        pricingMode: originalCore.pricingMode,
        dispatchTimeoutSeconds:
          Number(originalCore.dispatchTimeoutSeconds),
        maxDispatchAttempts:
          Number(originalCore.maxDispatchAttempts),
        strictShiftEnforcement:
          Boolean(originalCore.strictShiftEnforcement),
        requireEstablishmentApproval:
          Boolean(
            originalCore.requireEstablishmentApproval
          ),
        requireEstablishmentLocation:
          Boolean(
            originalCore.requireEstablishmentLocation
          )
      }
    );

    if (
      r.status === 200 &&
      r.data?.success
    ) {
      ok("Core11 settings restored");
    } else {
      bad("Core11 restore", JSON.stringify(r.data));
    }
  }

  /*
   * DISPATCH SETTINGS
   */
  console.log("\n[3] DISPATCH SETTINGS");

  r = await request(
    "/api/dispatch/settings",
    cookies
  );

  show("DISPATCH BEFORE", r);

  if (
    r.status === 200 &&
    r.data?.data
  ) {
    ok("Read dispatch settings");
  } else {
    bad("Read dispatch settings", JSON.stringify(r.data));
    process.exit(2);
  }

  const originalDispatch = r.data.data;

  const dispatchPatch = {
    autoDispatchEnabled:
      !Boolean(originalDispatch.autoDispatchEnabled),
    queueEnabled:
      !Boolean(originalDispatch.queueEnabled),
    maxActiveOrdersPerCaptain:
      Number(originalDispatch.maxActiveOrdersPerCaptain) === 1
        ? 2
        : 1,
    assignmentTimeoutSeconds:
      Number(originalDispatch.assignmentTimeoutSeconds) === 10
        ? 20
        : 10,
    maxAssignmentAttempts:
      Number(originalDispatch.maxAssignmentAttempts) === 5
        ? 6
        : 5,
    onlineOnly:
      !Boolean(originalDispatch.onlineOnly),
    requireSameArea:
      !Boolean(originalDispatch.requireSameArea),
    requireSameGovernorate:
      !Boolean(originalDispatch.requireSameGovernorate),
    requireCaptainShift:
      !Boolean(originalDispatch.requireCaptainShift)
  };

  r = await request(
    "/api/dispatch/settings",
    cookies,
    "PATCH",
    dispatchPatch
  );

  show("DISPATCH PATCH", r);

  if (
    r.status === 200 &&
    r.data?.success &&
    r.data?.data
  ) {
    ok("Update dispatch settings");
  } else {
    bad("Update dispatch settings", JSON.stringify(r.data));
  }

  r = await request(
    "/api/dispatch/settings",
    cookies
  );

  show("DISPATCH AFTER PATCH", r);

  const dispatchChanged =
    r.data?.data?.autoDispatchEnabled ===
      dispatchPatch.autoDispatchEnabled &&
    r.data?.data?.queueEnabled ===
      dispatchPatch.queueEnabled &&
    Number(r.data?.data?.maxActiveOrdersPerCaptain) ===
      dispatchPatch.maxActiveOrdersPerCaptain &&
    Number(r.data?.data?.assignmentTimeoutSeconds) ===
      dispatchPatch.assignmentTimeoutSeconds &&
    Number(r.data?.data?.maxAssignmentAttempts) ===
      dispatchPatch.maxAssignmentAttempts &&
    r.data?.data?.onlineOnly ===
      dispatchPatch.onlineOnly &&
    r.data?.data?.requireSameArea ===
      dispatchPatch.requireSameArea &&
    r.data?.data?.requireSameGovernorate ===
      dispatchPatch.requireSameGovernorate &&
    r.data?.data?.requireCaptainShift ===
      dispatchPatch.requireCaptainShift;

  if (r.status === 200 && dispatchChanged) {
    ok("Dispatch settings persisted");
  } else {
    bad("Dispatch persistence", JSON.stringify(r.data));
  }

  /*
   * Restore dispatch settings
   */
  r = await request(
    "/api/dispatch/settings",
    cookies,
    "PATCH",
    {
      autoDispatchEnabled:
        Boolean(originalDispatch.autoDispatchEnabled),
      queueEnabled:
        Boolean(originalDispatch.queueEnabled),
      maxActiveOrdersPerCaptain:
        Number(
          originalDispatch.maxActiveOrdersPerCaptain
        ),
      assignmentTimeoutSeconds:
        Number(
          originalDispatch.assignmentTimeoutSeconds
        ),
      maxAssignmentAttempts:
        Number(
          originalDispatch.maxAssignmentAttempts
        ),
      onlineOnly:
        Boolean(originalDispatch.onlineOnly),
      requireSameArea:
        Boolean(originalDispatch.requireSameArea),
      requireSameGovernorate:
        Boolean(originalDispatch.requireSameGovernorate),
      requireCaptainShift:
        Boolean(originalDispatch.requireCaptainShift)
    }
  );

  if (
    r.status === 200 &&
    r.data?.success
  ) {
    ok("Dispatch settings restored");
  } else {
    bad("Dispatch settings restore", JSON.stringify(r.data));
  }

  /*
   * CAPTAIN SHIFTS
   */
  console.log("\n[4] CAPTAIN SHIFTS");

  r = await request(
    "/api/dispatch/shifts",
    cookies
  );

  show("SHIFTS BEFORE", r);

  if (
    r.status === 200 &&
    Array.isArray(r.data?.data)
  ) {
    ok("List captain shifts");
  } else {
    bad("List captain shifts", JSON.stringify(r.data));
    process.exit(2);
  }

  const shiftDay = new Date().getDay();

  r = await request(
    "/api/dispatch/shifts",
    cookies,
    "POST",
    {
      captainId: CAPTAIN_ID,
      dayOfWeek: shiftDay,
      startTime: "00:00",
      endTime: "23:59",
      isActive: true
    }
  );

  show("CREATE SHIFT", r);

  if (
    r.status === 201 &&
    r.data?.success &&
    r.data?.data?._id
  ) {
    ok("Create captain shift");
  } else {
    bad("Create captain shift", JSON.stringify(r.data));
    process.exit(2);
  }

  const shiftId = r.data.data._id;

  r = await request(
    "/api/dispatch/shifts",
    cookies
  );

  const createdShift =
    Array.isArray(r.data?.data)
      ? r.data.data.find(
          x => x._id === shiftId
        )
      : null;

  if (r.status === 200 && createdShift) {
    ok("Created shift persisted");
  } else {
    bad(
      "Created shift persistence",
      JSON.stringify(r.data)
    );
  }

  r = await request(
    `/api/dispatch/shifts/${shiftId}`,
    cookies,
    "DELETE"
  );

  show("DELETE SHIFT", r);

  if (
    r.status === 200 &&
    r.data?.success
  ) {
    ok("Delete captain shift");
  } else {
    bad("Delete captain shift", JSON.stringify(r.data));
  }

  /*
   * DISPATCH QUEUE / ASSIGNMENTS
   */
  console.log("\n[5] DISPATCH QUEUE + ASSIGNMENTS");

  r = await request(
    "/api/dispatch/queue",
    cookies
  );

  show("DISPATCH QUEUE", r);

  if (
    r.status === 200 &&
    Array.isArray(r.data?.data)
  ) {
    ok("List dispatch queue");
  } else {
    bad("List dispatch queue", JSON.stringify(r.data));
  }

  r = await request(
    "/api/dispatch/assignments",
    cookies
  );

  show("DISPATCH ASSIGNMENTS", r);

  if (
    r.status === 200 &&
    Array.isArray(r.data?.data)
  ) {
    ok("List dispatch assignments");
  } else {
    bad("List dispatch assignments", JSON.stringify(r.data));
  }

  /*
   * PROCESS DISPATCH
   */
  console.log("\n[6] PROCESS DISPATCH");

  r = await request(
    "/api/dispatch/process",
    cookies,
    "POST",
    {}
  );

  show("PROCESS DISPATCH", r);

  if (
    r.status === 200 &&
    r.data?.success &&
    r.data?.data
  ) {
    ok("Process dispatch queue");
  } else {
    bad("Process dispatch queue", JSON.stringify(r.data));
  }

  /*
   * Summary
   */
  console.log("\n==========================================");
  console.log(" ADMIN SETTINGS + DISPATCH SUMMARY");
  console.log("==========================================");
  console.log(`PASS: ${pass}`);
  console.log(`FAIL: ${fail}`);

  if (fail === 0) {
    console.log("\n🎉 ALL ADMIN SETTINGS/DISPATCH TESTS PASSED");
    process.exit(0);
  }

  console.log("\n⚠️ ADMIN SETTINGS/DISPATCH TESTS HAVE FAILURES");
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
