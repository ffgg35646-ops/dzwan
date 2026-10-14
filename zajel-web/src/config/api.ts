const isWeb = typeof window !== "undefined";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (isWeb
    ? "https://dzwan.vercel.app/api"
    : "http://localhost:4000/api");
