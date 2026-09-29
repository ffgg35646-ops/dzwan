import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const DELAY_BETWEEN_TESTS_MS = 10000;
const TEST_TIMEOUT_MS = 5 * 60 * 1000;

const tests = [
  "admin-location-complete-test.mjs",
  "admin-captain-management-complete-test.mjs",
  "captain-complete-test.mjs",
  "admin-customer-complete-test.mjs",
  "establishment-complete-test.mjs",
  "establishment-owner-complete-test.mjs",
  "shop-product-complete-test.mjs",
  "shop-order-complete-test.mjs",
  "pricing-resolver-complete-test.mjs",
  "delivery-proof-complete-test.mjs",
  "geofence-api-test.mjs",
  "geofence-complete-test.mjs",
  "admin-settings-dispatch-write-test.mjs",
  "staff-users-leaders-complete-test.mjs",

  // هذا الاختبار كان يسبب ضغطًا/انهيارًا للسيرفر سابقًا، لذلك هو الأخير
  "backend-all-routes-test.mjs",

  // اختبارات التغطية العامة
  "backend-full-coverage-test.mjs",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runTest(file) {
  return new Promise((resolve) => {
    if (!existsSync(`scripts/${file}`)) {
      console.log(`❌ MISSING: ${file}`);
      resolve({ file, status: "MISSING", code: null });
      return;
    }

    const useTsx = file === "pricing-resolver-complete-test.mjs";

    const command = useTsx ? "npx" : "node";
    const args = useTsx
      ? ["tsx", `scripts/${file}`]
      : [`scripts/${file}`];

    console.log("\n==============================================");
    console.log(`▶ RUNNING: ${file}`);
    console.log("==============================================\n");

    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        LOGIN_RATE_LIMIT_MAX_ATTEMPTS: "1000",
      },
    });

    let finished = false;

    const finish = (result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({ file, ...result });
    };

    const timeout = setTimeout(() => {
      console.log(`\n⏰ TIMEOUT: ${file}`);
      child.kill("SIGTERM");

      setTimeout(() => {
        if (!finished) {
          child.kill("SIGKILL");
        }
      }, 3000);

      finish({
        status: "TIMEOUT",
        code: null,
      });
    }, TEST_TIMEOUT_MS);

    child.on("error", (error) => {
      console.log(`\n💥 ERROR STARTING ${file}: ${error.message}`);
      finish({
        status: "ERROR",
        code: null,
      });
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        console.log(`\n⚠️ ${file} انتهى بإشارة: ${signal}`);
      }

      if (code === 0) {
        console.log(`\n✅ PASSED: ${file}`);
        finish({
          status: "PASS",
          code,
        });
      } else {
        console.log(`\n❌ FAILED: ${file} (exit code ${code})`);
        finish({
          status: "FAIL",
          code,
        });
      }
    });
  });
}

async function main() {
  console.log("\n====================================================");
  console.log("       DZWAN SLOW BACKEND TEST RUNNER");
  console.log("====================================================");
  console.log(`عدد الاختبارات: ${tests.length}`);
  console.log(`التأخير بين الاختبارات: ${DELAY_BETWEEN_TESTS_MS / 1000} ثواني`);
  console.log(`مهلة كل اختبار: ${TEST_TIMEOUT_MS / 60000} دقائق`);
  console.log("====================================================\n");

  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const file = tests[i];

    console.log(`\n[${i + 1}/${tests.length}] ${file}`);

    const result = await runTest(file);
    results.push(result);

    if (i < tests.length - 1) {
      console.log(`\n⏳ استراحة ${DELAY_BETWEEN_TESTS_MS / 1000} ثواني قبل الاختبار التالي...`);
      await sleep(DELAY_BETWEEN_TESTS_MS);
    }
  }

  const pass = results.filter((x) => x.status === "PASS");
  const fail = results.filter((x) => x.status === "FAIL");
  const timeout = results.filter((x) => x.status === "TIMEOUT");
  const missing = results.filter((x) => x.status === "MISSING");
  const error = results.filter((x) => x.status === "ERROR");

  console.log("\n\n====================================================");
  console.log("                 FINAL SUMMARY");
  console.log("====================================================");

  for (const result of results) {
    const icon =
      result.status === "PASS" ? "✅" :
      result.status === "MISSING" ? "⚠️" :
      "❌";

    console.log(`${icon} ${result.status.padEnd(8)} ${result.file}`);
  }

  console.log("\n----------------------------------------------------");
  console.log(`PASS     : ${pass.length}`);
  console.log(`FAIL     : ${fail.length}`);
  console.log(`TIMEOUT  : ${timeout.length}`);
  console.log(`ERROR    : ${error.length}`);
  console.log(`MISSING  : ${missing.length}`);
  console.log(`TOTAL    : ${results.length}`);
  console.log("----------------------------------------------------");

  if (fail.length || timeout.length || error.length) {
    console.log("\n⚠️ الاختبارات لم تمر كلها.");
    process.exitCode = 1;
  } else {
    console.log("\n🎉 كل الاختبارات الموجودة تم تنفيذها بنجاح.");
  }
}

main().catch((error) => {
  console.error("\n💥 RUNNER CRASHED");
  console.error(error);
  process.exitCode = 1;
});
