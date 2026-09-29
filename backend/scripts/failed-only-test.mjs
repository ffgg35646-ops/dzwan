const BASE_URL = "http://localhost:4000";

const ADMIN = {
  email: "admin@dzwan.local",
  password: "Dzwan@2026_Admin",
};

let passed = 0;
let failed = 0;

async function req(path, options = {}) {
  try {
    const r = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let body = null;

    try {
      body = await r.json();
    } catch {
      body = null;
    }

    return {
      status: r.status,
      body,
      headers: r.headers,
    };
  } catch (e) {
    return {
      status: 0,
      body: null,
      headers: new Headers(),
      error: String(e),
    };
  }
}

async function login() {
  const r = await req("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(ADMIN),
  });

  if (r.status !== 200 || !r.body?.success) {
    throw new Error(
      `Admin login failed: ${r.status}\n${JSON.stringify(r.body)}`
    );
  }

  const setCookie = r.headers.get("set-cookie") || "";

  const cookie = setCookie
    .split(/,(?=[^;,]+=)/)
    .map(x => x.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  return {
    token: r.body?.accessToken || r.body?.token || null,
    cookie,
  };
}

function headers(session) {
  const h = {};

  if (session.token) {
    h.Authorization = `Bearer ${session.token}`;
  }

  if (session.cookie) {
    h.Cookie = session.cookie;
  }

  return h;
}

async function test(name, fn) {
  try {
    const ok = await fn();

    if (ok) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ FAIL: ${name}`);
    console.log(e instanceof Error ? e.message : String(e));
    failed++;
  }
}

async function main() {
  console.log("\n==============================================");
  console.log("        FAILED CASES ONLY TEST");
  console.log("==============================================\n");

  const session = await login();

  console.log("✅ PASS: Admin login");
  passed++;

  const auth = headers(session);

  // ============================================
  // GEOFENCE
  // ============================================

  await test(
    "Geofence unauthenticated protection",
    async () => {
      const r = await req("/api/geofences");
      return r.status === 401;
    }
  );

  await test(
    "Geofence authenticated list",
    async () => {
      const r = await req("/api/geofences", {
        headers: auth,
      });

      console.log(`   HTTP ${r.status}`);
      return r.status === 200;
    }
  );

  await test(
    "Geofence invalid ID PATCH returns 400",
    async () => {
      const r = await req("/api/geofences/not-an-object-id", {
        method: "PATCH",
        headers: auth,
        body: JSON.stringify({
          name: "اختبار",
        }),
      });

      console.log(`   HTTP ${r.status}`);

      if (r.status !== 400) {
        console.log(`   ${JSON.stringify(r.body)}`);
      }

      return r.status === 400;
    }
  );

  await test(
    "Geofence invalid ID DELETE returns 400",
    async () => {
      const r = await req("/api/geofences/not-an-object-id", {
        method: "DELETE",
        headers: auth,
      });

      console.log(`   HTTP ${r.status}`);

      if (r.status !== 400) {
        console.log(`   ${JSON.stringify(r.body)}`);
      }

      return r.status === 400;
    }
  );

  // ============================================
  // CAPTAIN REGISTRATION
  // ============================================

  await test(
    "Captain registration approve invalid ID returns 400",
    async () => {
      const r = await req(
        "/api/captain-registration/not-an-object-id/approve",
        {
          method: "POST",
          headers: auth,
          body: JSON.stringify({}),
        }
      );

      console.log(`   HTTP ${r.status}`);

      if (r.status !== 400) {
        console.log(`   ${JSON.stringify(r.body)}`);
      }

      return r.status === 400;
    }
  );

  // ============================================
  // SUMMARY
  // ============================================

  console.log("\n==============================================");
  console.log("             FAILED CASES SUMMARY");
  console.log("==============================================");
  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);
  console.log("==============================================");

  if (failed === 0) {
    console.log("\n🎉 FAILED CASES TEST PASSED");
  } else {
    console.log("\n⚠️ FAILED CASES TEST HAS FAILURES");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exitCode = 1;
});
