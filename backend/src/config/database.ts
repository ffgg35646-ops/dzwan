import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";
import { env } from "./env.js";

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(env.mongodbUri, {
    dbName: "dzwan",
    maxPoolSize: 5,
    maxConnecting: 1,
    maxIdleTimeMS: 5000,
    serverSelectionTimeoutMS: 15000,
  });

  attachDatabasePool(mongoose.connection.getClient());

  console.log("DZWAN MongoDB connected");
}
