const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const [name, url] of [
    ["SHOP", "http://127.0.0.1:8081"],
    ["ADMIN", "http://127.0.0.1:5174"],
  ]) {
    const page = await browser.newPage();

    console.log(`\n========== ${name} ==========`);

    page.on("console", (msg) => {
      console.log(`[console:${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      console.log("[PAGE ERROR]", err.message);
    });

    page.on("requestfailed", (req) => {
      console.log(
        "[REQUEST FAILED]",
        req.url(),
        req.failure()?.errorText || ""
      );
    });

    page.on("response", (res) => {
      if (res.status() >= 400) {
        console.log("[HTTP ERROR]", res.status(), res.url());
      }
    });

    try {
      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });

      console.log("STATUS:", response?.status());
      console.log("URL:", page.url());
      console.log("TITLE:", await page.title());

      const html = await page.content();

      console.log("\n========== HTML ==========");
      console.log(html.slice(0, 8000));

      await page.screenshot({
        path: `e2e/screenshots/runtime-${name.toLowerCase()}.png`,
        fullPage: true,
      });

      console.log(
        `SCREENSHOT: e2e/screenshots/runtime-${name.toLowerCase()}.png`
      );
    } catch (error) {
      console.log("[GOTO ERROR]", error.message);
    }

    await page.close();
  }

  await browser.close();
})();
