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
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const text = await r.text();

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  const cookies = r.headers.getSetCookie?.() ?? [];

  if (!r.ok || !body?.success || !cookies.length) {
    throw new Error(
      `Login failed ${email}\nHTTP ${r.status}\n${JSON.stringify(body)}`
    );
  }

  return cookies.map(x => x.split(";", 1)[0]).join("; ");
}

async function request(cookie, method, path, body = undefined) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const r = await fetch(`${BASE}${path}`, options);
  const text = await r.text();

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    status: r.status,
    body: parsed,
  };
}

function customerIdFrom(body) {
  return (
    body?.customer?._id ??
    body?.customer?.id ??
    body?.data?.customer?._id ??
    body?.data?.customer?.id ??
    null
  );
}

async function main() {
  console.log("\n==============================================");
  console.log(" ADMIN CUSTOMER COMPLETE FUNCTIONAL TEST");
  console.log("==============================================");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  pass("Admin login");

  // ============================================================
  // 1. LIST CUSTOMERS
  // ============================================================

  let r = await request(
    adminCookies,
    "GET",
    "/api/customers/"
  );

  if (
    r.status === 200 &&
    r.body?.success &&
    Array.isArray(r.body?.customers)
  ) {
    pass("Admin can list customers");
  } else {
    fail(
      "Customer list",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 2. CREATE CUSTOMER
  // ============================================================

  const email =
    `customer-management-${stamp}@dzwan.local`;

  const phone =
    `010${String(stamp).slice(-8)}`;

  const password =
    "Customer@123456";

  r = await request(
    adminCookies,
    "POST",
    "/api/customers/",
    {
      fullName:
        `عميل اختبار إدارة ${stamp}`,
      phone,
      email,
      password,
    }
  );

  console.log("\n========== CREATE CUSTOMER ==========");
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));

  const customerId =
    customerIdFrom(r.body);

  if (
    r.status === 201 &&
    r.body?.success &&
    customerId &&
    r.body?.customer?.role === "customer" &&
    r.body?.customer?.status === "active"
  ) {
    pass("Create customer");
  } else {
    fail(
      "Create customer",
      JSON.stringify(r.body)
    );
    process.exit(2);
  }

  // ============================================================
  // 3. GET CUSTOMER
  // ============================================================

  r = await request(
    adminCookies,
    "GET",
    `/api/customers/${customerId}`
  );

  if (
    r.status === 200 &&
    r.body?.success &&
    String(r.body?.customer?._id) ===
      String(customerId)
  ) {
    pass("Get customer");
  } else {
    fail(
      "Get customer",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 4. UPDATE CUSTOMER
  // ============================================================

  const updatedName =
    `عميل معدل ${stamp}`;

  const updatedPhone =
    `011${String(stamp).slice(-8)}`;

  r = await request(
    adminCookies,
    "PATCH",
    `/api/customers/${customerId}`,
    {
      fullName: updatedName,
      phone: updatedPhone,
      status: "active",
    }
  );

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.customer?.fullName === updatedName &&
    r.body?.customer?.phone === updatedPhone
  ) {
    pass("Update customer");
  } else {
    fail(
      "Update customer",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 5. VERIFY CUSTOMER UPDATE
  // ============================================================

  r = await request(
    adminCookies,
    "GET",
    `/api/customers/${customerId}`
  );

  if (
    r.status === 200 &&
    r.body?.customer?.fullName === updatedName &&
    r.body?.customer?.phone === updatedPhone
  ) {
    pass("Customer update persisted");
  } else {
    fail(
      "Customer update persistence",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 6. DUPLICATE PHONE
  // ============================================================

  r = await request(
    adminCookies,
    "POST",
    "/api/customers/",
    {
      fullName: "عميل مكرر",
      phone: updatedPhone,
      email:
        `duplicate-${stamp}@dzwan.local`,
      password,
    }
  );

  if (r.status === 409) {
    pass("Duplicate customer phone rejected");
  } else {
    fail(
      "Duplicate phone validation",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 7. LIST ADDRESSES - EMPTY
  // ============================================================

  r = await request(
    adminCookies,
    "GET",
    `/api/customers/${customerId}/addresses`
  );

  if (
    r.status === 200 &&
    r.body?.success &&
    Array.isArray(r.body?.addresses) &&
    r.body.addresses.length === 0
  ) {
    pass("New customer starts with no addresses");
  } else {
    fail(
      "Initial customer addresses",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 8. CREATE FIRST ADDRESS
  // ============================================================

  r = await request(
    adminCookies,
    "POST",
    `/api/customers/${customerId}/addresses`,
    {
      governorateId: GOVERNORATE_ID,
      areaId: AREA_ID,
      label: "البيت",
      address: "عنوان اختبار العميل",
      notes: "العنوان الأول",
      latitude: 29.906,
      longitude: 30.906,
    }
  );

  console.log("\n========== CREATE FIRST ADDRESS ==========");
  console.log("HTTP:", r.status);
  console.log(JSON.stringify(r.body, null, 2));

  const address1Id =
    r.body?.address?._id ??
    r.body?.address?.id ??
    null;

  if (
    r.status === 201 &&
    r.body?.success &&
    address1Id &&
    r.body?.address?.isDefault === true
  ) {
    pass("Create first address and auto-default");
  } else {
    fail(
      "Create first address",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 9. CREATE SECOND ADDRESS DEFAULT
  // ============================================================

  r = await request(
    adminCookies,
    "POST",
    `/api/customers/${customerId}/addresses`,
    {
      governorateId: GOVERNORATE_ID,
      areaId: AREA_ID,
      label: "الشغل",
      address: "عنوان العمل",
      notes: null,
      latitude: 29.907,
      longitude: 30.907,
      isDefault: true,
    }
  );

  const address2Id =
    r.body?.address?._id ??
    r.body?.address?.id ??
    null;

  if (
    r.status === 201 &&
    r.body?.success &&
    address2Id &&
    r.body?.address?.isDefault === true
  ) {
    pass("Create second address as default");
  } else {
    fail(
      "Create second address",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 10. VERIFY ONLY SECOND IS DEFAULT
  // ============================================================

  r = await request(
    adminCookies,
    "GET",
    `/api/customers/${customerId}/addresses`
  );

  const addresses =
    Array.isArray(r.body?.addresses)
      ? r.body.addresses
      : [];

  const a1 =
    addresses.find(
      x => String(x._id) === String(address1Id)
    );

  const a2 =
    addresses.find(
      x => String(x._id) === String(address2Id)
    );

  const defaults =
    addresses.filter(x => x.isDefault === true);

  if (
    r.status === 200 &&
    a1 &&
    a2 &&
    a1.isDefault === false &&
    a2.isDefault === true &&
    defaults.length === 1
  ) {
    pass("Only one customer address is default");
  } else {
    fail(
      "Default address integrity",
      JSON.stringify(addresses)
    );
  }

  // ============================================================
  // 11. UPDATE FIRST ADDRESS AND MAKE DEFAULT
  // ============================================================

  r = await request(
    adminCookies,
    "PATCH",
    `/api/customers/addresses/${address1Id}`,
    {
      label: "البيت الرئيسي",
      address: "عنوان البيت المعدل",
      isDefault: true,
    }
  );

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.address?.label === "البيت الرئيسي" &&
    r.body?.address?.isDefault === true
  ) {
    pass("Update address and make it default");
  } else {
    fail(
      "Update customer address",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 12. VERIFY SECOND NO LONGER DEFAULT
  // ============================================================

  r = await request(
    adminCookies,
    "GET",
    `/api/customers/${customerId}/addresses`
  );

  const addressesAfterUpdate =
    Array.isArray(r.body?.addresses)
      ? r.body.addresses
      : [];

  const updatedA1 =
    addressesAfterUpdate.find(
      x => String(x._id) === String(address1Id)
    );

  const updatedA2 =
    addressesAfterUpdate.find(
      x => String(x._id) === String(address2Id)
    );

  if (
    updatedA1?.isDefault === true &&
    updatedA2?.isDefault === false
  ) {
    pass("Default switch persisted");
  } else {
    fail(
      "Default switch persistence",
      JSON.stringify(addressesAfterUpdate)
    );
  }

  // ============================================================
  // 13. INVALID GOVERNORATE / AREA
  // ============================================================

  r = await request(
    adminCookies,
    "POST",
    `/api/customers/${customerId}/addresses`,
    {
      governorateId: "000000000000000000000000",
      areaId: AREA_ID,
      label: "عنوان خاطئ",
      address: "عنوان خاطئ",
    }
  );

  if (r.status === 400) {
    pass("Invalid governorate/area rejected");
  } else {
    fail(
      "Invalid address location validation",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 14. INVALID ADDRESS ID
  // ============================================================

  r = await request(
    adminCookies,
    "PATCH",
    "/api/customers/addresses/invalid-id",
    {
      label: "اختبار"
    }
  );

  if (r.status === 404 || r.status === 400) {
    pass("Invalid address ID handled");
  } else {
    fail(
      "Invalid address ID handling",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 15. CUSTOMER LOGIN
  // ============================================================

  let customerCookies = null;

  try {
    customerCookies = await login(
      email,
      password
    );

    pass("Customer login");
  } catch (e) {
    fail(
      "Customer login",
      e.message
    );
  }

  // ============================================================
  // 16. CUSTOMER /ME
  // ============================================================

  if (customerCookies) {
    r = await request(
      customerCookies,
      "GET",
      "/api/auth/me"
    );

    if (
      r.status === 200 &&
      r.body?.success &&
      r.body?.user?.role === "customer" &&
      String(r.body?.user?.id) ===
        String(customerId)
    ) {
      pass("Customer /me");
    } else {
      fail(
        "Customer /me",
        JSON.stringify(r.body)
      );
    }

    // Customer must NOT access admin customer management
    r = await request(
      customerCookies,
      "GET",
      "/api/customers/"
    );

    if (r.status === 403 || r.status === 401) {
      pass("Customer cannot access customer management");
    } else {
      fail(
        "Customer management access control",
        JSON.stringify(r.body)
      );
    }
  }

  // ============================================================
  // 17. DELETE SECOND ADDRESS
  // ============================================================

  r = await request(
    adminCookies,
    "DELETE",
    `/api/customers/addresses/${address2Id}`
  );

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Delete second address");
  } else {
    fail(
      "Delete second address",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 18. DELETE DEFAULT ADDRESS
  // ============================================================

  r = await request(
    adminCookies,
    "DELETE",
    `/api/customers/addresses/${address1Id}`
  );

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Delete default address");
  } else {
    fail(
      "Delete default address",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 19. CREATE TWO ADDRESSES AGAIN FOR DEFAULT FALLBACK
  // ============================================================

  const addrA = await request(
    adminCookies,
    "POST",
    `/api/customers/${customerId}/addresses`,
    {
      governorateId: GOVERNORATE_ID,
      areaId: AREA_ID,
      label: "عنوان A",
      address: "عنوان A",
      isDefault: true,
    }
  );

  const addrAId =
    addrA.body?.address?._id;

  const addrB = await request(
    adminCookies,
    "POST",
    `/api/customers/${customerId}/addresses`,
    {
      governorateId: GOVERNORATE_ID,
      areaId: AREA_ID,
      label: "عنوان B",
      address: "عنوان B",
      isDefault: false,
    }
  );

  const addrBId =
    addrB.body?.address?._id;

  if (
    addrA.status === 201 &&
    addrB.status === 201 &&
    addrAId &&
    addrBId
  ) {
    pass("Create addresses for default fallback test");
  } else {
    fail(
      "Create fallback addresses",
      JSON.stringify({
        addrA: addrA.body,
        addrB: addrB.body
      })
    );
  }

  // ============================================================
  // 20. DELETE DEFAULT -> NEXT ADDRESS BECOMES DEFAULT
  // ============================================================

  r = await request(
    adminCookies,
    "DELETE",
    `/api/customers/addresses/${addrAId}`
  );

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    const verify = await request(
      adminCookies,
      "GET",
      `/api/customers/${customerId}/addresses`
    );

    const remaining =
      Array.isArray(verify.body?.addresses)
        ? verify.body.addresses
        : [];

    const replacement =
      remaining.find(
        x => String(x._id) === String(addrBId)
      );

    if (
      replacement &&
      replacement.isDefault === true
    ) {
      pass("Deleting default promotes another address");
    } else {
      fail(
        "Default fallback after deletion",
        JSON.stringify(remaining)
      );
    }
  } else {
    fail(
      "Delete default for fallback test",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 21. DELETE CUSTOMER
  // ============================================================

  r = await request(
    adminCookies,
    "DELETE",
    `/api/customers/${customerId}`
  );

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Delete customer with addresses");
  } else {
    fail(
      "Delete customer",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 22. VERIFY CUSTOMER GONE
  // ============================================================

  r = await request(
    adminCookies,
    "GET",
    `/api/customers/${customerId}`
  );

  if (r.status === 404) {
    pass("Deleted customer is gone");
  } else {
    fail(
      "Deleted customer still accessible",
      JSON.stringify(r.body)
    );
  }

  // ============================================================
  // 23. VERIFY CUSTOMER LOGIN IS GONE
  // ============================================================

  try {
    await login(
      email,
      password
    );

    fail(
      "Deleted customer can still login",
      "Login unexpectedly succeeded"
    );
  } catch {
    pass("Deleted customer can no longer login");
  }

  console.log("\n==============================================");
  console.log(" ADMIN CUSTOMER TEST SUMMARY");
  console.log("==============================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  if (failed === 0) {
    console.log(
      "\n🎉 ALL ADMIN CUSTOMER TESTS PASSED"
    );
    process.exit(0);
  }

  console.log(
    "\n⚠️ ADMIN CUSTOMER TESTS HAVE FAILURES"
  );
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
