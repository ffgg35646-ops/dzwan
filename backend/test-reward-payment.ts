import mongoose from "mongoose";
import { env } from "./src/config/env.js";
import RewardRecord from "./src/models/RewardRecord.js";
import {
  getCaptainBalance,
  addCaptainLedgerEntry,
} from "./src/services/captain-ledger.service.js";

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName: "dzwan" });

  const captainId = new mongoose.Types.ObjectId(
    "6aa33e13df4fea4500e0cab5"
  );

  const ruleId = new mongoose.Types.ObjectId(
    "6aa62b611cffba4ac3fdfa89"
  );

  const rewardValue = 5000;

  try {
    const before = await getCaptainBalance(captainId);

    const record = await RewardRecord.create({
      ruleId,
      target: "captain",
      targetId: captainId,
      orderId: null,
      metricValue: 1,
      threshold: 1,
      rewardValue,
      status: "pending",
      reason: "اختبار دفع مكافأة",
      earnedAt: new Date(),
    });

    await addCaptainLedgerEntry({
      captainId,
      type: "bonus",
      amount: rewardValue,
      referenceType: "reward",
      referenceId: record._id,
      description: "اختبار إضافة مكافأة للكابتن",
    });

    await RewardRecord.findByIdAndUpdate(record._id, {
      $set: {
        status: "paid",
        paidAt: new Date(),
      },
    });

    const after = await getCaptainBalance(captainId);

    console.log(
      JSON.stringify(
        {
          before,
          reward: rewardValue,
          after,
          added: after - before,
          recordId: record._id,
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
