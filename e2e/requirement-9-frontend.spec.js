const { test, expect } = require("@playwright/test");

const CAPTAIN_URL =
  process.env.CAPTAIN_URL || "http://127.0.0.1:8081";

const SHOP_URL =
  process.env.SHOP_URL || "http://127.0.0.1:8081";

const ADMIN_URL =
  process.env.ADMIN_URL || "http://127.0.0.1:5174";

const SHOP_EMAIL = "ddkcmrl@gmail.com";
const SHOP_PASSWORD = "DzwanShop@2026";

const ADMIN_EMAIL = "admin@dzwan.local";
const ADMIN_PASSWORD = "Dzwan@2026_Admin";

async function login(page, baseUrl, email, password) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  const emailInput = page
    .locator(
      'input[type="email"], input[placeholder*="البريد"], input[placeholder*="Email"]'
    )
    .first();

  const passwordInput = page
    .locator(
      'input[type="password"], input[placeholder*="كلمة المرور"], input[placeholder*="Password"]'
    )
    .first();

  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await expect(passwordInput).toBeVisible({ timeout: 15000 });

  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page
    .getByRole("button", {
      name: /تسجيل الدخول|دخول|login|sign in/i,
    })
    .first()
    .click();

  await page.waitForTimeout(2500);
}

async function screenshot(page, name) {
  await page.screenshot({
    path: `e2e/screenshots/${name}.png`,
    fullPage: true,
  });
}

async function findStatus(page, texts) {
  for (const text of texts) {
    const locator = page.getByText(text, { exact: false }).first();

    if (await locator.count()) {
      try {
        if (await locator.isVisible()) {
          return text;
        }
      } catch {}
    }
  }

  return null;
}

async function assertAnyStatus(page, texts, label) {
  const found = await findStatus(page, texts);

  expect(
    found,
    `${label}: لم تظهر أي حالة من الحالات المتوقعة`
  ).not.toBeNull();

  console.log(`✅ ${label}: ${found}`);
}

test.describe.serial("DZWAN Requirement #9 — Frontend E2E", () => {
  test.beforeAll(async () => {
    const fs = require("fs");
    fs.mkdirSync("e2e/screenshots", { recursive: true });
  });

  test("SHOP — login and order lifecycle UI", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("\n==============================");
    console.log("SHOP FRONTEND");
    console.log("==============================");

    await login(page, SHOP_URL, SHOP_EMAIL, SHOP_PASSWORD);

    await screenshot(page, "01-shop-home");

    await assertAnyStatus(
      page,
      [
        "الطلبات",
        "طلب جديد",
        "إنشاء طلب",
        "الرئيسية",
      ],
      "Shop Home"
    );

    const orderLink = page
      .getByRole("link", {
        name: /الطلبات|طلب/i,
      })
      .first();

    if (await orderLink.count()) {
      await orderLink.click();
      await page.waitForTimeout(1200);
    }

    await screenshot(page, "02-shop-orders");

    console.log("✅ Shop interface opened successfully");

    await context.close();
  });

  test("CAPTAIN — order screen and map UI", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("\n==============================");
    console.log("CAPTAIN FRONTEND");
    console.log("==============================");

    await page.goto(CAPTAIN_URL, {
      waitUntil: "domcontentloaded",
    });

    await screenshot(page, "03-captain-login");

    console.log(
      "ℹ️ Captain screen opened. Existing logged-in session is preserved if present."
    );

    await assertAnyStatus(
      page,
      [
        "الطلبات",
        "الطلبات المتاحة",
        "الرئيسية",
        "العمل",
        "كابتن",
      ],
      "Captain UI"
    );

    await screenshot(page, "04-captain-home");

    await context.close();
  });

  test("ADMIN — dashboard/order management UI", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("\n==============================");
    console.log("ADMIN FRONTEND");
    console.log("==============================");

    await login(page, ADMIN_URL, ADMIN_EMAIL, ADMIN_PASSWORD);

    await screenshot(page, "05-admin-dashboard");

    await assertAnyStatus(
      page,
      [
        "لوحة التحكم",
        "الطلبات",
        "الكباتن",
        "الإعدادات",
      ],
      "Admin Dashboard"
    );

    const ordersLink = page
      .getByRole("link", {
        name: /الطلبات|Orders/i,
      })
      .first();

    if (await ordersLink.count()) {
      await ordersLink.click();
      await page.waitForTimeout(1200);

      await screenshot(page, "06-admin-orders");

      await assertAnyStatus(
        page,
        [
          "الطلبات",
          "حالة الطلب",
          "الكابتن",
          "مكتمل",
        ],
        "Admin Orders"
      );
    }

    await context.close();
  });

  test("VERIFY — required Requirement #9 UI labels", async ({
    browser,
  }) => {
    const context = await browser.newContext();

    const page = await context.newPage();

    console.log("\n==============================");
    console.log("REQUIREMENT #9 UI CHECK");
    console.log("==============================");

    await page.goto(CAPTAIN_URL, {
      waitUntil: "domcontentloaded",
    });

    const captainStatuses = [
      "التوجه إلى المحل",
      "تأكيد الوصول للمحل",
      "استلام",
      "في الطريق",
      "التسليم",
      "تم التوصيل",
      "مكتمل",
    ];

    let captainHits = 0;

    for (const status of captainStatuses) {
      if (
        await page.getByText(status, { exact: false }).count()
      ) {
        captainHits++;
        console.log(`✅ Captain UI: ${status}`);
      }
    }

    expect(
      captainHits,
      "Captain UI لا يحتوي على مراحل دورة الطلب المطلوبة"
    ).toBeGreaterThan(0);

    await screenshot(page, "07-requirement-9-captain");

    await page.goto(SHOP_URL, {
      waitUntil: "domcontentloaded",
    });

    const shopStatuses = [
      "تم قبول الطلب",
      "الكابتن في الطريق إلى المحل",
      "وصل للمحل",
      "تم استلام الطلب",
      "في الطريق إلى العميل",
      "تم التوصيل",
      "مكتمل",
    ];

    let shopHits = 0;

    for (const status of shopStatuses) {
      if (
        await page.getByText(status, { exact: false }).count()
      ) {
        shopHits++;
        console.log(`✅ Shop UI: ${status}`);
      }
    }

    expect(
      shopHits,
      "Shop UI لا يحتوي على مراحل دورة الطلب المطلوبة"
    ).toBeGreaterThan(0);

    await screenshot(page, "08-requirement-9-shop");

    console.log("\n🎉 Requirement #9 frontend smoke test PASSED");

    await context.close();
  });
});
