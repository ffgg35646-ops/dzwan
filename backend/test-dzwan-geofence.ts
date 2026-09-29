import mongoose from "mongoose";

async function main() {
  const { default: GovernorateModel } =
    await import(process.cwd() + "/src/models/Governorate.ts");

  const { default: AreaModel } =
    await import(process.cwd() + "/src/models/Area.ts");

  const { default: GeofenceModel } =
    await import(process.cwd() + "/src/models/Geofence.ts");

  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    process.env.DATABASE_URL;

  if (!uri) throw new Error("MONGODB_URI / MONGO_URI / DATABASE_URL غير موجود");

  await mongoose.connect(uri, {
    dbName: "dzwan",
    serverSelectionTimeoutMS: 10000,
  });

  const stamp = Date.now();
  let gov: any = null;
  let area: any = null;
  let geofence: any = null;

  try {
    console.log("\n===== 1. إنشاء محافظة تجريبية =====");

    gov = await GovernorateModel.create({
      name: `اختبار محافظة ${stamp}`,
      code: `TEST-${stamp}`,
      isActive: true,
    });

    console.log("✅ المحافظة:", gov._id.toString());

    console.log("\n===== 2. إنشاء منطقة تجريبية =====");

    area = await AreaModel.create({
      name: `اختبار منطقة ${stamp}`,
      governorateId: gov._id,
      isActive: true,
    });

    console.log("✅ المنطقة:", area._id.toString());

    console.log("\n===== 3. إنشاء تغطية جغرافية =====");

    geofence = await GeofenceModel.create({
      name: `اختبار تغطية ${stamp}`,
      description: "اختبار مؤقت",
      governorateId: gov._id,
      areaId: area._id,
      enabled: true,
      polygon: [
        { lat: 30.0444, lng: 31.2357 },
        { lat: 30.0450, lng: 31.2365 },
        { lat: 30.0440, lng: 31.2370 },
      ],
    });

    console.log("✅ التغطية:", geofence._id.toString());

    console.log("\n===== 4. قراءة التغطيات المحفوظة =====");

    const rows = await GeofenceModel.find().sort({ createdAt: -1 }).lean();

    const found = rows.find(
      (x: any) => String(x._id) === String(geofence._id),
    );

    console.log("عدد التغطيات:", rows.length);
    console.log(
      "هل التغطية التجريبية ظهرت؟",
      found ? "✅ نعم" : "❌ لا",
    );

    if (found) {
      console.log("البيانات المقروءة:");
      console.log({
        id: String(found._id),
        name: found.name,
        governorateId: String(found.governorateId),
        areaId: found.areaId ? String(found.areaId) : null,
        points: found.polygon?.length,
      });
    }
  } finally {
    console.log("\n===== 5. حذف بيانات الاختبار =====");

    if (geofence?._id) {
      await GeofenceModel.findByIdAndDelete(geofence._id);
      console.log("✅ تم حذف التغطية");
    }

    if (area?._id) {
      await AreaModel.findByIdAndDelete(area._id);
      console.log("✅ تم حذف المنطقة");
    }

    if (gov?._id) {
      await GovernorateModel.findByIdAndDelete(gov._id);
      console.log("✅ تم حذف المحافظة");
    }

    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error("\n❌ فشل الاختبار:");
  console.error(err);
  process.exit(1);
});
