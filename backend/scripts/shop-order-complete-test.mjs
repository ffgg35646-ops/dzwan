const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const OWNER_EMAIL = "owner-1788632038109@dzwan.local";
const OWNER_PASSWORD = "Owner@123456";

const CUSTOMER_EMAIL = "customer993@dzwan.local";
const CUSTOMER_PASSWORD = "Customer@2026_Test";

const CAPTAIN_EMAIL = "approve-1788550589691@dzwan.local";
const CAPTAIN_PASSWORD = "Test@123456";

const establishmentId = "6a9c5be8b07e88e68d537866";
const customerId = "6a9b2031292fbb53437a385e";
const addressId = "6a9b207c292fbb53437a3860";
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

  console.log(`\n========== LOGIN ${email} ==========`);
  console.log("HTTP:", res.status);
  console.log(JSON.stringify(body, null, 2));

  if (!res.ok || !body?.success || !cookies.length) {
    throw new Error(`Login failed: ${email}`);
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
  console.log(" SHOP ORDER COMPLETE TEST");
  console.log("==========================================");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  const ownerCookies = await login(
    OWNER_EMAIL,
    OWNER_PASSWORD
  );

  const customerCookies = await login(
    CUSTOMER_EMAIL,
    CUSTOMER_PASSWORD
  );

  const captainCookies = await login(
    CAPTAIN_EMAIL,
    CAPTAIN_PASSWORD
  );

  pass("Admin login");
  pass("Owner login");
  pass("Customer login");
  pass("Captain login");

  /*
   * 1. OWNER CREATES A FRESH ACTIVE PRODUCT
   */
  console.log("\n[1] OWNER CREATES TEST PRODUCT");

  const productName =
    `منتج طلب اختبار ${Date.now()}`;

  let r = await req("/api/products", {
    method: "POST",
    headers: {
      Cookie: ownerCookies
    },
    body: JSON.stringify({
      establishmentId,
      name: productName,
      description:
        "منتج مخصص لاختبار دورة طلب صاحب المنشأة",
      price: 200,
      imageUrl: null,
      status: "active"
    })
  });

  show("CREATE TEST PRODUCT", r);

  if (
    r.status >= 200 &&
    r.status < 300 &&
    r.body?.success &&
    r.body?.product?._id
  ) {
    pass("Owner creates test product");
  } else {
    fail(
      "Owner creates test product",
      JSON.stringify(r.body)
    );
    process.exit(2);
  }

  const productId = r.body.product._id;

  console.log(`PRODUCT_ID: ${productId}`);

  /*
   * 2. CUSTOMER CREATES ORDER
   */
  console.log("\n[2] CUSTOMER CREATES ORDER");

  r = await req("/api/orders", {
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
      customerNote:
        "اختبار دورة طلب صاحب المنشأة"
    })
  });

  show("CREATE ORDER", r);

  if (
    r.status >= 200 &&
    r.status < 300 &&
    r.body?.success &&
    r.body?.order?._id
  ) {
    pass("Customer can create order");
  } else {
    fail(
      "Customer cannot create order",
      JSON.stringify(r.body)
    );
    process.exit(2);
  }

  const orderId = r.body.order._id;

  console.log(`ORDER_ID: ${orderId}`);

  /*
   * 3. OWNER SEES ORDER
   */
  console.log("\n[3] OWNER SEES ORDER");

  r = await req(
    `/api/orders?establishmentId=${establishmentId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER ORDER LIST", r);

  const listedOrder =
    Array.isArray(r.body?.orders)
      ? r.body.orders.find(
          o => o._id === orderId
        )
      : null;

  if (
    r.status === 200 &&
    r.body?.success &&
    listedOrder
  ) {
    pass("Owner sees new order");
  } else {
    fail(
      "Owner does not see new order",
      JSON.stringify(r.body)
    );
  }

  /*
   * 4. OWNER READS ORDER
   */
  console.log("\n[4] OWNER READS ORDER");

  r = await req(
    `/api/orders/${orderId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER GET ORDER", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?._id === orderId
  ) {
    pass("Owner can read order");
  } else {
    fail(
      "Owner cannot read order",
      JSON.stringify(r.body)
    );
  }

  /*
   * 5. CONFIRMED
   */
  console.log("\n[5] OWNER CONFIRMS");

  r = await req(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        status: "confirmed"
      })
    }
  );

  show("CONFIRMED", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?.status === "confirmed"
  ) {
    pass("Owner confirms order");
  } else {
    fail(
      "Owner cannot confirm order",
      JSON.stringify(r.body)
    );
  }

  /*
   * 6. PREPARING
   */
  console.log("\n[6] OWNER PREPARING");

  r = await req(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        status: "preparing"
      })
    }
  );

  show("PREPARING", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?.status === "preparing"
  ) {
    pass("Owner starts preparing");
  } else {
    fail(
      "Owner cannot set preparing",
      JSON.stringify(r.body)
    );
  }

  /*
   * 7. READY
   */
  console.log("\n[7] OWNER MARKS READY");

  r = await req(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        status: "ready_for_pickup"
      })
    }
  );

  show("READY", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?.status === "ready_for_pickup"
  ) {
    pass("Owner marks order ready");
  } else {
    fail(
      "Owner cannot mark order ready",
      JSON.stringify(r.body)
    );
  }

  /*
   * 8. ASSIGN CAPTAIN
   */
  console.log("\n[8] OWNER ASSIGNS CAPTAIN");

  r = await req(
    `/api/orders/${orderId}/assign-captain`,
    {
      method: "POST",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        captainId
      })
    }
  );

  show("ASSIGN CAPTAIN", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    String(
      r.body?.order?.captainId ?? ""
    ) === captainId &&
    r.body?.order?.status === "assigned"
  ) {
    pass("Owner assigns captain");
  } else {
    fail(
      "Owner cannot assign captain",
      JSON.stringify(r.body)
    );
  }

  /*
   * 9. OWNER MUST NOT PICK UP
   */
  console.log("\n[9] OWNER TRIES PICKED_UP");

  r = await req(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        status: "picked_up"
      })
    }
  );

  show("OWNER PICKED_UP ATTEMPT", r);

  if (r.status === 403) {
    pass("Owner cannot pick up order");
  } else {
    fail(
      "Owner was allowed to pick up order",
      JSON.stringify(r.body)
    );
  }

  /*
   * 10. CAPTAIN PICKS UP
   */
  console.log("\n[10] CAPTAIN PICKS UP");

  r = await req(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        status: "picked_up"
      })
    }
  );

  show("CAPTAIN PICKED_UP", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?.status === "picked_up"
  ) {
    pass("Captain picks up order");
  } else {
    fail(
      "Captain cannot pick up order",
      JSON.stringify(r.body)
    );
  }

  /*
   * 11. OWNER SEES PICKED UP
   */
  console.log("\n[11] OWNER SEES PICKED_UP");

  r = await req(
    `/api/orders/${orderId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER SEES PICKED_UP", r);

  if (
    r.status === 200 &&
    r.body?.order?.status === "picked_up"
  ) {
    pass("Owner sees picked_up");
  } else {
    fail(
      "Owner cannot see picked_up",
      JSON.stringify(r.body)
    );
  }

  /*
   * 12. CAPTAIN ON THE WAY
   */
  console.log("\n[12] CAPTAIN ON_THE_WAY");

  r = await req(
    `/api/orders/${orderId}/status`,
    {
      method: "PATCH",
      headers: {
        Cookie: captainCookies
      },
      body: JSON.stringify({
        status: "on_the_way"
      })
    }
  );

  show("ON_THE_WAY", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.order?.status === "on_the_way"
  ) {
    pass("Captain sets on_the_way");
  } else {
    fail(
      "Captain cannot set on_the_way",
      JSON.stringify(r.body)
    );
  }

  /*
   * 13. OWNER FINAL LIST
   */
  console.log("\n[13] OWNER FINAL LIST");

  r = await req(
    `/api/orders?establishmentId=${establishmentId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWNER FINAL ORDER LIST", r);

  const finalOrder =
    Array.isArray(r.body?.orders)
      ? r.body.orders.find(
          o => o._id === orderId
        )
      : null;

  if (
    r.status === 200 &&
    finalOrder?.status === "on_the_way"
  ) {
    pass("Owner sees latest order status");
  } else {
    fail(
      "Owner final order list",
      JSON.stringify(r.body)
    );
  }

  /*
   * 14. CUSTOMER FINAL STATE
   */
  console.log("\n[14] CUSTOMER FINAL STATE");

  r = await req(
    `/api/orders/${orderId}`,
    {
      headers: {
        Cookie: customerCookies
      }
    }
  );

  show("CUSTOMER ORDER", r);

  if (
    r.status === 200 &&
    r.body?.order?.status === "on_the_way"
  ) {
    pass("Customer sees on_the_way");
  } else {
    fail(
      "Customer final order state",
      JSON.stringify(r.body)
    );
  }

  /*
   * 15. ADMIN FINAL STATE
   */
  console.log("\n[15] ADMIN FINAL STATE");

  r = await req(
    `/api/orders/${orderId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("ADMIN ORDER", r);

  if (
    r.status === 200 &&
    r.body?.order?.status === "on_the_way"
  ) {
    pass("Admin sees on_the_way");
  } else {
    fail(
      "Admin final order state",
      JSON.stringify(r.body)
    );
  }

  console.log("\n==========================================");
  console.log(" SHOP ORDER TEST SUMMARY");
  console.log("==========================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);
  console.log(`ORDER ID: ${orderId}`);
  console.log(`PRODUCT ID: ${productId}`);

  if (failed === 0) {
    console.log(
      "\n🎉 ALL SHOP ORDER TESTS PASSED"
    );
    process.exit(0);
  }

  console.log(
    "\n⚠️ SHOP ORDER TESTS HAVE FAILURES"
  );

  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
