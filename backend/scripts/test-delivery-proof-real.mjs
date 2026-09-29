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

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const body = await res.json();

  console.log(`\n========== LOGIN ${email} ==========`);
  console.log("HTTP:", res.status);
  console.log(JSON.stringify(body, null, 2));

  if (!res.ok || !body?.success) {
    throw new Error(`Login failed for ${email}`);
  }

  if (!setCookies.length) {
    throw new Error(`No cookies received for ${email}`);
  }

  return setCookies
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

  return { status: res.status, body };
}

function print(name, result) {
  console.log(`\n========== ${name} ==========`);
  console.log("HTTP:", result.status);
  console.log(JSON.stringify(result.body, null, 2));
}

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

let r = await req("/api/orders", {
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
    customerNote: "اختبار حماية OTP قبل التسليم"
  })
});

print("CREATE ORDER BY CUSTOMER", r);

if (!r.body?.order?._id) {
  throw new Error("Order creation failed");
}

const orderId = r.body.order._id;

console.log(`\nORDER_ID: ${orderId}`);

for (const status of [
  "confirmed",
  "preparing",
  "ready_for_pickup"
]) {
  r = await req(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      Cookie: adminCookies
    },
    body: JSON.stringify({ status })
  });

  print(`STATUS ${status}`, r);

  if (!r.body?.success) {
    throw new Error(`Failed transition to ${status}`);
  }
}

r = await req(`/api/orders/${orderId}/assign-captain`, {
  method: "POST",
  headers: {
    Cookie: adminCookies
  },
  body: JSON.stringify({
    captainId
  })
});

print("ASSIGN CAPTAIN", r);

if (!r.body?.success) {
  throw new Error("Captain assignment failed");
}

for (const status of [
  "picked_up",
  "on_the_way"
]) {
  r = await req(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      Cookie: captainCookies
    },
    body: JSON.stringify({ status })
  });

  print(`STATUS ${status}`, r);

  if (!r.body?.success) {
    throw new Error(`${status} failed`);
  }
}

r = await req(`/api/orders/${orderId}/status`, {
  method: "PATCH",
  headers: {
    Cookie: captainCookies
  },
  body: JSON.stringify({
    status: "delivered"
  })
});

print("DELIVERED WITHOUT OTP", r);

console.log(`\nORDER_ID: ${orderId}`);

if (
  r.status === 403 &&
  r.body?.code === "DELIVERY_OTP_REQUIRED"
) {
  console.log(
    "\nRESULT: PASS - OTP protection is working."
  );
  process.exit(0);
}

console.log(
  "\nRESULT: FAIL - delivered was not blocked by OTP."
);

process.exit(2);
