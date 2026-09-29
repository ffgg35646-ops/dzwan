if (process.env.VERCEL !== "1") {
  process.loadEnvFile(".env.local");
}

const mongodbUri =
  process.env.MONGODB_URI ?? "";

const jwtSecret =
  process.env.JWT_SECRET ?? "";

export const env = {
  nodeEnv:
    process.env.NODE_ENV ?? "development",

  port:
    Number(process.env.PORT ?? 4000),

  mongodbUri,

  jwtSecret,
} as const;
