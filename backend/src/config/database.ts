import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(env.mongodbUri, {
    dbName: "dzwan",
    maxPoolSize: 5,
    maxConnecting: 1,
    serverSelectionTimeoutMS: 15000,
  });

  console.log("DZWAN MongoDB connected");
}
