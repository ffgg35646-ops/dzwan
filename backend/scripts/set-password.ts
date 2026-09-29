import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

import { env } from "../src/config/env.ts";
import { UserModel } from "../src/models/User.ts";
import {
  createPasswordHash,
  authenticateUser,
} from "../src/services/auth.service.ts";

const identifier = process.argv[2];
const newPassword = process.argv[3];

if (!identifier || !newPassword) {
  console.error("Usage: setpw EMAIL_OR_PHONE NEW_PASSWORD");
  process.exit(1);
}

async function main() {
  await mongoose.connect(env.mongodbUri, {
    dbName: "dzwan",
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  const normalized = identifier.trim();

  const user = await UserModel.findOne({
    $or: [
      { email: normalized.toLowerCase() },
      { phone: normalized },
    ],
  }).select("+passwordHash");

  if (!user) {
    throw new Error(`الحساب غير موجود: ${normalized}`);
  }

  const backupDir = path.join(process.cwd(), ".account-backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const backupPath = path.join(
    backupDir,
    `password-before-${user._id}-${Date.now()}.json`,
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        _id: user._id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        passwordHash: user.passwordHash,
      },
      null,
      2,
    ),
    "utf8",
  );

  user.passwordHash = await createPasswordHash(newPassword);
  await user.save();

  await authenticateUser(
    user.email || user.phone,
    newPassword,
  );

  console.log("");
  console.log("DONE");
  console.log(`Account: ${user.email || user.phone}`);
  console.log(`Role: ${user.role}`);
  console.log(`Status: ${user.status}`);
  console.log("Password changed successfully.");
  console.log(`Backup: ${backupPath}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error(
      "ERROR:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
