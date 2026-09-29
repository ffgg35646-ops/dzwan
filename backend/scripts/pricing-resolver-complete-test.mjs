import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import { PricingRuleModel } from "../src/models/PricingRule.ts";
import DeliveryPriceOverride from "../src/models/DeliveryPriceOverride.ts";
import { resolveDeliveryFee } from "../src/services/pricing.service.ts";

const URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL;

if (!URI) {
  console.error("❌ لم يتم العثور على رابط MongoDB في environment");
  process.exit(3);
}

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

async function main() {
  await mongoose.connect(URI);

  console.log("\n==============================================");
  console.log(" PRICING RESOLVER COMPLETE TEST");
  console.log("==============================================");

  const stamp = Date.now();

  const gov1 = new mongoose.Types.ObjectId();
  const area1 = new mongoose.Types.ObjectId();
  const gov2 = new mongoose.Types.ObjectId();
  const area2 = new mongoose.Types.ObjectId();
  const establishmentId = new mongoose.Types.ObjectId();

  const baseInput = {
    establishmentId,
    establishmentType: "restaurant",
    fromGovernorateId: gov1,
    fromAreaId: area1,
    toGovernorateId: gov2,
    toAreaId: area2,
    now: new Date(),
  };

  const createdRules = [];
  const createdOverrides = [];

  try {
    // ============================================
    // 1. Default
    // ============================================
    const defaultRule = await PricingRuleModel.create({
      name: `Resolver Default ${stamp}`,
      type: "default",
      amount: 100,
      priority: 1,
      isActive: true,
    });

    createdRules.push(defaultRule._id);

    let result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 100 &&
      String(result.ruleId) === String(defaultRule._id)
    ) {
      pass("Default rule is selected");
    } else {
      fail(
        "Default rule selection",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 2. Governorate rule overrides default
    // ============================================
    const govRule = await PricingRuleModel.create({
      name: `Resolver Governorate ${stamp}`,
      type: "governorate",
      amount: 150,
      governorateId: gov2,
      priority: 1,
      isActive: true,
    });

    createdRules.push(govRule._id);

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 150 &&
      String(result.ruleId) === String(govRule._id)
    ) {
      pass("Governorate rule overrides default");
    } else {
      fail(
        "Governorate specificity",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 3. Area rule overrides governorate
    // ============================================
    const areaRule = await PricingRuleModel.create({
      name: `Resolver Area ${stamp}`,
      type: "area",
      amount: 200,
      governorateId: gov2,
      areaId: area2,
      priority: 1,
      isActive: true,
    });

    createdRules.push(areaRule._id);

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 200 &&
      String(result.ruleId) === String(areaRule._id)
    ) {
      pass("Area rule overrides governorate");
    } else {
      fail(
        "Area specificity",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 4. Area-to-area overrides area
    // ============================================
    const areaToArea = await PricingRuleModel.create({
      name: `Resolver Area To Area ${stamp}`,
      type: "area_to_area",
      amount: 250,
      fromGovernorateId: gov1,
      fromAreaId: area1,
      toGovernorateId: gov2,
      toAreaId: area2,
      priority: 1,
      isActive: true,
    });

    createdRules.push(areaToArea._id);

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 250 &&
      String(result.ruleId) === String(areaToArea._id)
    ) {
      pass("Area-to-area rule overrides area rule");
    } else {
      fail(
        "Area-to-area specificity",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 5. Establishment-specific
    // ============================================
    const establishmentRule = await PricingRuleModel.create({
      name: `Resolver Establishment ${stamp}`,
      type: "establishment",
      amount: 300,
      establishmentId,
      priority: 1,
      isActive: true,
    });

    createdRules.push(establishmentRule._id);

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 300 &&
      String(result.ruleId) === String(establishmentRule._id)
    ) {
      pass("Establishment-specific rule overrides area-to-area");
    } else {
      fail(
        "Establishment specificity",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 6. Establishment type
    // ============================================
    const typeRule = await PricingRuleModel.create({
      name: `Resolver Restaurant Type ${stamp}`,
      type: "establishment_type",
      amount: 180,
      establishmentType: "restaurant",
      priority: 9999,
      isActive: true,
    });

    createdRules.push(typeRule._id);

    result = await resolveDeliveryFee(baseInput);

    // establishment specificity = 1100
    // type specificity = 900
    // establishment must still win
    if (
      Number(result.fee) === 300 &&
      String(result.ruleId) === String(establishmentRule._id)
    ) {
      pass("Specificity outranks priority across rule types");
    } else {
      fail(
        "Specificity vs priority",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 7. Disable establishment rule
    // ============================================
    await PricingRuleModel.findByIdAndUpdate(
      establishmentRule._id,
      { isActive: false }
    );

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 250 &&
      String(result.ruleId) === String(areaToArea._id)
    ) {
      pass("Inactive rule is ignored");
    } else {
      fail(
        "Inactive rule handling",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 8. Date window future rule
    // ============================================
    const future = new Date(Date.now() + 60 * 60 * 1000);

    const futureRule = await PricingRuleModel.create({
      name: `Resolver Future ${stamp}`,
      type: "default",
      amount: 9999,
      priority: 99999,
      isActive: true,
      startsAt: future,
    });

    createdRules.push(futureRule._id);

    result = await resolveDeliveryFee(baseInput);

    if (Number(result.fee) !== 9999) {
      pass("Future rule is not active yet");
    } else {
      fail(
        "Future rule handling",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 9. Override establishment
    // ============================================
    const override = await DeliveryPriceOverride.create({
      scope: "establishment",
      establishmentId,
      price: 450,
      priority: 1,
      isActive: true,
      note: `Resolver Override ${stamp}`,
    });

    createdOverrides.push(override._id);

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 450 &&
      String(result.ruleId) === String(override._id)
    ) {
      pass("Establishment override wins over PricingRule");
    } else {
      fail(
        "Override precedence",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 10. Disable override
    // ============================================
    await DeliveryPriceOverride.findByIdAndUpdate(
      override._id,
      { isActive: false }
    );

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 250 &&
      String(result.ruleId) === String(areaToArea._id)
    ) {
      pass("Inactive override is ignored");
    } else {
      fail(
        "Inactive override handling",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 11. Priority between same specificity
    // ============================================
    const areaToAreaLow = await PricingRuleModel.create({
      name: `Resolver Low Priority ${stamp}`,
      type: "area_to_area",
      amount: 260,
      fromGovernorateId: gov1,
      fromAreaId: area1,
      toGovernorateId: gov2,
      toAreaId: area2,
      priority: 1,
      isActive: true,
    });

    const areaToAreaHigh = await PricingRuleModel.create({
      name: `Resolver High Priority ${stamp}`,
      type: "area_to_area",
      amount: 275,
      fromGovernorateId: gov1,
      fromAreaId: area1,
      toGovernorateId: gov2,
      toAreaId: area2,
      priority: 999,
      isActive: true,
    });

    createdRules.push(
      areaToAreaLow._id,
      areaToAreaHigh._id
    );

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 275 &&
      String(result.ruleId) === String(areaToAreaHigh._id)
    ) {
      pass("Higher priority wins at same specificity");
    } else {
      fail(
        "Same-specificity priority",
        JSON.stringify(result, null, 2)
      );
    }

    // ============================================
    // 12. No matching rules
    // ============================================
    await PricingRuleModel.updateMany(
      {
        _id: {
          $in: createdRules,
        },
      },
      {
        $set: {
          isActive: false,
        },
      }
    );

    result = await resolveDeliveryFee(baseInput);

    if (
      Number(result.fee) === 0 &&
      result.ruleId === null
    ) {
      pass("No active rule returns zero fee");
    } else {
      fail(
        "No matching pricing rule",
        JSON.stringify(result, null, 2)
      );
    }

    console.log("\n==============================================");
    console.log(" PRICING RESOLVER TEST SUMMARY");
    console.log("==============================================");
    console.log(`PASS: ${passed}`);
    console.log(`FAIL: ${failed}`);

    if (failed === 0) {
      console.log("\n🎉 ALL PRICING RESOLVER TESTS PASSED");
      process.exitCode = 0;
    } else {
      console.log("\n⚠️ PRICING RESOLVER HAS FAILURES");
      process.exitCode = 2;
    }
  } finally {
    await PricingRuleModel.deleteMany({
      _id: { $in: createdRules },
    });

    await DeliveryPriceOverride.deleteMany({
      _id: { $in: createdOverrides },
    });

    await mongoose.disconnect();
  }
}

main().catch(async error => {
  console.error("\n💥 TEST CRASHED");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(3);
});
