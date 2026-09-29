const BASE = "http://localhost:4000";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

const OWNER_EMAIL = "owner-1788632038109@dzwan.local";
const OWNER_PASSWORD = "Owner@123456";

const OWN_ESTABLISHMENT_ID = "6a9c5be8b07e88e68d537866";

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
    throw new Error(`Login failed for ${email}`);
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
  console.log(" SHOP PRODUCT COMPLETE TEST");
  console.log("==========================================");

  const adminCookies = await login(
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  const ownerCookies = await login(
    OWNER_EMAIL,
    OWNER_PASSWORD
  );

  pass("Admin login");
  pass("Owner login");

  /*
   * 1. List initial products
   */
  console.log("\n[1] LIST OWN PRODUCTS");

  let r = await req(
    `/api/products?establishmentId=${OWN_ESTABLISHMENT_ID}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("OWN PRODUCTS", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    Array.isArray(r.body?.products)
  ) {
    pass("Owner can list own products");
  } else {
    fail(
      "Owner cannot list own products",
      JSON.stringify(r.body)
    );
  }

  /*
   * 2. Create product
   */
  console.log("\n[2] CREATE PRODUCT");

  r = await req("/api/products", {
    method: "POST",
    headers: {
      Cookie: ownerCookies
    },
    body: JSON.stringify({
      establishmentId: OWN_ESTABLISHMENT_ID,
      name: `منتج مالك اختبار ${Date.now()}`,
      description: "منتج تم إنشاؤه بواسطة صاحب المنشأة",
      price: 250,
      imageUrl: null,
      status: "active"
    })
  });

  show("CREATE PRODUCT", r);

  if (
    r.status >= 200 &&
    r.status < 300 &&
    r.body?.success &&
    r.body?.product?._id
  ) {
    pass("Owner can create product");
  } else {
    fail(
      "Owner cannot create product",
      JSON.stringify(r.body)
    );
    process.exit(2);
  }

  const productId = r.body.product._id;

  /*
   * 3. Get product
   */
  console.log("\n[3] GET PRODUCT");

  r = await req(
    `/api/products/${productId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("GET PRODUCT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.product?._id === productId
  ) {
    pass("Owner can read own product");
  } else {
    fail(
      "Owner cannot read own product",
      JSON.stringify(r.body)
    );
  }

  /*
   * 4. Update product name
   */
  console.log("\n[4] UPDATE PRODUCT");

  const updatedName =
    `منتج مالك معدل ${Date.now()}`;

  r = await req(
    `/api/products/${productId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        name: updatedName,
        price: 300
      })
    }
  );

  show("UPDATE PRODUCT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.product?.name === updatedName &&
    Number(r.body?.product?.price) === 300
  ) {
    pass("Owner can update own product");
  } else {
    fail(
      "Owner cannot update own product",
      JSON.stringify(r.body)
    );
  }

  /*
   * 5. Disable product
   */
  console.log("\n[5] DISABLE PRODUCT");

  r = await req(
    `/api/products/${productId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        status: "inactive"
      })
    }
  );

  show("DISABLE PRODUCT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.product?.status === "inactive"
  ) {
    pass("Owner can disable own product");
  } else {
    fail(
      "Owner cannot disable own product",
      JSON.stringify(r.body)
    );
  }

  /*
   * 6. Re-enable product
   */
  console.log("\n[6] ENABLE PRODUCT");

  r = await req(
    `/api/products/${productId}`,
    {
      method: "PATCH",
      headers: {
        Cookie: ownerCookies
      },
      body: JSON.stringify({
        status: "active"
      })
    }
  );

  show("ENABLE PRODUCT", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.product?.status === "active"
  ) {
    pass("Owner can enable own product");
  } else {
    fail(
      "Owner cannot enable own product",
      JSON.stringify(r.body)
    );
  }

  /*
   * 7. List and verify product exists
   */
  console.log("\n[7] VERIFY PRODUCT PERSISTENCE");

  r = await req(
    `/api/products?establishmentId=${OWN_ESTABLISHMENT_ID}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("VERIFY PRODUCTS", r);

  const found =
    Array.isArray(r.body?.products)
      ? r.body.products.find(
          p => p._id === productId
        )
      : null;

  if (
    r.status === 200 &&
    found &&
    found.name === updatedName &&
    Number(found.price) === 300 &&
    found.status === "active"
  ) {
    pass("Product changes persisted");
  } else {
    fail(
      "Product persistence",
      JSON.stringify(r.body)
    );
  }

  /*
   * 8. Admin can read the product
   */
  console.log("\n[8] ADMIN READ PRODUCT");

  r = await req(
    `/api/products/${productId}`,
    {
      headers: {
        Cookie: adminCookies
      }
    }
  );

  show("ADMIN PRODUCT READ", r);

  if (
    r.status === 200 &&
    r.body?.success &&
    r.body?.product?._id === productId
  ) {
    pass("Admin can read owner product");
  } else {
    fail(
      "Admin cannot read owner product",
      JSON.stringify(r.body)
    );
  }

  /*
   * 9. Delete product
   */
  console.log("\n[9] DELETE PRODUCT");

  r = await req(
    `/api/products/${productId}`,
    {
      method: "DELETE",
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("DELETE PRODUCT", r);

  if (
    r.status === 200 &&
    r.body?.success
  ) {
    pass("Owner can delete own product");
  } else {
    fail(
      "Owner cannot delete own product",
      JSON.stringify(r.body)
    );
  }

  /*
   * 10. Verify deletion
   */
  console.log("\n[10] VERIFY DELETION");

  r = await req(
    `/api/products/${productId}`,
    {
      headers: {
        Cookie: ownerCookies
      }
    }
  );

  show("GET DELETED PRODUCT", r);

  if (r.status === 404) {
    pass("Deleted product no longer exists");
  } else {
    fail(
      "Deleted product still accessible",
      JSON.stringify(r.body)
    );
  }

  /*
   * SUMMARY
   */
  console.log("\n==========================================");
  console.log(" SHOP PRODUCT TEST SUMMARY");
  console.log("==========================================");

  console.log(`PASS: ${passed}`);
  console.log(`FAIL: ${failed}`);

  console.log(
    `\nESTABLISHMENT ID: ${OWN_ESTABLISHMENT_ID}`
  );

  if (failed === 0) {
    console.log(
      "\n🎉 ALL SHOP PRODUCT TESTS PASSED"
    );
    process.exit(0);
  }

  console.log(
    "\n⚠️ SHOP PRODUCT TESTS HAVE FAILURES"
  );

  process.exit(2);
}

main().catch(error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);
  process.exit(3);
});
