const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const CUSTOMER_EMAIL = "customer993@dzwan.local";
const CUSTOMER_PASSWORD = "Customer@2026_Test";

const CAPTAIN_EMAIL = "approve-1788550589691@dzwan.local";
const CAPTAIN_PASSWORD = "Test@123456";

const establishmentId = "6a96e60b688a25a312eb163f";
const customerId = "6a9b2031292fbb53437a385e";
const addressId = "6a9b207c292fbb53437a3860";
const productId = "6a96e91b623c2663e257c378";
const captainId = "6a9b1dc0292fbb53437a385c";

let passed = 0;
let failed = 0;

function ok(name) {
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
      `Login failed for ${email}: ${JSON.stringify(body)}`
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

async function createOrder(customerCookies, note) {
  const r = await req("/api/orders", {
    method: "POST",
    headers: {
      Cookie: customerCookies
    },
    body: JSON.stringify({
      customerId,
      establishmentId,
      addressId,
      items: [
        {
          productId,
          quantity: 1
        }
      ],
      customerNote: note
    })
  });

  show("CREATE ORDER", r);

  if (!r.body?.order?._id) {
    throw new Error(
      `Order creation failed: ${JSON.stringify(r.body)}`
    );
  }

  return r.body.order._id;
}

async function moveToOnTheWay(
  orderId,
  adminCookies,
  captainCookies
) {
  for (const status of [
    "confirmed",
    "preparing",
    "ready_for_pickup"
  ]) {
    const r = await req(
      `/api/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          Cookie: adminCookies
        },
        body: JSON.stringify({ status })
      }
    );

    show(`STATUS ${status}`, r);

    if (!r.body?.success) {
      throw new Error(
        `Could not move to ${status}: ${JSON.stringify(r.body)}`
      );
    }
  }

  const assign = await req(
    `/api/orders/${orderId}/assign-captain`,
    {
      method: "POST",
      headers: {
        Cookie: adminCookies
      },
      body: JSON.stringify({
        captainId
      })
    }
  );

  show("ASSIGN CAPTAIN", assign);

  if (!assign.body?.success) {
    throw new Error(
      `Captain assignment failed: ${JSON.stringify(assign.body)}`
    );
  }

  for (const status of ["picked_up", "on_the_way"]) {
    const r = await req(
      `/api/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          Cookie: captainCookies
        },
        body: JSON.stringify({ status })
      }
    );

    show(`STATUS ${status}`, r);

    if (!r.body?.success) {
      throw new Error(
        `Could not move to ${status}: ${JSON.stringify(r.body)}`
      );
    }
  }
}

async function main() {
  console.log("\n======================================");
  console.log(" DELIVERY PROOF COMPLETE TEST");
  console.log("======================================");

  console.log("\n[1] LOGIN");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  const customerCookies = await login(
    CUSTOMER_EMAIL,
    CUSTOMER_PASSWORD
  );

  const captainCookies = await login(
    CAPTAIN_EMAIL,
    CAPTAIN_PASSWORD
  );

  ok("Admin login");
  ok("Customer login");
  ok("Captain login");

  console.log("\n[2] CHECK SYSTEM SETTINGS");

  const settings = await req(
    "/api/system-settings/",
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("SYSTEM SETTINGS", settings);

  if (
    settings.body?.settings?.requireDeliveryOtp === true
  ) {
    ok("requireDeliveryOtp = true");
  } else {
    fail(
      "requireDeliveryOtp is not enabled",
      JSON.stringify(settings.body)
    );
  }

  /*
   * ORDER A
   * Test: delivered without OTP
   */
  console.log("\n[3] ORDER A - BLOCK WITHOUT OTP");

  const orderA = await createOrder(
    customerCookies,
    "اختبار منع التسليم بدون OTP"
  );

  await moveToOnTheWay(
    orderA,
    adminCookies,
    captainCookies
  );

  let r = await req(
    `/api/orders/${orderA}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        status: "delivered"
      })
    }
  );

  show("DELIVERED WITHOUT OTP", r);

  if (
    r.status === 403 &&
    r.body?.code === "DELIVERY_OTP_REQUIRED"
  ) {
    ok("Delivered blocked without OTP");
  } else {
    fail(
      "Delivered was not blocked without OTP",
      JSON.stringify(r.body)
    );
  }

  /*
   * Create OTP
   */
  console.log("\n[4] ORDER A - CREATE OTP");

  r = await req(
    `/api/delivery-proof/${orderA}/otp`,
    {
      method: "POST",
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("CREATE OTP", r);

  const otpA = r.body?.proof?.otp;

  if (
    r.status === 200 &&
    /^\d{6}$/.test(String(otpA || ""))
  ) {
    ok("OTP created");
  } else {
    fail(
      "OTP creation failed",
      JSON.stringify(r.body)
    );
  }

  /*
   * Wrong OTP
   */
  console.log("\n[5] ORDER A - WRONG OTP");

  r = await req(
    `/api/delivery-proof/${orderA}/otp/verify`,
    {
      method: "POST",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        otp: "111111"
      })
    }
  );

  show("WRONG OTP", r);

  if (
    r.status === 400 &&
    r.body?.message === "DELIVERY_OTP_INVALID"
  ) {
    ok("Wrong OTP rejected");
  } else {
    fail(
      "Wrong OTP was not rejected correctly",
      JSON.stringify(r.body)
    );
  }

  /*
   * Proof details
   */
  console.log("\n[6] ORDER A - PROOF DETAILS");

  r = await req(
    `/api/delivery-proof/${orderA}`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("PROOF DETAILS", r);

  if (r.status === 200 && r.body?.proof) {
    ok("Proof details endpoint works");

    if (
      !Object.prototype.hasOwnProperty.call(
        r.body.proof,
        "otpHash"
      )
    ) {
      ok("otpHash is not exposed");
    } else {
      fail("otpHash is exposed in proof details");
    }
  } else {
    fail(
      "Proof details endpoint failed",
      JSON.stringify(r.body)
    );
  }

  /*
   * ORDER B
   * Correct OTP flow
   */
  console.log("\n[7] ORDER B - CORRECT OTP FLOW");

  const orderB = await createOrder(
    customerCookies,
    "اختبار إتمام التسليم بالـOTP الصحيح"
  );

  await moveToOnTheWay(
    orderB,
    adminCookies,
    captainCookies
  );

  r = await req(
    `/api/delivery-proof/${orderB}/otp`,
    {
      method: "POST",
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("CREATE OTP B", r);

  const otpB = r.body?.proof?.otp;

  if (!/^\d{6}$/.test(String(otpB || ""))) {
    throw new Error(
      `Could not obtain OTP B: ${JSON.stringify(r.body)}`
    );
  }

  ok("OTP B created");

  r = await req(
    `/api/delivery-proof/${orderB}/otp/verify`,
    {
      method: "POST",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        otp: otpB
      })
    }
  );

  show("VERIFY CORRECT OTP B", r);

  if (
    r.status === 200 &&
    r.body?.proof === true
  ) {
    ok("Correct OTP accepted");
  } else {
    fail(
      "Correct OTP was not accepted",
      JSON.stringify(r.body)
    );
  }

  r = await req(
    `/api/orders/${orderB}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        status: "delivered"
      })
    }
  );

  show("DELIVERED WITH VERIFIED OTP", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?.status === "delivered" &&
    r.body?.order?.deliveredAt
  ) {
    ok("Delivered after verified OTP");
    ok("deliveredAt recorded");
  } else {
    fail(
      "Delivered after OTP failed",
      JSON.stringify(r.body)
    );
  }

  /*
   * Proof after delivery
   */
  console.log("\n[8] ORDER B - FINAL PROOF");

  r = await req(
    `/api/delivery-proof/${orderB}`,
    {
      headers: {
        Cookie: captainCookies
      }
    }
  );

  show("FINAL PROOF", r);

  if (r.status === 200 && r.body?.proof) {
    ok("Final proof can be retrieved");

    if (r.body.proof.otpVerifiedAt) {
      ok("otpVerifiedAt recorded");
    } else {
      fail("otpVerifiedAt was not recorded");
    }
  } else {
    fail(
      "Final proof retrieval failed",
      JSON.stringify(r.body)
    );
  }

  /*
   * Verify same OTP again
   */
  console.log("\n[9] ORDER B - VERIFY SAME OTP AGAIN");

  r = await req(
    `/api/delivery-proof/${orderB}/otp/verify`,
    {
      method: "POST",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        otp: otpB
      })
    }
  );

  show("VERIFY OTP AGAIN", r);

  if (
    r.status === 200 &&
    r.body?.proof === true
  ) {
    ok("Verified OTP remains valid after verification");
  } else {
    fail(
      "Repeated OTP verification failed",
      JSON.stringify(r.body)
    );
  }

  /*
   * Final order read
   */
  console.log("\n[10] FINAL ORDER");

  r = await req(
    `/api/orders/${orderB}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("FINAL ORDER", r);

  if (
    r.status === 200 &&
    r.body?.order?.status === "delivered"
  ) {
    ok("Final order status = delivered");
  } else {
    fail(
      "Final order status is not delivered",
      JSON.stringify(r.body)
    );
  }

  console.log("\n======================================");
  console.log(" DELIVERY PROOF TEST SUMMARY");
  console.log("======================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  console.log(`\nORDER A: ${orderA}`);
  console.log(`ORDER B: ${orderB}`);

  if (failed === 0) {
    console.log("\n🎉 ALL DELIVERY PROOF TESTS PASSED");
    process.exit(0);
  }

  console.log(
    "\n⚠️ DELIVERY PROOF TESTS HAVE FAILURES"
  );

  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
