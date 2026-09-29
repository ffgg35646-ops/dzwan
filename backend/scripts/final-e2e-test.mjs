const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

let cookie = "";
let passed = 0;
let failed = 0;

let establishmentId = null;
let customerId = null;
let productId = null;
let orderId = null;
let captainId = null;

let testCustomerId = null;
let testCustomerEmail = null;
let testCustomerPassword = "Dzwan@2026_E2E";

function pass(name, extra = "") {
  passed++;
  console.log(`✅ ${name}${extra ? ` — ${extra}` : ""}`);
}

function fail(name, extra = "") {
  failed++;
  console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`);
}

async function req(method, path, body, auth = true) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth && cookie) {
    headers["Cookie"] = cookie;
  }

  const r = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await r.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  const cookies =
    typeof r.headers.getSetCookie === "function"
      ? r.headers.getSetCookie()
      : [];

  if (cookies.length) {
    cookie = cookies
      .map(x => x.split(";", 1)[0])
      .join("; ");
  }

  return {
    status: r.status,
    body: data,
  };
}

function idOf(x) {
  return x?._id || x?.id || x?.data?._id || x?.data?.id || null;
}

function arrayOf(x, ...keys) {
  if (Array.isArray(x)) return x;

  for (const key of keys) {
    if (Array.isArray(x?.[key])) return x[key];
    if (Array.isArray(x?.data?.[key])) return x.data[key];
  }

  if (Array.isArray(x?.data)) return x.data;

  return [];
}

async function main() {
  console.log("\n==============================================");
  console.log("🔥 FINAL ZAJEL E2E TEST");
  console.log("Shop → Order → Admin → Captain → Delivery");
  console.log("==============================================\n");

  // =====================================================
  // 1. LOGIN
  // =====================================================

  let r = await req(
    "POST",
    "/api/auth/login",
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
    false
  );

  if (r.status === 200 && cookie) {
    pass("Admin Login", "HTTP 200");
  } else {
    fail("Admin Login", `HTTP ${r.status}`);
    process.exit(1);
  }

  // =====================================================
  // 2. ESTABLISHMENTS
  // =====================================================

  r = await req("GET", "/api/establishments");

  const establishments = arrayOf(
    r.body,
    "establishments",
    "items"
  );

  if (r.status === 200) {
    pass(
      "Get Establishments",
      `count=${establishments.length}`
    );
  } else {
    fail(
      "Get Establishments",
      `HTTP ${r.status}`
    );
  }

  if (establishments.length) {
    establishmentId = idOf(establishments[0]);
    pass(
      "Find Establishment",
      `id=${establishmentId}`
    );
  } else {
    fail("Find Establishment", "لا يوجد Establishment");
  }

  // =====================================================
  // 3. CUSTOMERS
  // =====================================================

  r = await req("GET", "/api/customers");

  const customers = arrayOf(
    r.body,
    "customers",
    "items"
  );

  if (r.status === 200) {
    pass(
      "Get Customers",
      `count=${customers.length}`
    );
  } else {
    fail(
      "Get Customers",
      `HTTP ${r.status}`
    );
  }

  if (customers.length) {
    customerId = idOf(customers[0]);
    pass(
      "Find Customer",
      `id=${customerId}`
    );
  } else {
    fail("Find Customer", "لا يوجد Customer");
  }

  // =====================================================
  // 4. PRODUCTS
  // =====================================================

  let products = [];
  let productFound = false;

  // نبحث عن Establishment عنده Product بدل الاعتماد على أول واحد
  for (const establishment of establishments) {
    const candidateEstablishmentId = idOf(establishment);

    if (!candidateEstablishmentId) continue;

    const productResponse = await req(
      "GET",
      `/api/products?establishmentId=${candidateEstablishmentId}`
    );

    if (productResponse.status !== 200) continue;

    const candidateProducts = arrayOf(
      productResponse.body,
      "products",
      "items"
    );

    if (candidateProducts.length > 0) {
      establishmentId = candidateEstablishmentId;
      products = candidateProducts;
      productFound = true;

      pass(
        "Get Products",
        `establishmentId=${establishmentId}, count=${products.length}`
      );

      productId = idOf(products[0]);

      pass(
        "Find Product",
        `id=${productId}`
      );

      break;
    }
  }

  if (!productFound) {
    fail(
      "Get Products",
      "لا توجد Products في أي Establishment"
    );

    fail(
      "Find Product",
      "لا يوجد Product صالح للـE2E"
    );
  }

  // =====================================================
  // 5. E2E CAPTAIN
  // =====================================================

  const selectedEstablishmentForCaptain =
    establishments.find(
      (x) => idOf(x) === establishmentId
    );

  const captainGovernorateId =
    idOf(selectedEstablishmentForCaptain?.governorateId) ||
    selectedEstablishmentForCaptain?.governorateId ||
    null;

  const captainAreaId =
    idOf(selectedEstablishmentForCaptain?.areaId) ||
    selectedEstablishmentForCaptain?.areaId ||
    null;

  const testCaptainEmail =
    `e2e-captain-${Date.now()}@dzwan.local`;

  const testCaptainPassword =
    "Dzwan@2026_Captain";

  let captainRegistrationId = null;

  if (
    captainGovernorateId &&
    captainAreaId
  ) {
    const captainPhone =
      `071${Date.now().toString().slice(-8)}`;

    // تسجيل Captain
    r = await req(
      "POST",
      "/api/captain-registration",
      {
        fullName: "Zajel E2E Captain",
        phone: captainPhone,
        email: testCaptainEmail,
        password: testCaptainPassword,
        gmail: testCaptainEmail,
        governorateId: String(captainGovernorateId),
        areaId: String(captainAreaId),
        idFrontUrl: "https://example.com/e2e-id-front.jpg",
        idBackUrl: "https://example.com/e2e-id-back.jpg",
        residenceFrontUrl: "https://example.com/e2e-res-front.jpg",
        residenceBackUrl: "https://example.com/e2e-res-back.jpg",
      },
      false
    );

    if (r.status === 201) {
      captainRegistrationId =
        idOf(r.body?.registrationId) ||
        r.body?.registrationId ||
        null;

      if (captainRegistrationId) {
        pass(
          "Create E2E Captain Registration",
          `id=${captainRegistrationId}`
        );
      } else {
        fail(
          "Create E2E Captain Registration",
          "registrationId غير موجود"
        );
      }
    } else {
      fail(
        "Create E2E Captain Registration",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }

    // اعتماد Captain بواسطة Admin
    if (captainRegistrationId) {
      r = await req(
        "POST",
        `/api/captain-registration/${captainRegistrationId}/approve`
      );

      if (r.status === 200) {
        captainId =
          idOf(r.body?.captain);

        if (captainId) {
          pass(
            "Approve E2E Captain",
            `id=${captainId}`
          );
        } else {
          fail(
            "Approve E2E Captain",
            "Captain ID غير موجود"
          );
        }
      } else {
        fail(
          "Approve E2E Captain",
          `HTTP ${r.status} — ${r.body?.message || ""}`
        );
      }
    }
  } else {
    fail(
      "E2E Captain Setup",
      "Governorate/Area للـEstablishment غير متوفرين"
    );
  }

  // =====================================================
  // 6. TEST CUSTOMER + ADDRESS + CUSTOMER LOGIN
  // =====================================================

  // نحتفظ ببيانات الـAdmin مؤقتًا
  const adminCookie = cookie;

  // إنشاء Customer اختبار مؤقت
  testCustomerEmail =
    `e2e-${Date.now()}@dzwan.local`;

  r = await req(
    "POST",
    "/api/customers",
    {
      fullName: "Zajel E2E Customer",
      phone: `070${Date.now().toString().slice(-8)}`,
      email: testCustomerEmail,
      password: testCustomerPassword,
    }
  );

  if (r.status === 201) {
    testCustomerId =
      idOf(r.body?.customer);

    if (testCustomerId) {
      pass(
        "Create E2E Customer",
        `id=${testCustomerId}`
      );
    } else {
      fail(
        "Create E2E Customer",
        "Customer ID غير موجود"
      );
    }
  } else {
    fail(
      "Create E2E Customer",
      `HTTP ${r.status}`
    );
  }

  // إنشاء Address مطابق لمحافظة ومنطقة المنشأة المختارة
  let addressId = null;

  const selectedEstablishment =
    establishments.find(
      (x) => idOf(x) === establishmentId
    );

  const governorateId =
    selectedEstablishment?.governorateId;

  const areaId =
    selectedEstablishment?.areaId;

  if (
    testCustomerId &&
    governorateId &&
    areaId
  ) {
    r = await req(
      "POST",
      `/api/customers/${testCustomerId}/addresses`,
      {
        governorateId: String(
          idOf(governorateId) || governorateId
        ),
        areaId: String(
          idOf(areaId) || areaId
        ),
        label: "E2E Address",
        address: "E2E Test Address",
        notes: "Created automatically by final E2E",
        latitude: selectedEstablishment?.latitude ?? null,
        longitude: selectedEstablishment?.longitude ?? null,
        isDefault: true,
      }
    );

    if (r.status === 201) {
      addressId = idOf(r.body?.address);

      if (addressId) {
        pass(
          "Create E2E Address",
          `id=${addressId}`
        );
      } else {
        fail(
          "Create E2E Address",
          "Address ID غير موجود"
        );
      }
    } else {
      fail(
        "Create E2E Address",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  } else {
    fail(
      "Create E2E Address",
      "Governorate/Area للـEstablishment غير متوفرين"
    );
  }

  // تسجيل دخول Customer
  if (testCustomerId && addressId) {
    cookie = "";

    r = await req(
      "POST",
      "/api/auth/login",
      {
        email: testCustomerEmail,
        password: testCustomerPassword,
      },
      false
    );

    if (
      r.status === 200 &&
      cookie
    ) {
      pass(
        "E2E Customer Login",
        "HTTP 200"
      );

      customerId = testCustomerId;
    } else {
      fail(
        "E2E Customer Login",
        `HTTP ${r.status}`
      );

      cookie = adminCookie;
    }
  }

  // =====================================================
  // CUSTOMER SESSION IS ACTIVE
  // =====================================================

  // =====================================================
  // 6. CREATE ORDER
  // =====================================================

  if (
    customerId &&
    establishmentId &&
    productId &&
    addressId
  ) {
    r = await req(
      "POST",
      "/api/orders",
      {
        customerId,
        establishmentId,
        addressId,
        items: [
          {
            productId,
            quantity: 1,
          },
        ],
        customerNote: "Zajel Final E2E",
      }
    );

    if (r.status === 201) {
      orderId =
        idOf(r.body?.order);

      if (orderId) {
        pass(
          "Create E2E Order",
          `id=${orderId}`
        );
      } else {
        fail(
          "Create E2E Order",
          "Order ID غير موجود"
        );
      }
    } else {
      fail(
        "Create E2E Order",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  } else {
    fail(
      "Create E2E Order",
      "بيانات Customer/Address/Establishment/Product ناقصة"
    );
  }

  // نرجع إلى جلسة الـAdmin لإكمال بقية الـE2E
  cookie = adminCookie;

  // تحديث customerId لاختبار الطلب بعد الرجوع للـAdmin لا يهم،
  // لأن orderId أصبح موجودًا بالفعل.

  // =====================================================
  // 7. GET ORDER
  // =====================================================

  if (orderId) {
    r = await req(
      "GET",
      `/api/orders/${orderId}`
    );

    const returnedOrder =
      r.body?.order ||
      r.body?.data?.order ||
      r.body;

    if (
      r.status === 200 &&
      idOf(returnedOrder)
    ) {
      pass(
        "Get Created Order",
        `id=${idOf(returnedOrder)}`
      );
    } else {
      fail(
        "Get Created Order",
        `HTTP ${r.status}`
      );
    }
  }

  // =====================================================
  // 8. ASSIGN CAPTAIN
  // =====================================================

  if (orderId && captainId) {
    r = await req(
      "POST",
      `/api/orders/${orderId}/assign-captain`,
      {
        captainId,
      }
    );

    if ([200, 201].includes(r.status)) {
      pass(
        "Assign Captain",
        `captain=${captainId}`
      );
    } else {
      fail(
        "Assign Captain",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  } else {
    fail(
      "Assign Captain",
      "Order أو Captain غير متوفر"
    );
  }

  // =====================================================
  // 9. ORDER STATUS — ADMIN FLOW
  // =====================================================

  async function moveStatus(status, label) {
    r = await req(
      "PATCH",
      `/api/orders/${orderId}/status`,
      { status }
    );

    if (r.status === 200) {
      pass(`Order Status → ${label}`);
      return true;
    }

    fail(
      `Order Status → ${label}`,
      `HTTP ${r.status} — ${r.body?.message || ""}`
    );

    return false;
  }

  let currentStatus = null;

  if (orderId) {
    r = await req(
      "GET",
      `/api/orders/${orderId}`
    );

    const currentOrder =
      r.body?.order ||
      r.body?.data?.order ||
      r.body;

    currentStatus = currentOrder?.status || null;
  }

  // نمشي فقط من الحالة الحالية المطلوبة
  if (currentStatus === "pending") {
    await moveStatus("confirmed", "Confirmed");
    currentStatus = "confirmed";
  }

  if (currentStatus === "confirmed") {
    await moveStatus("preparing", "Preparing");
    currentStatus = "preparing";
  }

  if (currentStatus === "preparing") {
    await moveStatus("ready_for_pickup", "Ready for Pickup");
    currentStatus = "ready_for_pickup";
  }

  if (currentStatus === "ready_for_pickup") {
    await moveStatus("assigned", "Assigned");
    currentStatus = "assigned";
  }

  // =====================================================
  // 10. CAPTAIN LOGIN + DELIVERY PROOF
  // =====================================================

  const adminCookieBeforeCaptain =
    cookie;

  if (orderId && captainId) {
    cookie = "";

    r = await req(
      "POST",
      "/api/auth/login",
      {
        email: testCaptainEmail,
        password: testCaptainPassword,
      },
      false
    );

    if (r.status === 200 && cookie) {
      pass(
        "E2E Captain Login",
        "HTTP 200"
      );
    } else {
      fail(
        "E2E Captain Login",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );

      cookie = adminCookieBeforeCaptain;
    }
  }

  // Captain → picked_up
  if (
    orderId &&
    captainId &&
    cookie
  ) {
    r = await req(
      "PATCH",
      `/api/orders/${orderId}/status`,
      {
        status: "picked_up",
      }
    );

    if (r.status === 200) {
      pass(
        "Captain Status → Picked Up"
      );
    } else {
      fail(
        "Captain Status → Picked Up",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  }

  // Captain → on_the_way
  if (
    orderId &&
    captainId &&
    cookie
  ) {
    r = await req(
      "PATCH",
      `/api/orders/${orderId}/status`,
      {
        status: "on_the_way",
      }
    );

    if (r.status === 200) {
      pass(
        "Captain Status → On The Way"
      );
    } else {
      fail(
        "Captain Status → On The Way",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  }

  // =====================================================
  // 11. DELIVERY PROOF — REAL FLOW
  // =====================================================

  let deliveryOtp = null;

  if (
    orderId &&
    captainId &&
    cookie
  ) {
    // إنشاء OTP
    r = await req(
      "POST",
      `/api/delivery-proof/${orderId}/otp`
    );

    deliveryOtp =
      r.body?.proof?.otp ||
      r.body?.otp ||
      null;

    if (
      r.status === 200 &&
      deliveryOtp
    ) {
      pass(
        "Create Delivery OTP",
        "OTP generated"
      );
    } else {
      fail(
        "Create Delivery OTP",
        `HTTP ${r.status}`
      );
    }

    // التحقق من OTP
    if (deliveryOtp) {
      r = await req(
        "POST",
        `/api/delivery-proof/${orderId}/otp/verify`,
        {
          otp: deliveryOtp,
        }
      );

      if (r.status === 200) {
        pass(
          "Verify Delivery OTP",
          "HTTP 200"
        );
      } else {
        fail(
          "Verify Delivery OTP",
          `HTTP ${r.status} — ${r.body?.message || ""}`
        );
      }
    }

    // رفع صورة إثبات
    r = await req(
      "POST",
      `/api/delivery-proof/${orderId}/photo`,
      {
        photoUrl:
          "https://example.com/zajel-e2e-delivery-proof.jpg",
      }
    );

    if (r.status === 200) {
      pass(
        "Upload Delivery Proof Photo",
        "HTTP 200"
      );
    } else {
      fail(
        "Upload Delivery Proof Photo",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  }

  // =====================================================
  // 12. DELIVERED + VERIFY PROOF
  // =====================================================

  if (
    orderId &&
    captainId &&
    cookie
  ) {
    r = await req(
      "PATCH",
      `/api/orders/${orderId}/status`,
      {
        status: "delivered",
      }
    );

    if (r.status === 200) {
      pass(
        "Captain Status → Delivered"
      );
    } else {
      fail(
        "Captain Status → Delivered",
        `HTTP ${r.status} — ${r.body?.message || ""}`
      );
    }
  }

  if (orderId) {
    r = await req(
      "GET",
      `/api/delivery-proof/${orderId}`
    );

    if (
      r.status === 200 &&
      r.body?.proof
    ) {
      pass(
        "Get Delivery Proof",
        "HTTP 200"
      );
    } else {
      fail(
        "Get Delivery Proof",
        `HTTP ${r.status}`
      );
    }
  }

  // نرجع إلى Admin للتحقق النهائي
  cookie = adminCookieBeforeCaptain;

  // =====================================================
  // 13. FINAL ORDER VERIFICATION
  // =====================================================

  if (orderId) {
    r = await req(
      "GET",
      `/api/orders/${orderId}`
    );

    const finalOrder =
      r.body?.order ||
      r.body?.data?.order ||
      r.body;

    if (
      r.status === 200 &&
      finalOrder?.status === "delivered"
    ) {
      pass(
        "Final Order Verification",
        "status=delivered"
      );
    } else {
      fail(
        "Final Order Verification",
        `HTTP ${r.status} — status=${finalOrder?.status || "unknown"}`
      );
    }
  }

  // =====================================================
  // SUMMARY
  // =====================================================

  console.log("\n==============================================");
  console.log("🔥 FINAL E2E SUMMARY");
  console.log("==============================================");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("==============================================\n");

  if (failed === 0) {
    console.log("🔥🔥🔥 FINAL E2E TEST PASSED 🔥🔥🔥");
    process.exit(0);
  }

  console.log("❌ FINAL E2E TEST FAILED");
  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 FINAL E2E CRASHED");
  console.error(error);
  process.exit(3);
});
