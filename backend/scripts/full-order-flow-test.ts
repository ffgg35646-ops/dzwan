import "dotenv/config";

const BASE = "http://127.0.0.1:4000/api";

const SHOP = {
  email: "ddkcmrl@gmail.com",
  password: "DzwanShop@2026",
};

const CAPTAIN = {
  email: "captain-test@dzwan.local",
  password: "DzwanCaptain@2026",
};

const ADMIN = {
  email: "admin@dzwan.local",
  password: "Dzwan@2026_Admin",
};

const TEST_PRICE = 12000;

async function login(account: {
  email: string;
  password: string;
}) {
  const response = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account),
  });

  const data = await response.json();

  if (!response.ok || !data.accessToken) {
    throw new Error(
      `LOGIN FAILED: ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function request(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  let data: any;

  try {
    data = await response.json();
  } catch {
    data = await response.text();
  }

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

function orderOf(data: any) {
  return (
    data?.order ??
    data?.data?.order ??
    data?.data ??
    data
  );
}

function printOrder(label: string, order: any) {
  console.log(`\n===== ${label} =====`);

  console.log(
    JSON.stringify(
      {
        orderNumber: order?.orderNumber,
        status: order?.status,
        captainId:
          typeof order?.captainId === "object"
            ? order?.captainId?._id
            : order?.captainId,
        captainName:
          typeof order?.captainId === "object"
            ? order?.captainId?.fullName
            : null,
        deliveryFee: order?.deliveryFee,
        subtotal: order?.subtotal,
        total: order?.total,
        customerSnapshot:
          order?.customerSnapshot ?? null,
        items: order?.items ?? [],
      },
      null,
      2,
    ),
  );
}

async function main() {
  console.log(
    "\n========================================",
  );
  console.log(" DZWAN FULL ORDER FLOW TEST");
  console.log(
    "========================================",
  );
  console.log("هذا الملف محفوظ ولن يتم حذفه.");

  const shop = await login(SHOP);
  const captain = await login(CAPTAIN);
  const admin = await login(ADMIN);

  console.log("\n✅ تسجيل الدخول: مطعم + كابتن + أدمن");

  // آخر طلب لمعرفة مسار المطعم
  const orders = await request(
    "/orders",
    shop.accessToken,
  );

  if (!orders.ok) {
    throw new Error(
      `GET ORDERS FAILED: ${JSON.stringify(orders.data)}`,
    );
  }

  const list =
    Array.isArray(orders.data)
      ? orders.data
      : orders.data?.orders ??
        orders.data?.data ??
        [];

  const previous = list[0];

  const establishment =
    typeof previous?.establishmentId === "object"
      ? previous.establishmentId
      : null;

  if (
    !establishment?.governorateId ||
    !establishment?.areaId
  ) {
    throw new Error(
      "لم أستطع معرفة منطقة مطعم الاختبار.",
    );
  }

  const fromGovernorateId =
    establishment.governorateId;

  const fromAreaId =
    establishment.areaId;

  console.log("\n===== RESTAURANT ROUTE =====");
  console.log({
    restaurant: establishment.name,
    fromGovernorateId,
    fromAreaId,
  });

  // الوجهات
  const destinations = await request(
    "/locations/order-destinations",
    shop.accessToken,
  );

  if (!destinations.ok) {
    throw new Error(
      `DESTINATIONS FAILED: ${JSON.stringify(
        destinations.data,
      )}`,
    );
  }

  const locations =
    destinations.data?.locations ??
    destinations.data?.data ??
    [];

  let toGovernorate: any = null;
  let toArea: any = null;

  for (const location of locations) {
    if (location?.isActive === false) continue;

    for (const area of location?.areas ?? []) {
      if (area?.isActive === false) continue;

      const same =
        String(location._id) ===
          String(fromGovernorateId) &&
        String(area._id) ===
          String(fromAreaId);

      if (!same) {
        toGovernorate = location;
        toArea = area;
        break;
      }
    }

    if (toArea) break;
  }

  if (!toGovernorate || !toArea) {
    throw new Error(
      "لم أجد وجهة فعالة للاختبار.",
    );
  }

  console.log("\n===== DELIVERY ROUTE =====");
  console.log({
    fromGovernorateId,
    fromAreaId,
    toGovernorateId: toGovernorate._id,
    toAreaId: toArea._id,
  });

  // قراءة قواعد التسعير الموجودة
  const rulesResponse = await request(
    "/pricing",
    admin.accessToken,
  );

  if (!rulesResponse.ok) {
    throw new Error(
      `GET PRICING FAILED: ${JSON.stringify(
        rulesResponse.data,
      )}`,
    );
  }

  const rules = Array.isArray(rulesResponse.data)
    ? rulesResponse.data
    : rulesResponse.data?.data ?? [];

  const existing = rules.find(
    (rule: any) =>
      rule?.type === "area_to_area" &&
      String(rule?.fromGovernorateId) ===
        String(fromGovernorateId) &&
      String(rule?.fromAreaId) ===
        String(fromAreaId) &&
      String(rule?.toGovernorateId) ===
        String(toGovernorate._id) &&
      String(rule?.toAreaId) ===
        String(toArea._id),
  );

  const pricingPayload = {
    name: "اختبار دورة الطلب 12000",
    type: "area_to_area",
    amount: TEST_PRICE,
    fromGovernorateId,
    fromAreaId,
    toGovernorateId:
      toGovernorate._id,
    toAreaId: toArea._id,
    priority: 99999,
    isActive: true,
  };

  const pricingResponse = existing
    ? await request(
        `/pricing/${existing._id}`,
        admin.accessToken,
        {
          method: "PATCH",
          body: JSON.stringify(
            pricingPayload,
          ),
        },
      )
    : await request(
        "/pricing",
        admin.accessToken,
        {
          method: "POST",
          body: JSON.stringify(
            pricingPayload,
          ),
        },
      );

  if (!pricingResponse.ok) {
    throw new Error(
      `PRICING FAILED: ${JSON.stringify(
        pricingResponse.data,
      )}`,
    );
  }

  console.log(
    `\n✅ سعر الاختبار = ${TEST_PRICE} د.ع`,
  );

  // إنشاء طلب من حساب المطعم
  const createResponse = await request(
    "/orders",
    shop.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        customerName:
          "عميل اختبار DZWAN الكامل",
        customerPhone:
          "07700000000",
        deliveryAddress:
          "عنوان اختبار الدورة الكاملة",
        deliveryGovernorateId:
          toGovernorate._id,
        deliveryAreaId:
          toArea._id,
        deliveryLatitude:
          30.5085,
        deliveryLongitude:
          47.7804,
        subtotal: 10000,
        customerNote:
          "اختبار كامل للسعر والكابتن والتوصيل",
      }),
    },
  );

  console.log(
    "\n===== CREATE ORDER =====",
  );
  console.log(
    "HTTP:",
    createResponse.status,
  );
  console.log(
    JSON.stringify(
      createResponse.data,
      null,
      2,
    ),
  );

  if (!createResponse.ok) {
    throw new Error(
      `CREATE ORDER FAILED: ${JSON.stringify(
        createResponse.data,
      )}`,
    );
  }

  const created =
    orderOf(createResponse.data);

  const orderId =
    created?._id ?? created?.id;

  if (!orderId) {
    throw new Error(
      "لم يرجع الطلب ID بعد الإنشاء.",
    );
  }

  printOrder(
    "PENDING - SHOP CREATED",
    created,
  );

  if (
    Number(created?.deliveryFee) !==
    TEST_PRICE
  ) {
    throw new Error(
      `السعر المتوقع ${TEST_PRICE} لكن الطلب أخذ ${created?.deliveryFee}`,
    );
  }

  console.log(
    "\n✅ إنشاء الطلب والسعر نجحا.",
  );

  // محاولة التوزيع
  const dispatch = await request(
    `/dispatch/orders/${orderId}/dispatch`,
    admin.accessToken,
    {
      method: "POST",
    },
  );

  console.log(
    "\n===== DISPATCH =====",
  );
  console.log(
    "HTTP:",
    dispatch.status,
  );
  console.log(
    JSON.stringify(
      dispatch.data,
      null,
      2,
    ),
  );

  // قبول الكابتن
  const accept = await request(
    `/dispatch/orders/${orderId}/accept`,
    captain.accessToken,
    {
      method: "POST",
    },
  );

  console.log(
    "\n===== CAPTAIN ACCEPT =====",
  );
  console.log(
    "HTTP:",
    accept.status,
  );
  console.log(
    JSON.stringify(
      accept.data,
      null,
      2,
    ),
  );

  if (!accept.ok) {
    throw new Error(
      `CAPTAIN ACCEPT FAILED: ${JSON.stringify(
        accept.data,
      )}`,
    );
  }

  // إنشاء رمز التسليم بالكابتن
  const otpCreate = await request(
    `/delivery-proof/${orderId}/otp`,
    captain.accessToken,
    {
      method: "POST",
    },
  );

  console.log(
    "\n===== CREATE DELIVERY OTP =====",
  );
  console.log(
    "HTTP:",
    otpCreate.status,
  );
  console.log(
    JSON.stringify(
      otpCreate.data,
      null,
      2,
    ),
  );

  if (!otpCreate.ok) {
    throw new Error(
      `CREATE OTP FAILED: ${JSON.stringify(
        otpCreate.data,
      )}`,
    );
  }

  const deliveryOtp =
    otpCreate.data?.proof?.otp;

  if (!deliveryOtp) {
    throw new Error(
      "CREATE OTP FAILED: OTP not returned by backend",
    );
  }

  // التحقق من رمز التسليم
  const otpVerify = await request(
    `/delivery-proof/${orderId}/otp/verify`,
    captain.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        otp: String(deliveryOtp),
      }),
    },
  );

  console.log(
    "\n===== VERIFY DELIVERY OTP =====",
  );
  console.log(
    "HTTP:",
    otpVerify.status,
  );
  console.log(
    JSON.stringify(
      otpVerify.data,
      null,
      2,
    ),
  );

  if (!otpVerify.ok) {
    throw new Error(
      `VERIFY OTP FAILED: ${JSON.stringify(
        otpVerify.data,
      )}`,
    );
  }

  // ===== دورة الطلب الكاملة =====
  const lifecycle = [
    "heading_to_shop",
    "arrived_at_shop",
  ];

  for (const status of lifecycle) {
    const update = await request(
      `/orders/${orderId}/status`,
      captain.accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      },
    );

    console.log(
      `\\n===== ${status} =====`,
    );
    console.log(
      "HTTP:",
      update.status,
    );
    console.log(
      JSON.stringify(
        update.data,
        null,
        2,
      ),
    );

    if (!update.ok) {
      throw new Error(
        `${status} FAILED: ${JSON.stringify(
          update.data,
        )}`,
      );
    }
  }

  // استلام الطلب من المطعم
  const pickup = await request(
    `/orders/${orderId}/status`,
    captain.accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "picked_up",
      }),
    },
  );

  console.log(
    "\\n===== picked_up =====",
  );
  console.log(
    "HTTP:",
    pickup.status,
  );
  console.log(
    JSON.stringify(
      pickup.data,
      null,
      2,
    ),
  );

  if (!pickup.ok) {
    throw new Error(
      `picked_up FAILED: ${JSON.stringify(
        pickup.data,
      )}`,
    );
  }

  // بدء التوصيل
  const onTheWay = await request(
    `/orders/${orderId}/status`,
    captain.accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "on_the_way",
      }),
    },
  );

  console.log(
    "\\n===== on_the_way =====",
  );
  console.log(
    "HTTP:",
    onTheWay.status,
  );
  console.log(
    JSON.stringify(
      onTheWay.data,
      null,
      2,
    ),
  );

  if (!onTheWay.ok) {
    throw new Error(
      `on_the_way FAILED: ${JSON.stringify(
        onTheWay.data,
      )}`,
    );
  }

  // إنشاء OTP في مرحلة التسليم
  // تم التسليم
  const delivered = await request(
    `/orders/${orderId}/status`,
    captain.accessToken,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: "delivered",
      }),
    },
  );

  console.log(
    "\\n===== delivered =====",
  );
  console.log(
    "HTTP:",
    delivered.status,
  );
  console.log(
    JSON.stringify(
      delivered.data,
      null,
      2,
    ),
  );

  if (!delivered.ok) {
    throw new Error(
      `delivered FAILED: ${JSON.stringify(
        delivered.data,
      )}`,
    );
  }

  // قراءة نفس الطلب من الحسابات الثلاثة
  for (const [name, token] of [
    ["SHOP", shop.accessToken],
    ["CAPTAIN", captain.accessToken],
    ["ADMIN", admin.accessToken],
  ] as const) {
    const read = await request(
      `/orders/${orderId}`,
      token,
    );

    const order =
      orderOf(read.data);

    console.log(
      `\n===== FINAL ${name} =====`,
    );

    printOrder(
      name,
      order,
    );
  }

  console.log(
    "\n========================================",
  );
  console.log("✅ FULL FLOW COMPLETED");
  console.log(
    "========================================",
  );
  console.log(
    "ORDER ID:",
    orderId,
  );
  console.log(
    "ORDER NUMBER:",
    created.orderNumber,
  );
}

main().catch((error) => {
  console.error(
    "\n❌ FULL FLOW FAILED",
  );
  console.error(
    error?.stack || error,
  );

  console.log(
    "\n📌 ملف الاختبار محفوظ هنا:",
  );
  console.log(
    "backend/scripts/full-order-flow-test.ts",
  );

  process.exitCode = 1;
});
