
const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const [name, url] of [
    ["SHOP", "http://127.0.0.1:8081"],
    ["ADMIN", "http://127.0.0.1:5174"],
  ]) {
    const page = await browser.newPage();

    console.log("\n========================================");
    console.log(name, url);
    console.log("========================================");

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForTimeout(3000);

      console.log("URL:", page.url());
      console.log("TITLE:", await page.title());

      console.log("\n--- INPUTS ---");
      const inputs = await page.locator("input").evaluateAll(nodes =>
        nodes.map((x, i) => ({
          i,
          type: x.type,
          name: x.name,
          placeholder: x.placeholder,
          value: x.value,
        }))
      );
      console.log(JSON.stringify(inputs, null, 2));

      console.log("\n--- BUTTONS ---");
      const buttons = await page.locator("button").allTextContents();
      console.log(buttons);

      console.log("\n--- LINKS ---");
      const links = await page.locator("a").allTextContents();
      console.log(links);

      console.log("\n--- BODY TEXT ---");
      const body = await page.locator("body").innerText();
      console.log(body.slice(0, 10000));

      await page.screenshot({
        path: `e2e/screenshots/inspect-${name.toLowerCase()}.png`,
        fullPage: true,
      });

      console.log(
        `\n✅ Screenshot: e2e/screenshots/inspect-${name.toLowerCase()}.png`
      );
    } catch (e) {
      console.log("❌ ERROR:", e.message);
    }

    await page.close();
  }

  await browser.close();
})();
