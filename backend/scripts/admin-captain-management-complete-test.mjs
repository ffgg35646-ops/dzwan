const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const GOVERNORATE_ID = "6a9457bfaac212107823492c";
const AREA_ID = "6a9457cbaac212107823492d";

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
      `Login failed for ${email}\nHTTP ${res.status}\n${JSON.stringify(body)}`
    );
  }

  return cookies.map(v => v.split(";", 1)[0]).join("; ");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
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

function getCaptainFromResponse(body) {
  return (
    body?.captain ??
    body?.data?.captain ??
    body?.user ??
    null
  );
}

function getRegistrationId(body) {
  return (
    body?.registrationId ??
    body?.data?.registrationId ??
    body?.registration?._id ??
    body?.registration?.id ??
    null
  );
}

function getCaptainId(body) {
  const captain = getCaptainFromResponse(body);

  return (
    captain?.id?.toString?.() ??
    captain?._id?.toString?.() ??
    body?.captainId?.toString?.() ??
    null
  );
}

async function assertMongoCaptain(adminCookies, captainId, expected = {}) {
  const r = await request(`/api/captains/${captainId}`, {
    headers: {
      Cookie: adminCookies,
    },
  });

  if (r.status !== 200 || !r.body?.success) {
    throw new Error(
      `Captain read failed: HTTP ${r.status}\n${JSON.stringify(r.body)}`
    );
  }

  const captain = r.body?.captain;

  for (const [key, value] of Object.entries(expected)) {
    if (String(captain?.[key] ?? "") !== String(value)) {
      throw new Error(
        `Captain field mismatch: ${key}\nExpected: ${value}\nActual: ${captain?.[key]}`
      );
    }
  }

  return captain;
}

async function main() {
  console.log("\n==============================================");
  console.log(" ADMIN CAPTAIN MANAGEMENT COMPLETE TEST");
  console.log("==============================================");

  // -------------------------------------------------
  // 1. Admin login
  // -------------------------------------------------
  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  pass("Admin login");

  // -------------------------------------------------
  // 2. Create captain registration #1
  // -------------------------------------------------
  const captain1Email =
    `captain-management-${stamp}@dzwan.local`;

  const captain1Phone =
    `011${String(stamp).slice(-8)}`;

  const captain1Gmail =
    `captain-management-${stamp}@gmail.com`;

  const registration1 = await request(
    "/api/captain-registration/",
    {
      method: "POST",
      body: JSON.stringify({
        fullName: `كابتن اختبار إدارة ${stamp}`,
        phone: captain1Phone,
        email: captain1Email,
        password: "Captain@123456",
        gmail: captain1Gmail,
        governorateId: GOVERNORATE_ID,
        areaId: AREA_ID,
        idFrontUrl: "https://example.com/id-front.jpg",
        idBackUrl: "https://example.com/id-back.jpg",
        residenceFrontUrl: "https://example.com/residence-front.jpg",
        residenceBackUrl: "https://example.com/residence-back.jpg",
      }),
    }
  );

  show("CAPTAIN REGISTRATION #1", registration1);

  const registrationId1 =
    getRegistrationId(registration1.body);

  if (
    registration1.status === 201 &&
    registrationId1 &&
    registration1.body?.status === "pending"
  ) {
    pass("Create captain registration");
  } else {
    fail(
      "Create captain registration",
      JSON.stringify(registration1.body)
    );
    throw new Error("Cannot continue without registration #1");
  }

  // -------------------------------------------------
  // 3. Admin list registrations
  // -------------------------------------------------
  const registrations = await request(
    "/api/captain-registration/",
    {
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("CAPTAIN REGISTRATIONS LIST", registrations);

  const foundRegistration = Array.isArray(
    registrations.body?.registrations
  )
    ? registrations.body.registrations.find(
        x => String(x._id) === String(registrationId1)
      )
    : null;

  if (
    registrations.status === 200 &&
    foundRegistration &&
    foundRegistration.status === "pending"
  ) {
    pass("Admin can list pending captain registrations");
  } else {
    fail(
      "Admin registration list",
      JSON.stringify(registrations.body)
    );
  }

  // -------------------------------------------------
  // 4. Approve registration
  // -------------------------------------------------
  const approval = await request(
    `/api/captain-registration/${registrationId1}/approve`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({}),
    }
  );

  show("APPROVE REGISTRATION", approval);

  const captainId = getCaptainId(approval.body);

  if (
    approval.status === 200 &&
    captainId &&
    approval.body?.captain?.status === "active"
  ) {
    pass("Approve registration and create captain account");
  } else {
    fail(
      "Approve registration",
      JSON.stringify(approval.body)
    );
    throw new Error("Cannot continue without approved captain");
  }

  // -------------------------------------------------
  // 5. Verify captain exists through admin
  // -------------------------------------------------
  try {
    await assertMongoCaptain(adminCookies, captainId, {
      role: "captain",
      status: "active",
      phone: captain1Phone,
      email: captain1Email,
    });

    pass("Approved captain persisted in users");
  } catch (e) {
    fail("Approved captain persistence", e.message);
  }

  // -------------------------------------------------
  // 6. Captain list
  // -------------------------------------------------
  const captainList = await request(
    "/api/captains/",
    {
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("CAPTAIN LIST", captainList);

  const listedCaptain = Array.isArray(
    captainList.body?.captains
  )
    ? captainList.body.captains.find(
        x => String(x._id) === String(captainId)
      )
    : null;

  if (
    captainList.status === 200 &&
    captainList.body?.success &&
    listedCaptain &&
    listedCaptain.role === "captain"
  ) {
    pass("Admin can list approved captain");
  } else {
    fail(
      "Admin captain list",
      JSON.stringify(captainList.body)
    );
  }

  // -------------------------------------------------
  // 7. Captain GET
  // -------------------------------------------------
  const captainGet = await request(
    `/api/captains/${captainId}`,
    {
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("GET CAPTAIN", captainGet);

  if (
    captainGet.status === 200 &&
    captainGet.body?.success &&
    String(captainGet.body?.captain?._id) === String(captainId)
  ) {
    pass("Admin can open captain details");
  } else {
    fail(
      "Admin captain details",
      JSON.stringify(captainGet.body)
    );
  }

  // -------------------------------------------------
  // 8. Update name / phone
  // -------------------------------------------------
  const updatedName =
    `كابتن معدل ${stamp}`;

  const updatedPhone =
    `012${String(stamp).slice(-8)}`;

  const update1 = await request(
    `/api/captains/${captainId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        fullName: updatedName,
        phone: updatedPhone,
      }),
    }
  );

  show("UPDATE CAPTAIN DATA", update1);

  if (
    update1.status === 200 &&
    update1.body?.success &&
    update1.body?.captain?.fullName === updatedName &&
    update1.body?.captain?.phone === updatedPhone
  ) {
    pass("Update captain name and phone");
  } else {
    fail(
      "Update captain data",
      JSON.stringify(update1.body)
    );
  }

  // -------------------------------------------------
  // 9. Verify update persisted
  // -------------------------------------------------
  try {
    await assertMongoCaptain(adminCookies, captainId, {
      fullName: updatedName,
      phone: updatedPhone,
    });

    pass("Captain data update persisted");
  } catch (e) {
    fail("Captain update persistence", e.message);
  }

  // -------------------------------------------------
  // 10. Suspend captain
  // -------------------------------------------------
  const suspend = await request(
    `/api/captains/${captainId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        status: "suspended",
      }),
    }
  );

  show("SUSPEND CAPTAIN", suspend);

  if (
    suspend.status === 200 &&
    suspend.body?.success &&
    suspend.body?.captain?.status === "suspended"
  ) {
    pass("Suspend captain");
  } else {
    fail(
      "Suspend captain",
      JSON.stringify(suspend.body)
    );
  }

  // -------------------------------------------------
  // 11. Verify suspended persistence
  // -------------------------------------------------
  try {
    await assertMongoCaptain(adminCookies, captainId, {
      status: "suspended",
    });

    pass("Suspended status persisted");
  } catch (e) {
    fail("Suspended status persistence", e.message);
  }

  // -------------------------------------------------
  // 12. Reactivate through update
  // -------------------------------------------------
  const reactivate = await request(
    `/api/captains/${captainId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        status: "active",
      }),
    }
  );

  show("REACTIVATE CAPTAIN", reactivate);

  if (
    reactivate.status === 200 &&
    reactivate.body?.success &&
    reactivate.body?.captain?.status === "active"
  ) {
    pass("Reactivate captain");
  } else {
    fail(
      "Reactivate captain",
      JSON.stringify(reactivate.body)
    );
  }

  // -------------------------------------------------
  // 13. Captain login with modified credentials
  // -------------------------------------------------
  let captainCookies;

  try {
    captainCookies = await login(
      captain1Email,
      "Captain@123456"
    );
    pass("Captain can login after admin updates");
  } catch (e) {
    fail("Captain login after management update", e.message);
  }

  // -------------------------------------------------
  // 14. Captain /me
  // -------------------------------------------------
  if (captainCookies) {
    const me = await request(
      "/api/auth/me",
      {
        headers: {
          Cookie: captainCookies,
        },
      }
    );

    show("CAPTAIN ME AFTER MANAGEMENT", me);

    if (
      me.status === 200 &&
      me.body?.success &&
      me.body?.user?.role === "captain" &&
      String(me.body?.user?.id) === String(captainId)
    ) {
      pass("Captain account remains valid after admin management");
    } else {
      fail(
        "Captain /me after management",
        JSON.stringify(me.body)
      );
    }
  }

  // -------------------------------------------------
  // 15. Create captain registration #2 for rejection
  // -------------------------------------------------
  const captain2Email =
    `captain-reject-${stamp}@dzwan.local`;

  const captain2Phone =
    `010${String(stamp + 1).slice(-8)}`;

  const captain2Gmail =
    `captain-reject-${stamp}@gmail.com`;

  const registration2 = await request(
    "/api/captain-registration/",
    {
      method: "POST",
      body: JSON.stringify({
        fullName: `كابتن رفض اختبار ${stamp}`,
        phone: captain2Phone,
        email: captain2Email,
        password: "Captain@123456",
        gmail: captain2Gmail,
        governorateId: GOVERNORATE_ID,
        areaId: AREA_ID,
        idFrontUrl: "https://example.com/id-front-2.jpg",
        idBackUrl: "https://example.com/id-back-2.jpg",
        residenceFrontUrl: "https://example.com/residence-front-2.jpg",
        residenceBackUrl: "https://example.com/residence-back-2.jpg",
      }),
    }
  );

  const registrationId2 =
    getRegistrationId(registration2.body);

  if (
    registration2.status === 201 &&
    registrationId2
  ) {
    pass("Create second captain registration for rejection");
  } else {
    fail(
      "Create second registration",
      JSON.stringify(registration2.body)
    );
    throw new Error("Cannot continue rejection test");
  }

  // -------------------------------------------------
  // 16. Reject registration with reason
  // -------------------------------------------------
  const rejectionReason =
    "بيانات اختبارية مرفوضة للمراجعة";

  const rejection = await request(
    `/api/captain-registration/${registrationId2}/reject`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        reason: rejectionReason,
      }),
    }
  );

  show("REJECT REGISTRATION", rejection);

  if (
    rejection.status === 200 &&
    String(rejection.body?.message || "").includes("رفض")
  ) {
    pass("Reject captain registration");
  } else {
    fail(
      "Reject captain registration",
      JSON.stringify(rejection.body)
    );
  }

  // -------------------------------------------------
  // 17. Verify rejected registration
  // -------------------------------------------------
  const registrationsAfterReject = await request(
    "/api/captain-registration/",
    {
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  const rejectedRow = Array.isArray(
    registrationsAfterReject.body?.registrations
  )
    ? registrationsAfterReject.body.registrations.find(
        x => String(x._id) === String(registrationId2)
      )
    : null;

  if (
    registrationsAfterReject.status === 200 &&
    rejectedRow?.status === "rejected" &&
    rejectedRow?.rejectionReason === rejectionReason
  ) {
    pass("Rejected registration persisted with reason");
  } else {
    fail(
      "Rejected registration persistence",
      JSON.stringify(rejectedRow)
    );
  }

  // -------------------------------------------------
  // 18. Create full-day shift for captain
  // -------------------------------------------------
  const todayDay = new Date().getDay();

  const shift = await request(
    "/api/dispatch/shifts",
    {
      method: "POST",
      headers: {
        Cookie: adminCookies,
      },
      body: JSON.stringify({
        captainId,
        dayOfWeek: todayDay,
        startTime: "00:00",
        endTime: "23:59",
        isActive: true,
      }),
    }
  );

  show("CREATE CAPTAIN SHIFT", shift);

  const shiftId =
    shift.body?.shift?._id ??
    shift.body?.data?._id ??
    shift.body?.id ??
    null;

  if (
    shift.status >= 200 &&
    shift.status < 300 &&
    shiftId
  ) {
    pass("Admin can create captain shift");
  } else {
    fail(
      "Create captain shift",
      JSON.stringify(shift.body)
    );
  }

  // -------------------------------------------------
  // 19. Captain online state before change
  // -------------------------------------------------
  if (captainCookies) {
    const onlineBefore = await request(
      "/captains/online/",
      {
        headers: {
          Cookie: captainCookies,
        },
      }
    );

    show("ONLINE BEFORE", onlineBefore);

    if (
      onlineBefore.status === 200 &&
      onlineBefore.body?.success &&
      typeof onlineBefore.body?.online === "boolean"
    ) {
      pass("Captain can read online state");
    } else {
      fail(
        "Captain online read",
        JSON.stringify(onlineBefore.body)
      );
    }

    // -------------------------------------------------
    // 20. Set captain online
    // -------------------------------------------------
    const onlineOn = await request(
      "/captains/online/",
      {
        method: "PATCH",
        headers: {
          Cookie: captainCookies,
        },
        body: JSON.stringify({
          online: true,
        }),
      }
    );

    show("SET ONLINE TRUE", onlineOn);

    if (
      onlineOn.status === 200 &&
      onlineOn.body?.success &&
      onlineOn.body?.online === true
    ) {
      pass("Captain can go online inside shift");
    } else {
      fail(
        "Set captain online",
        JSON.stringify(onlineOn.body)
      );
    }

    // -------------------------------------------------
    // 21. Read online after change
    // -------------------------------------------------
    const onlineAfter = await request(
      "/captains/online/",
      {
        headers: {
          Cookie: captainCookies,
        },
      }
    );

    show("ONLINE AFTER TRUE", onlineAfter);

    if (
      onlineAfter.status === 200 &&
      onlineAfter.body?.success &&
      onlineAfter.body?.online === true
    ) {
      pass("Online state persisted for captain");
    } else {
      fail(
        "Online state persistence",
        JSON.stringify(onlineAfter.body)
      );
    }

    // -------------------------------------------------
    // 22. Set captain offline
    // -------------------------------------------------
    const onlineOff = await request(
      "/captains/online/",
      {
        method: "PATCH",
        headers: {
          Cookie: captainCookies,
        },
        body: JSON.stringify({
          online: false,
        }),
      }
    );

    show("SET ONLINE FALSE", onlineOff);

    if (
      onlineOff.status === 200 &&
      onlineOff.body?.success &&
      onlineOff.body?.online === false
    ) {
      pass("Captain can go offline");
    } else {
      fail(
        "Set captain offline",
        JSON.stringify(onlineOff.body)
      );
    }
  }

  // -------------------------------------------------
  // 23. Admin sees online flag
  // -------------------------------------------------
  const adminCaptainAfterOnline = await request(
    `/api/captains/${captainId}`,
    {
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("ADMIN SEES ONLINE FLAG", adminCaptainAfterOnline);

  if (
    adminCaptainAfterOnline.status === 200 &&
    adminCaptainAfterOnline.body?.success &&
    typeof adminCaptainAfterOnline.body?.captain?.isOnline === "boolean"
  ) {
    pass("Admin can see captain online state");
  } else {
    fail(
      "Admin online state visibility",
      JSON.stringify(adminCaptainAfterOnline.body)
    );
  }

  // -------------------------------------------------
  // 24. Delete shift
  // -------------------------------------------------
  if (shiftId) {
    const shiftDelete = await request(
      `/api/dispatch/shifts/${shiftId}`,
      {
        method: "DELETE",
        headers: {
          Cookie: adminCookies,
        },
      }
    );

    show("DELETE CAPTAIN SHIFT", shiftDelete);

    if (
      shiftDelete.status >= 200 &&
      shiftDelete.status < 300
    ) {
      pass("Admin can delete captain shift");
    } else {
      fail(
        "Delete captain shift",
        JSON.stringify(shiftDelete.body)
      );
    }
  } else {
    fail("Delete captain shift", "No shiftId returned");
  }

  // -------------------------------------------------
  // 25. Delete approved captain
  // -------------------------------------------------
  const captainDelete = await request(
    `/api/captains/${captainId}`,
    {
      method: "DELETE",
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("DELETE CAPTAIN", captainDelete);

  if (
    captainDelete.status === 200 &&
    captainDelete.body?.success
  ) {
    pass("Admin can delete captain");
  } else {
    fail(
      "Delete captain",
      JSON.stringify(captainDelete.body)
    );
  }

  // -------------------------------------------------
  // 26. Verify deleted captain is gone
  // -------------------------------------------------
  const deletedRead = await request(
    `/api/captains/${captainId}`,
    {
      headers: {
        Cookie: adminCookies,
      },
    }
  );

  show("READ DELETED CAPTAIN", deletedRead);

  if (deletedRead.status === 404) {
    pass("Deleted captain is no longer accessible");
  } else {
    fail(
      "Deleted captain still accessible",
      JSON.stringify(deletedRead.body)
    );
  }

  // -------------------------------------------------
  // Summary
  // -------------------------------------------------
  console.log("\n==============================================");
  console.log(" ADMIN CAPTAIN MANAGEMENT TEST SUMMARY");
  console.log("==============================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed === 0) {
    console.log("\n🎉 ALL ADMIN CAPTAIN MANAGEMENT TESTS PASSED");
    process.exit(0);
  }

  console.log("\n⚠️ ADMIN CAPTAIN MANAGEMENT HAS FAILURES");
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
