const BASE_URL = process.env.BASE_URL || "http://localhost:4000";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@dzwan.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Dzwan@2026_Admin";

let cookie = "";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (cookie) headers.Cookie = cookie;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let body = null;
  try {
    body = await response.json();
  } catch {}

  return { response, body };
}

function getCookie(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; ");
  }

  const value = response.headers.get("set-cookie");
  return value ? value.split(";")[0] : "";
}

function allAreas(locations) {
  return locations.flatMap((location) =>
    (location.areas || []).map((area) => ({
      ...area,
      governorateId: entityId(location),
      governorateName: location.name,
    })),
  );
}

function entityId(x) {
  return String(x?._id ?? x?.id ?? "");
}

function findLocation(locations, id) {
  return locations.find((x) => entityId(x) === String(id));
}

function findArea(locations, id) {
  return allAreas(locations).find((x) => entityId(x) === String(id));
}

async function available(type, search = "") {
  const query = new URLSearchParams({ type });

  if (search) query.set("search", search);

  const { response, body } = await request(
    `/api/locations/available?${query.toString()}`,
  );

  assert(
    response.ok && body?.success === true,
    `فشل available/${type}: HTTP ${response.status}`,
  );

  return body.locations || [];
}

async function patchGovernorate(id, data) {
  const { response, body } = await request(`/api/locations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

  assert(
    response.ok,
    `فشل تعديل المحافظة ${id}: HTTP ${response.status} ${JSON.stringify(body)}`,
  );

  return body;
}

async function patchArea(governorateId, areaId, data) {
  const { response, body } = await request(
    `/api/locations/${governorateId}/areas/${areaId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

  assert(
    response.ok,
    `فشل تعديل المنطقة ${areaId}: HTTP ${response.status} ${JSON.stringify(body)}`,
  );

  return body;
}

async function main() {
  console.log("\n==============================================");
  console.log(" DZWAN - Registration Location Visibility");
  console.log("==============================================\n");

  // Login
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  assert(
    login.response.ok && login.body?.success !== false,
    `فشل تسجيل دخول الأدمن: HTTP ${login.response.status}`,
  );

  cookie = getCookie(login.response);

  assert(cookie, "لم يتم الحصول على Cookie الخاصة بالأدمن.");

  console.log("✓ Admin login\n");

  // Get locations
  const locationsResponse = await request("/api/locations");

  assert(
    locationsResponse.response.ok,
    `فشل جلب المحافظات: HTTP ${locationsResponse.response.status}`,
  );

  const locations =
    locationsResponse.body?.locations ||
    locationsResponse.body?.data ||
    [];

  // Pick a governorate that is active for BOTH registrations
  // and has an active area for BOTH registrations.
  const governorate = locations.find((location) => {
    if (
      location.isActive === false ||
      location.captainsEnabled === false ||
      location.establishmentsEnabled === false
    ) {
      return false;
    }

    return (location.areas || []).some(
      (area) =>
        area.isActive !== false &&
        area.captainsEnabled !== false &&
        area.establishmentsEnabled !== false,
    );
  });

  assert(
    governorate,
    "لم أجد محافظة نشطة وبها منطقة نشطة ومسموح بها للكابتن والمطعم معًا.",
  );

  const area = governorate.areas.find(
    (x) =>
      x.isActive !== false &&
      x.captainsEnabled !== false &&
      x.establishmentsEnabled !== false,
  );

  const governorateId = String(governorate._id);
  const areaId = String(area._id);

  console.log(`المحافظة المستخدمة: ${governorate.name}`);
  console.log(`المنطقة المستخدمة: ${area.name}\n`);

  let passed = 0;
  let failed = 0;

  async function test(number, title, fn) {
    process.stdout.write(`TEST ${number}: ${title} ... `);

    try {
      await fn();
      console.log("PASS ✓");
      passed++;
    } catch (error) {
      console.log("FAIL ✗");
      console.log(`       ${error.message}`);
      failed++;
    }
  }

  // ==========================================
  // TEST 1
  // Active governorate + active area
  // must appear for captain AND establishment
  // ==========================================
  await test(
    1,
    "المحافظة والمنطقة النشطة تظهر للكابتن والمطعم",
    async () => {
      for (const type of ["captain", "establishment"]) {
        const result = await available(type);

        const location = findLocation(result, governorateId);

        assert(
          location,
          `${type}: المحافظة النشطة غير موجودة`,
        );

        const foundArea = findArea(result, areaId);

        assert(
          foundArea,
          `${type}: المنطقة النشطة غير موجودة`,
        );
      }
    },
  );

  // ==========================================
  // TEST 2
  // Disabled governorate must disappear
  // from captain + establishment lists
  // ==========================================
  await test(
    2,
    "المحافظة المعطلة لا تظهر في قوائم التسجيل",
    async () => {
      await patchGovernorate(governorateId, {
        isActive: false,
      });

      try {
        for (const type of ["captain", "establishment"]) {
          const result = await available(type);

          const location = findLocation(result, governorateId);

          assert(
            !location,
            `${type}: المحافظة المعطلة ما زالت ظاهرة`,
          );
        }
      } finally {
        await patchGovernorate(governorateId, {
          isActive: true,
        });
      }
    },
  );

  // ==========================================
  // TEST 3
  // Disabled area must disappear while
  // governorate remains visible
  // ==========================================
  await test(
    3,
    "المنطقة المعطلة لا تظهر مع بقاء المحافظة",
    async () => {
      await patchArea(governorateId, areaId, {
        isActive: false,
      });

      try {
        for (const type of ["captain", "establishment"]) {
          const result = await available(type);

          const location = findLocation(result, governorateId);

          assert(
            location,
            `${type}: المحافظة اختفت رغم أنها نشطة`,
          );

          const foundArea = findArea(result, areaId);

          assert(
            !foundArea,
            `${type}: المنطقة المعطلة ما زالت ظاهرة`,
          );
        }
      } finally {
        await patchArea(governorateId, areaId, {
          isActive: true,
        });
      }
    },
  );

  // ==========================================
  // TEST 4
  // Search must also exclude disabled
  // governorate and disabled area
  // ==========================================
  await test(
    4,
    "البحث لا يعرض المحافظة أو المنطقة المعطلة",
    async () => {
      // Disable governorate
      await patchGovernorate(governorateId, {
        isActive: false,
      });

      try {
        for (const type of ["captain", "establishment"]) {
          const result = await available(type, governorate.name);

          const location = findLocation(result, governorateId);

          assert(
            !location,
            `${type}: البحث أظهر المحافظة المعطلة`,
          );
        }
      } finally {
        await patchGovernorate(governorateId, {
          isActive: true,
        });
      }

      // Disable area separately
      await patchArea(governorateId, areaId, {
        isActive: false,
      });

      try {
        for (const type of ["captain", "establishment"]) {
          const result = await available(type, area.name);

          const foundArea = findArea(result, areaId);

          assert(
            !foundArea,
            `${type}: البحث أظهر المنطقة المعطلة`,
          );
        }
      } finally {
        await patchArea(governorateId, areaId, {
          isActive: true,
        });
      }
    },
  );

  console.log("\n==============================================");
  console.log(`النتيجة: ${passed} ناجح / ${failed} فاشل`);
  console.log("==============================================\n");

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("\nERROR:", error.message);
  process.exit(1);
});
