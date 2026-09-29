import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI غير موجود في backend/.env.local");
}

await mongoose.connect(uri, {
  dbName: "dzwan",
  serverSelectionTimeoutMS: 10000,
});

const db = mongoose.connection.db;
const users = db.collection("users");

console.log("\n========================================");
console.log(" DZWAN DATABASE CLEANUP");
console.log(" DATABASE:", db.databaseName);
console.log("========================================\n");

const roleCounts = await users
  .aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])
  .toArray();

console.log("المستخدمون حسب الدور:");
for (const row of roleCounts) {
  console.log(`  ${String(row._id ?? "بدون role").padEnd(25)} ${row.count}`);
}

const protectedAdmins = await users
  .find({
    role: { $in: ["admin", "super_admin"] },
  })
  .toArray();

if (protectedAdmins.length === 0) {
  throw new Error(
    "توقف: لم يتم العثور على أي admin أو super_admin. لن يتم حذف أي شيء."
  );
}

const collectionsToDelete = [
  "establishments",
  "products",
  "establishmentregistrations",
  "establishmentregistrationverifications",

  "orders",
  "dispatchassignments",
  "dispatchqueues",
  "stuckorderalerts",
  "orderstagetimers",
  "ordertimelines",
  "orderstageevents",
  "core11orderstates",
  "deliveryproofs",
  "orderpickupphotos",
  "cancellationrecords",

  "complaints",

  "customeraddresses",

  "captainregistrations",
  "captainregistrationverifications",
  "captainattendances",
  "captaincashtransactions",
  "captainledgers",
  "captainratings",
  "captainratingfinals",
  "captainemergencies",
  "captainlocations",
  "captainworkareas",
  "captainworkareafinals",
  "captaindocuments",

  "rewardrecords",
  "passwordresetverifications",
  "pushdevices",

  "notifications",
];

console.log("\nالبيانات التي سيتم حذفها:");

for (const name of collectionsToDelete) {
  const exists = await db
    .listCollections({ name })
    .hasNext();

  if (!exists) continue;

  const count = await db.collection(name).countDocuments();

  if (count > 0) {
    console.log(`  ${name.padEnd(45)} ${count}`);
  }
}

const nonAdminUsers = await users.countDocuments({
  role: { $nin: ["admin", "super_admin"] },
});

console.log(
  `  ${"users (غير الأدمن)".padEnd(45)} ${nonAdminUsers}`
);

console.log("\nسيتم الإبقاء على:");
console.log("  users: admin + super_admin");
console.log("  locations");
console.log("  captainshifts");
console.log("  pricingrules");
console.log("  deliverypriceoverrides");
console.log("  geofences");
console.log("  settings / branding / themes / versions");
console.log("  auditlogs / securityevents / systemsecuritylogs");
console.log("  staffpermissions");
console.log("\n");

if (process.env.CONFIRM_PURGE !== "YES") {
  console.log("DRY RUN فقط.");
  console.log("للتنفيذ الحقيقي:");
  console.log("CONFIRM_PURGE=YES node scripts/purge-all-non-admin-data.mjs");
  await mongoose.disconnect();
  process.exit(0);
}

/* Backup للأدمن قبل الحذف */
const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupPath = path.join(
  process.cwd(),
  "backups",
  `admin-users-${timestamp}.json`
);

fs.writeFileSync(
  backupPath,
  JSON.stringify(protectedAdmins, null, 2),
  "utf8"
);

console.log("Backup للأدمن:");
console.log(`  ${backupPath}\n`);

/* حذف كل المستخدمين غير الأدمن */
const userDeleteResult = await users.deleteMany({
  role: { $nin: ["admin", "super_admin"] },
});

console.log(
  `users: تم حذف ${userDeleteResult.deletedCount} مستخدم غير أدمن`
);

/* حذف collections التشغيلية */
for (const name of collectionsToDelete) {
  const exists = await db
    .listCollections({ name })
    .hasNext();

  if (!exists) continue;

  const result = await db.collection(name).deleteMany({});

  if (result.deletedCount > 0) {
    console.log(
      `${name}: تم حذف ${result.deletedCount}`
    );
  }
}

/* تحقق نهائي */
const remainingUsers = await users.countDocuments();

const remainingAdmins = await users.countDocuments({
  role: { $in: ["admin", "super_admin"] },
});

const remainingNonAdmins = await users.countDocuments({
  role: { $nin: ["admin", "super_admin"] },
});

const remainingEstablishments =
  await db.collection("establishments").countDocuments();

const remainingOrders =
  await db.collection("orders").countDocuments();

console.log("\n========================================");
console.log(" النتيجة النهائية");
console.log("========================================");
console.log("إجمالي users المتبقي:", remainingUsers);
console.log("Admins المتبقون:", remainingAdmins);
console.log("Non-admin المتبقون:", remainingNonAdmins);
console.log("Establishments المتبقية:", remainingEstablishments);
console.log("Orders المتبقية:", remainingOrders);

if (
  remainingAdmins !== protectedAdmins.length ||
  remainingNonAdmins !== 0 ||
  remainingEstablishments !== 0 ||
  remainingOrders !== 0
) {
  console.log("\n⚠️ تحقق: توجد بيانات لم تُحذف بالكامل.");
} else {
  console.log("\n✅ تم تنظيف بيانات المستخدمين والمطاعم بنجاح.");
}

await mongoose.disconnect();
