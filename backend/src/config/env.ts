import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const mongodbUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongodbUri) {
  throw new Error("MONGODB_URI is required");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri,
  jwtSecret,
} as const;
