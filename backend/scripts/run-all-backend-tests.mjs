import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const tests = [
  "admin-location-complete-test.mjs",
  "admin-captain-management-complete-test.mjs",
  "captain-complete-test.mjs",
  "admin-customer-complete-test.mjs",
  "establishment-complete-test.mjs",
  "establishment-owner-complete-test.mjs",
  "product-owner-complete-test.mjs",
  "shop-order-complete-test.mjs",
  "pricing-resolver-complete-test.mjs",
  "delivery-proof-complete-test.mjs",
  "geofence-api-test.mjs",
  "admin-dispatch-complete-test.mjs",

  // اختبارات إضافية إن كانت موجودة
  "staff-complete-test.mjs",
  "users-complete-test.mjs",
  "leader-complete-test.mjs",
  "attendance-complete-test.mjs",
  "documents-complete-test.mjs",
  "work-areas-complete-test.mjs",
  "ledger-complete-test.mjs",
  "notifications-complete-test.mjs",
  "audit-logs-complete-test.mjs",
  "support-complete-test.mjs",
  "offers-complete-test.mjs",
  "rewards-complete-test.mjs",
  "delivery-price-overrides-complete-test.mjs",
  "branding-theme-update-complete-test.mjs",
  "reports-complete-test.mjs",
  "completion-complete-test.mjs",
  "ops-complete-test.mjs",
  "requirements-11-29-complete-test.mjs",
  "requirements-30-46-complete-test.mjs",
  "establishment-security-test.mjs",
];

const found = [];
const missing = [];

for (const file of tests) {
  const full = path.join("scripts", file);

  if (fs.existsSync(full)) {
    found.push(file);
  } else {
    missing.push(file);
  }
}

let passed = 0;
let failed = 0;

console.log("");
console.log("==================================================");
console.log("        ZAJEL / DZWAN BACKEND MASTER TEST");
console.log("==================================================");
console.log(`Existing suites : ${found.length}`);
console.log(`Missing suites  : ${missing.length}`);
console.log("");

if (missing.length) {
  console.log("MISSING TEST SUITES:");
  for (const file of missing) {
    console.log(`  ⚪ ${file}`);
  }
  console.log("");
}

for (const file of found) {
  console.log("");
  console.log("--------------------------------------------------");
  console.log(`RUNNING: ${file}`);
  console.log("--------------------------------------------------");

  const isPricingTest =
    file === "pricing-resolver-complete-test.mjs";

  const command = isPricingTest ? "npx" : process.execPath;
  const args = isPricingTest
    ? ["tsx", path.join("scripts", file)]
    : [path.join("scripts", file)];

  const result = spawnSync(
    command,
    args,
    {
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    }
  );

  if (result.status === 0) {
    passed++;
    console.log(`✅ SUITE PASSED: ${file}`);
  } else {
    failed++;
    console.log(`❌ SUITE FAILED: ${file}`);
  }
}

console.log("");
console.log("==================================================");
console.log("              MASTER TEST SUMMARY");
console.log("==================================================");
console.log(`✅ Passed suites : ${passed}`);
console.log(`❌ Failed suites : ${failed}`);
console.log(`⚪ Missing suites: ${missing.length}`);
console.log(`📦 Total listed  : ${tests.length}`);

if (failed === 0 && missing === 0) {
  console.log("");
  console.log("🎉 ALL BACKEND TEST SUITES PASSED");
} else if (failed > 0) {
  console.log("");
  console.log("⚠️ BACKEND HAS FAILED TEST SUITES");
} else {
  console.log("");
  console.log("⚠️ AVAILABLE TESTS PASSED, BUT SOME TEST SUITES ARE STILL MISSING");
}

process.exitCode = failed > 0 ? 1 : 0;
