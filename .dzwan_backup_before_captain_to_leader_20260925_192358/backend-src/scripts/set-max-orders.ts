import mongoose from "mongoose";
import { env } from "../config/env.js";
import { DispatchSettingsModel } from "../models/DispatchSettings.js";

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName: "dzwan" });

  const before = await DispatchSettingsModel.findOne()
    .select("_id maxActiveOrdersPerCaptain")
    .lean();

  await DispatchSettingsModel.updateOne(
    {},
    { $set: { maxActiveOrdersPerCaptain: 3 } },
    { upsert: true },
  );

  const after = await DispatchSettingsModel.findOne()
    .select("_id maxActiveOrdersPerCaptain")
    .lean();

  console.log({ before, after });

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
