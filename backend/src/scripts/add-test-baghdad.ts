
import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import mongoose from "mongoose";
import { LocationModel } from "../models/Location.js";

await connectDatabase();

let location = await LocationModel.findOne({ name: "بغداد" });

if (!location) {
  location = await LocationModel.create({
    name: "بغداد",
    isActive: true,
    captainsEnabled: true,
    establishmentsEnabled: true,
    areas: [],
  });
}

const areaExists = location.areas.some((area) => area.name === "كايرو");

if (!areaExists) {
  location.areas.push({
    name: "كايرو",
    isActive: true,
    captainsEnabled: true,
    establishmentsEnabled: true,
  } as any);

  await location.save();
}

console.log("TEST LOCATION READY");
console.log({
  governorate: location.name,
  areas: location.areas.map((area) => area.name),
});

await mongoose.disconnect();
