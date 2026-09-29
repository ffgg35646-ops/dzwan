import fs from "fs";
import { execSync } from "child_process";

const BASE = "http://localhost:4000";
const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let cookie = "";
let passed = 0;
let failed = 0;
let skipped = 0;

function log(status, name, extra = "") {
  const line =
    status === "PASS" ? "✅ PASS" :
    status === "FAIL" ? "❌ FAIL" :
    "⚠️ SKIP";
  console.log(`${line}  ${name}${extra ? ` — ${extra}` : ""}`);
  if (status === "PASS") passed++;
  else if (status === "FAIL") failed++;
  else skipped++;
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie
      .split(",")
      .map(x => x.split(";")[0])
      .join("; ");
  }

  let data = null;
  const text = await res.text();

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { res, data, text };
}

function assertStatus(name, result, allowed = [200]) {
  const code = result.res.status;

  if (allowed.includes(code)) {
    log("PASS", name, `HTTP ${code}`);
    return true;
  }

  log(
    "FAIL",
    name,
    `HTTP ${code} ${typeof result.data === "object" ? JSON.stringify(result.data) : result.text}`
  );
  return false;
}

async function main() {
  console.log("");
  console.log("==============================================");
  console.log("      ZAJEL FULL SYSTEM API TEST");
  console.log("==============================================");
  console.log("");

  // --------------------------------------------
  // 1) SERVER
  // --------------------------------------------
  try {
    const r = await request("/api/locations");
    if ([401, 403, 200].includes(r.res.status)) {
      log("PASS", "Backend reachable", `HTTP ${r.res.status}`);
    } else {
      log("FAIL", "Backend reachable", `HTTP ${r.res.status}`);
    }
  } catch (e) {
    log("FAIL", "Backend reachable", e.message);
    console.log("\n❌ السيرفر غير متاح على http://localhost:4000");
    process.exit(1);
  }

  // --------------------------------------------
  // 2) ADMIN LOGIN
  // --------------------------------------------
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  assertStatus("Admin Login", login, [200]);

  // --------------------------------------------
  // 3) AUTH ME
  // --------------------------------------------
  const me = await request("/api/auth/me");
  assertStatus("Auth /me", me, [200]);

  // --------------------------------------------
  // 4) LOCATIONS
  // --------------------------------------------
  const locations = await request("/api/locations");

  if (!assertStatus("Locations", locations, [200])) {
    console.log("\n❌ لا يمكن إكمال اختبار الكابتن بدون المحافظة والمنطقة.");
    process.exit(1);
  }

  const location =
    locations.data?.locations?.find(x => x.isActive !== false) ??
    locations.data?.locations?.[0];

  const governorateId = location?._id;
  const areaId = location?.areas?.find(x => x.isActive !== false)?._id
    ?? location?.areas?.[0]?._id;

  if (!governorateId || !areaId) {
    log("FAIL", "Valid Governorate + Area", "لم يتم العثور على IDs صالحة");
    process.exit(1);
  }

  log("PASS", "Valid Governorate ID", governorateId);
  log("PASS", "Valid Area ID", areaId);

  const stamp = Date.now();

  // --------------------------------------------
  // 5) CAPTAIN REGISTRATION - REJECT
  // --------------------------------------------
  const rejectRequest = await request("/api/captain-registration/", {
    method: "POST",
    body: JSON.stringify({
      fullName: `اختبار رفض آلي ${stamp}`,
      phone: `010${String(stamp).slice(-8)}`,
      email: `reject-${stamp}@dzwan.local`,
      gmail: `reject-${stamp}@gmail.com`,
      password: "Test@123456",
      governorateId,
      areaId,
      idFrontUrl: `https://example.com/test/reject/${stamp}/id-front.jpg`,
      idBackUrl: `https://example.com/test/reject/${stamp}/id-back.jpg`,
      residenceFrontUrl: `https://example.com/test/reject/${stamp}/res-front.jpg`,
      residenceBackUrl: `https://example.com/test/reject/${stamp}/res-back.jpg`,
    }),
  });

  const rejectOK = assertStatus(
    "Captain Registration - Reject Test",
    rejectRequest,
    [201]
  );

  const rejectId = rejectRequest.data?.registrationId;

  if (!rejectOK || !rejectId) {
    log("FAIL", "Reject Registration ID");
  } else {
    log("PASS", "Reject Registration ID", rejectId);
  }

  // --------------------------------------------
  // 6) CAPTAIN REGISTRATION - APPROVE
  // --------------------------------------------
  const approveRequest = await request("/api/captain-registration/", {
    method: "POST",
    body: JSON.stringify({
      fullName: `اختبار قبول آلي ${stamp}`,
      phone: `011${String(stamp).slice(-8)}`,
      email: `approve-${stamp}@dzwan.local`,
      gmail: `approve-${stamp}@gmail.com`,
      password: "Test@123456",
      governorateId,
      areaId,
      idFrontUrl: `https://example.com/test/approve/${stamp}/id-front.jpg`,
      idBackUrl: `https://example.com/test/approve/${stamp}/id-back.jpg`,
      residenceFrontUrl: `https://example.com/test/approve/${stamp}/res-front.jpg`,
      residenceBackUrl: `https://example.com/test/approve/${stamp}/res-back.jpg`,
    }),
  });

  const approveOK = assertStatus(
    "Captain Registration - Approve Test",
    approveRequest,
    [201]
  );

  const approveId = approveRequest.data?.registrationId;

  if (!approveOK || !approveId) {
    log("FAIL", "Approve Registration ID");
  } else {
    log("PASS", "Approve Registration ID", approveId);
  }

  // --------------------------------------------
  // 7) REJECT CAPTAIN
  // --------------------------------------------
  if (rejectId) {
    const reject = await request(
      `/api/captain-registration/${rejectId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: "اختبار آلي للرفض",
        }),
      }
    );

    assertStatus(
      "Captain Reject Workflow",
      reject,
      [200]
    );
  } else {
    log("SKIP", "Captain Reject Workflow");
  }

  // --------------------------------------------
  // 8) APPROVE CAPTAIN
  // --------------------------------------------
  let createdCaptainId = null;

  if (approveId) {
    const approve = await request(
      `/api/captain-registration/${approveId}/approve`,
      {
        method: "POST",
      }
    );

    const ok = assertStatus(
      "Captain Approve Workflow",
      approve,
      [200]
    );

    createdCaptainId =
      approve.data?.captain?.id ??
      approve.data?.captain?._id ??
      null;

    if (ok && createdCaptainId) {
      log("PASS", "Captain Account Created", createdCaptainId);
    } else if (ok) {
      log("FAIL", "Captain Account Created", "لم يرجع ID للكابتن");
    }
  } else {
    log("SKIP", "Captain Approve Workflow");
  }

  // --------------------------------------------
  // 9) REGISTRATION LIST
  // --------------------------------------------
  const registrations = await request(
    "/api/captain-registration/"
  );

  assertStatus(
    "Captain Registration List",
    registrations,
    [200]
  );

  // --------------------------------------------
  // 10) CAPTAINS
  // --------------------------------------------
  const captains = await request("/api/captains/");

  const captainsOK = assertStatus(
    "Captains List",
    captains,
    [200]
  );

  if (captainsOK && createdCaptainId) {
    const found = captains.data?.captains?.some(
      x => String(x._id) === String(createdCaptainId)
    );

    if (found) {
      log("PASS", "Approved Captain Appears in Captains List");
    } else {
      log("FAIL", "Approved Captain Appears in Captains List");
    }
  }

  // --------------------------------------------
  // 11) SAFE GET API TESTS
  // --------------------------------------------
  const safeGetRoutes = [
    ["/api/users", "Users"],
    ["/api/staff", "Staff"],
    ["/api/establishments", "Establishments"],
    ["/api/establishment-users", "Establishment Users"],
    ["/api/customers", "Customers"],
    ["/api/products", "Products"],
    ["/api/orders", "Orders"],
    ["/api/pricing", "Pricing"],
    ["/api/geofences", "Geofences"],
    ["/api/notifications", "Notifications"],
    ["/api/audit-logs", "Audit Logs"],
    ["/api/settings", "Settings"],
    ["/api/dispatch", "Dispatch"],
    ["/api/system-settings", "System Settings"],
    ["/api/delivery-proof", "Delivery Proof"],
    ["/api/captain-ledger", "Captain Ledger"],
    ["/api/captain-work-areas", "Captain Work Areas"],
    ["/api/captain-documents", "Captain Documents"],
    ["/api/captain-attendance", "Captain Attendance"],
    ["/api/reports", "Reports"],
    ["/api/completion", "Completion"],
    ["/api/ops", "Ops"],
    ["/api/offers", "Offers"],
    ["/captains/online", "Online Captains"],
    ["/delivery-price-overrides", "Delivery Price Overrides"],
    ["/support", "Support"],
    ["/rewards", "Rewards"],
    ["/app-branding", "App Branding"],
    ["/app-update", "App Update"],
  ];

  for (const [route, name] of safeGetRoutes) {
    try {
      const r = await request(route);

      if (
        r.res.status >= 200 &&
        r.res.status < 300
      ) {
        log("PASS", `GET ${name}`, `HTTP ${r.res.status}`);
      } else if (
        r.res.status === 404
      ) {
        log("SKIP", `GET ${name}`, "Route غير موجودة بهذا المسار");
      } else if (
        r.res.status === 401 ||
        r.res.status === 403
      ) {
        log("PASS", `GET ${name}`, `Protected / HTTP ${r.res.status}`);
      } else {
        log("FAIL", `GET ${name}`, `HTTP ${r.res.status}`);
      }
    } catch (e) {
      log("FAIL", `GET ${name}`, e.message);
    }
  }

  // --------------------------------------------
  // 12) INVALID INPUT TESTS
  // --------------------------------------------
  const badCaptain = await request(
    "/api/captain-registration/",
    {
      method: "POST",
      body: JSON.stringify({
        fullName: "",
        phone: "",
        password: "",
      }),
    }
  );

  assertStatus(
    "Validation - Missing Captain Data",
    badCaptain,
    [400, 422]
  );

  // --------------------------------------------
  // 13) REPEAT REVIEW PROTECTION
  // --------------------------------------------
  if (rejectId) {
    const secondReject = await request(
      `/api/captain-registration/${rejectId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: "محاولة مراجعة ثانية",
        }),
      }
    );

    assertStatus(
      "Protection - Reject Already Rejected",
      secondReject,
      [400]
    );
  }

  if (approveId) {
    const secondApprove = await request(
      `/api/captain-registration/${approveId}/approve`,
      {
        method: "POST",
      }
    );

    assertStatus(
      "Protection - Approve Already Approved",
      secondApprove,
      [400]
    );
  }

  console.log("");
  console.log("==============================================");
  console.log("                TEST SUMMARY");
  console.log("==============================================");
  console.log(`✅ PASS : ${passed}`);
  console.log(`❌ FAIL : ${failed}`);
  console.log(`⚠️ SKIP : ${skipped}`);
  console.log("==============================================");
  console.log("");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("\n❌ TEST RUNNER ERROR:", err);
  process.exit(1);
});
