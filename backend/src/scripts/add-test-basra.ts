
import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { LocationModel } from "../models/Location.js";

await connectDatabase();

let location = await LocationModel.findOne({ name: "البصرة" });

if (!location) {
  location = await LocationModel.create({
    name: "البصرة",
    isActive: true,
    captainsEnabled: true,
    establishmentsEnabled: true,
    areas: [],
  });
}

const areaExists = location.areas.some((area) => area.name === "ذي قار");

if (!areaExists) {
  location.areas.push({
    name: "ذي قار",
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
