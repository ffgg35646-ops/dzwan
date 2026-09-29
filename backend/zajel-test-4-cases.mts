import mongoose, { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { connectDatabase } from "./src/config/database.js";
import { LocationModel } from "./src/models/Location.js";
import { UserModel } from "./src/models/User.js";
import { EstablishmentModel } from "./src/models/Establishment.js";
import EstablishmentRegistrationModel from "./src/models/EstablishmentRegistration.js";
import CaptainRegistrationModel from "./src/models/CaptainRegistration.js";
import { canCaptainReceiveOrder } from "./src/services/captain-work-eligibility.service.js";

const API = "http://localhost:4000/api";
const TEST_TAG = `TEST-${Date.now()}`;

const result = (name: string, ok: boolean, detail: string) =>
  console.log(`${ok ? "✅ PASS" : "❌ FAIL"} | ${name} | ${detail}`);

await connectDatabase();

const location = await LocationModel.findOne({ name: "البصرة" });
if (!location) throw new Error("البصرة غير موجودة");

const area = location.areas.find((a) => a.name === "ذي قار");
if (!area) throw new Error("منطقة ذي قار غير موجودة");

const oldCaptainPhone = `070${Date.now().toString().slice(-8)}`;
const oldShopPhone = `071${Date.now().toString().slice(-8)}`;

const passwordHash = await bcrypt.hash("Test123456", 12);

const oldCaptain = await UserModel.create({
  role: "captain",
  status: "active",
  operationalEnabled: true,
  fullName: `${TEST_TAG} كابتن قديم`,
  phone: oldCaptainPhone,
  email: `${TEST_TAG}-captain@test.local`,
  passwordHash,
  isOnline: false,
  governorateId: location._id,
  areaId: area._id,
  approvedAt: new Date(),
});

const oldShopUser = await UserModel.create({
  role: "shop",
  status: "active",
  operationalEnabled: true,
  fullName: `${TEST_TAG} صاحب مطعم قديم`,
  phone: oldShopPhone,
  email: `${TEST_TAG}-shop@test.local`,
  passwordHash,
  isOnline: false,
  governorateId: location._id,
  areaId: area._id,
  approvedAt: new Date(),
});

const oldEstablishment = await EstablishmentModel.create({
  name: `${TEST_TAG} مطعم قديم`,
  type: "restaurant",
  status: "active",
  operationalEnabled: true,
  phone: oldShopPhone,
  email: `${TEST_TAG}-est@test.local`,
  address: "عنوان اختبار",
  governorateId: location._id,
  areaId: area._id,
  ownerUserId: oldShopUser._id,
});

const captainRegistrationResponse = await fetch(
  `${API}/captain-registration`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: `${TEST_TAG} كابتن جديد`,
      phone: `072${Date.now().toString().slice(-8)}`,
      email: `${TEST_TAG}-newcaptain@test.local`,
      gmail: `${TEST_TAG}-gmail@test.local`,
      password: "Test123456",
      governorateId: location._id.toString(),
      areaId: area._id.toString(),
      idFrontUrl: "https://test.local/id-front.jpg",
      idBackUrl: "https://test.local/id-back.jpg",
      residenceFrontUrl: "https://test.local/res-front.jpg",
      residenceBackUrl: "https://test.local/res-back.jpg",
    }),
  },
);

const captainRegistrationBody = await captainRegistrationResponse.json();

result(
  "كابتن جديد قبل التعطيل",
  captainRegistrationResponse.ok,
  JSON.stringify(captainRegistrationBody),
);

const shopRegistrationResponse = await fetch(
  `${API}/establishment-registration`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${TEST_TAG} مطعم جديد`,
      type: "restaurant",
      phone: `073${Date.now().toString().slice(-8)}`,
      email: `${TEST_TAG}-newshop@test.local`,
      address: "عنوان اختبار",
      ownerFullName: `${TEST_TAG} صاحب جديد`,
      ownerPhone: `074${Date.now().toString().slice(-8)}`,
      gmail: `${TEST_TAG}-newshop-gmail@test.local`,
      password: "Test123456",
      governorateId: location._id.toString(),
      areaId: area._id.toString(),
    }),
  },
);

const shopRegistrationBody = await shopRegistrationResponse.json();

result(
  "مطعم جديد قبل التعطيل",
  shopRegistrationResponse.ok,
  JSON.stringify(shopRegistrationBody),
);

const captainAvailableBefore = await fetch(
  `${API}/locations/available?type=captain&search=البص`,
).then((r) => r.json());

const shopAvailableBefore = await fetch(
  `${API}/locations/available?type=establishment&search=البص`,
).then((r) => r.json());

result(
  "البصرة تظهر للكابتن قبل التعطيل",
  captainAvailableBefore.locations?.some((x: any) => x.name === "البصرة") === true,
  JSON.stringify(captainAvailableBefore),
);

result(
  "البصرة تظهر للمطعم قبل التعطيل",
  shopAvailableBefore.locations?.some((x: any) => x.name === "البصرة") === true,
  JSON.stringify(shopAvailableBefore),
);

await LocationModel.updateOne(
  { _id: location._id },
  { $set: { captainsEnabled: false } },
);

const captainAvailableAfterGov = await fetch(
  `${API}/locations/available?type=captain&search=البص`,
).then((r) => r.json());

const shopAvailableAfterGov = await fetch(
  `${API}/locations/available?type=establishment&search=البص`,
).then((r) => r.json());

result(
  "البصرة تختفي من تسجيل الكابتن بعد تعطيل الكباتن",
  captainAvailableAfterGov.locations?.some((x: any) => x.name === "البصرة") !== true,
  JSON.stringify(captainAvailableAfterGov),
);

result(
  "البصرة تظل ظاهرة للمطاعم",
  shopAvailableAfterGov.locations?.some((x: any) => x.name === "البصرة") === true,
  JSON.stringify(shopAvailableAfterGov),
);

const oldCaptainBlocked = await canCaptainReceiveOrder(oldCaptain._id);

result(
  "الكابتن القديم يتمنع بعد تعطيل المحافظة",
  oldCaptainBlocked.allowed === false &&
    oldCaptainBlocked.reason === "CAPTAIN_GOVERNORATE_OPERATIONAL_DISABLED",
  JSON.stringify(oldCaptainBlocked),
);

result(
  "المطعم القديم لا يتغير مكانه",
  String(oldEstablishment.governorateId) === String(location._id) &&
    String(oldEstablishment.areaId) === String(area._id),
  `governorate=${oldEstablishment.governorateId}, area=${oldEstablishment.areaId}`,
);

await LocationModel.updateOne(
  { _id: location._id },
  {
    $set: {
      captainsEnabled: true,
      "areas.$[area].captainsEnabled": false,
      "areas.$[area].establishmentsEnabled": false,
    },
  },
  { arrayFilters: [{ "area._id": area._id }] },
);

const captainAvailableAfterArea = await fetch(
  `${API}/locations/available?type=captain&search=البص`,
).then((r) => r.json());

const shopAvailableAfterArea = await fetch(
  `${API}/locations/available?type=establishment&search=البص`,
).then((r) => r.json());

const returnedCaptain = captainAvailableAfterArea.locations
  ?.find((x: any) => x.name === "البصرة")
  ?.areas?.some((x: any) => x.name === "ذي قار");

const returnedShop = shopAvailableAfterArea.locations
  ?.find((x: any) => x.name === "البصرة")
  ?.areas?.some((x: any) => x.name === "ذي قار");

result(
  "ذي قار تختفي من تسجيل الكابتن بعد تعطيل المنطقة",
  returnedCaptain !== true,
  JSON.stringify(captainAvailableAfterArea),
);

result(
  "ذي قار تختفي من تسجيل المطعم بعد تعطيل المنطقة",
  returnedShop !== true,
  JSON.stringify(shopAvailableAfterArea),
);

await LocationModel.updateOne(
  { _id: location._id },
  {
    $set: {
      captainsEnabled: true,
      establishmentsEnabled: true,
      "areas.$[area].captainsEnabled": true,
      "areas.$[area].establishmentsEnabled": true,
    },
  },
  { arrayFilters: [{ "area._id": area._id }] },
);

const captainAvailableRestored = await fetch(
  `${API}/locations/available?type=captain&search=البص`,
).then((r) => r.json());

const shopAvailableRestored = await fetch(
  `${API}/locations/available?type=establishment&search=البص`,
).then((r) => r.json());

result(
  "الكابتن يرجع متاحًا بعد إعادة التفعيل",
  captainAvailableRestored.locations?.some((x: any) => x.name === "البصرة") === true &&
    captainAvailableRestored.locations
      ?.find((x: any) => x.name === "البصرة")
      ?.areas?.some((x: any) => x.name === "ذي قار"),
  JSON.stringify(captainAvailableRestored),
);

result(
  "المطعم يرجع متاحًا بعد إعادة التفعيل",
  shopAvailableRestored.locations?.some((x: any) => x.name === "البصرة") === true &&
    shopAvailableRestored.locations
      ?.find((x: any) => x.name === "البصرة")
      ?.areas?.some((x: any) => x.name === "ذي قار"),
  JSON.stringify(shopAvailableRestored),
);

const captainStillExists = await UserModel.exists({ _id: oldCaptain._id });
const shopStillExists = await EstablishmentModel.exists({
  _id: oldEstablishment._id,
});

result(
  "الكابتن القديم لم يُحذف",
  !!captainStillExists,
  String(oldCaptain._id),
);

result(
  "المطعم القديم لم يُحذف",
  !!shopStillExists,
  String(oldEstablishment._id),
);

console.log("\n========== TEST SUMMARY ==========");
console.log("TEST TAG:", TEST_TAG);
console.log("OLD CAPTAIN:", oldCaptain._id.toString());
console.log("OLD RESTAURANT:", oldEstablishment._id.toString());
console.log("NEW CAPTAIN REGISTRATION:", captainRegistrationBody.registrationId ?? "N/A");
console.log("NEW RESTAURANT REGISTRATION:", shopRegistrationBody.registrationId ?? "N/A");
console.log("==================================");

await UserModel.deleteMany({
  email: {
    $in: [
      `${TEST_TAG}-captain@test.local`,
      `${TEST_TAG}-shop@test.local`,
    ],
  },
});

await EstablishmentModel.deleteOne({ _id: oldEstablishment._id });

if (captainRegistrationBody.registrationId) {
  await CaptainRegistrationModel.deleteOne({
    _id: captainRegistrationBody.registrationId,
  }).catch(() => {});
}

if (shopRegistrationBody.registrationId) {
  await EstablishmentRegistrationModel.deleteOne({
    _id: shopRegistrationBody.registrationId,
  }).catch(() => {});
}

await mongoose.disconnect();
