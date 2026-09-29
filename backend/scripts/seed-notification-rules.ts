import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import { NotificationRuleModel } from "../src/models/NotificationRule.js";

const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "";

if (!uri) {
  throw new Error("MONGODB_URI غير موجود.");
}

await mongoose.connect(uri);

const rules = [
  {
    event: "order.created",
    title: "طلب جديد",
    message: "لديك طلب جديد رقم {{orderNumber}}.",
    recipients: ["captain"],
  },
  {
    event: "order.captain_accepted",
    title: "تم قبول الكابتن",
    message: "تم قبول الكابتن للطلب {{orderNumber}}.",
    recipients: ["shop"],
  },
  {
    event: "order.stuck",
    title: "طلب متأخر",
    message: "الطلب {{orderNumber}} متأخر ويحتاج متابعة.",
    recipients: ["admin"],
  },
  {
    event: "order.reassigned",
    title: "إعادة تعيين الطلب",
    message: "تم إعادة تعيين الطلب {{orderNumber}}.",
    recipients: ["captain", "shop"],
  },
  {
    event: "captain.emergency",
    title: "طوارئ كابتن",
    message: "تم تسجيل حالة طوارئ للكابتن.",
    recipients: ["admin"],
  },
];

for (const rule of rules) {
  await NotificationRuleModel.findOneAndUpdate(
    { event: rule.event },
    {
      ...rule,
      enabled: true,
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );
}

await mongoose.disconnect();

console.log("✅ تم إنشاء قواعد إشعارات الأحداث.");
