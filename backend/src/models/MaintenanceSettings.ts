
import { Schema, model } from "mongoose";

const schema = new Schema({
  enabled: { type: Boolean, default: false },
  title: { type: String, default: "الصيانة" },
  message: { type: String, default: "الخدمة متوقفة مؤقتًا للصيانة." },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  allowAdmins: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

export const MaintenanceSettingsModel =
  model("MaintenanceSettings", schema);
