const { chromium } = require("@playwright/test");
const fs = require("fs");

const APPS = [
  {
    name: "CAPTAIN",
    url: process.env.CAPTAIN_URL || "http://127.0.0.1:8081",
  },
  {
    name: "SHOP",
    url: process.env.SHOP_URL || "http://127.0.0.1:8081",
  },
  {
    name: "ADMIN",
    url: process.env.ADMIN_URL || "http://127.0.0.1:5174",
  },
];

const EXPECTED = [
  "التوجه إلى المحل",
  "تأكيد الوصول للمحل",
  "استلام الطلب",
  "تم استلام الطلب",
  "في الطريق",
  "تم التوصيل",
  "مكتمل",
  "الطلبات",
  "الكابتن",
  "حالة الطلب",
];

fs.mkdirSync("e2e/frontend-results", { recursive: true });

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  let totalApps = 0;
  let workingApps = 0;
  let failedApps = 0;

  for (const app of APPS) {
    totalApps++;

    console.log("\n==================================================");
    console.log(` FRONTEND TEST: ${app.name}`);
    console.log(` ${app.url}`);
    console.log("==================================================");

    const context = await browser.newContext({
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    const page = await context.newPage();

    const runtimeErrors = [];
    const failedRequests = [];
    const httpErrors = [];

    page.on("pageerror", (error) => {
      runtimeErrors.push(error.message);
      console.log(`❌ PAGE ERROR: ${error.message}`);
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        runtimeErrors.push(msg.text());
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      }
    });

    page.on("requestfailed", (request) => {
      const item = `${request.method()} ${request.url()} ${
        request.failure()?.errorText || ""
      }`;

      failedRequests.push(item);
      console.log(`❌ REQUEST FAILED: ${item}`);
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        const item = `${response.status()} ${response.url()}`;
        httpErrors.push(item);
        console.log(`❌ HTTP ERROR: ${item}`);
      }
    });

    try {
      const response = await page.goto(app.url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      console.log(`HTTP STATUS: ${response?.status()}`);
      console.log(`FINAL URL: ${page.url()}`);
      console.log(`TITLE: ${await page.title()}`);

      await page.waitForTimeout(2500);

      const bodyText = await page.locator("body").innerText();

      console.log("\n--- VISIBLE TEXT ---");

      if (bodyText.trim()) {
        console.log(bodyText.slice(0, 8000));
      } else {
        console.log("(EMPTY BODY)");
      }

      console.log("\n--- BUTTONS ---");

      const buttons = await page.locator("button").allTextContents();

      for (const text of buttons) {
        if (text.trim()) {
          console.log(`• ${text.trim()}`);
        }
      }

      console.log("\n--- LINKS ---");

      const links = await page.locator("a").allTextContents();

      for (const text of links) {
        if (text.trim()) {
          console.log(`• ${text.trim()}`);
        }
      }

      console.log("\n--- EXPECTED #9 UI ELEMENTS ---");

      let foundCount = 0;

      for (const expected of EXPECTED) {
        const count = await page.getByText(expected, {
          exact: false,
        }).count();

        if (count > 0) {
          console.log(`✅ ${expected}`);
          foundCount++;
        }
      }

      console.log(
        `\n#9 visible elements: ${foundCount}/${EXPECTED.length}`
      );

      const screenshot =
        `e2e/frontend-results/${app.name.toLowerCase()}.png`;

      await page.screenshot({
        path: screenshot,
        fullPage: true,
      });

      console.log(`📸 Screenshot: ${screenshot}`);

      const html =
        `e2e/frontend-results/${app.name.toLowerCase()}.html`;

      fs.writeFileSync(
        html,
        await page.content(),
        "utf8"
      );

      console.log(`📄 HTML: ${html}`);

      const result = {
        app: app.name,
        url: app.url,
        status: response?.status() ?? null,
        finalUrl: page.url(),
        title: await page.title(),
        bodyEmpty: !bodyText.trim(),
        visibleTextLength: bodyText.length,
        buttons,
        links,
        foundExpectedElements: foundCount,
        expectedElements: EXPECTED.length,
        runtimeErrors,
        failedRequests,
        httpErrors,
      };

      fs.writeFileSync(
        `e2e/frontend-results/${app.name.toLowerCase()}.json`,
        JSON.stringify(result, null, 2),
        "utf8"
      );

      if (
        response &&
        response.status() < 400 &&
        bodyText.trim() &&
        runtimeErrors.length === 0
      ) {
        console.log(`✅ ${app.name} FRONTEND RUNNING`);
        workingApps++;
      } else {
        console.log(`❌ ${app.name} FRONTEND HAS PROBLEMS`);
        failedApps++;
      }
    } catch (error) {
      console.log(`❌ TEST ERROR: ${error.message}`);

      fs.writeFileSync(
        `e2e/frontend-results/${app.name.toLowerCase()}-error.txt`,
        error.stack || error.message,
        "utf8"
      );

      failedApps++;
    }

    await context.close();
  }

  await browser.close();

  console.log("\n==================================================");
  console.log(" FRONTEND #9 FINAL RESULT");
  console.log("==================================================");

  console.log(`TOTAL APPS: ${totalApps}`);
  console.log(`WORKING: ${workingApps}`);
  console.log(`FAILED: ${failedApps}`);

  console.log("\nRESULT FILES:");
  console.log("e2e/frontend-results/");

  if (failedApps === 0) {
    console.log("\n🎉 FRONTEND SMOKE TEST PASSED");
    process.exit(0);
  }

  console.log("\n❌ FRONTEND SMOKE TEST FAILED");
  process.exit(1);
})();
