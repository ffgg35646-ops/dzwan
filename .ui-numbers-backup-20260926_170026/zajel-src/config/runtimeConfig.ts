
export const RUNTIME_CONFIG = {
  apiUrl:
    process.env.EXPO_PUBLIC_API_URL ||
    "http://192.168.100.15:4000/api",

  updateUrl:
    process.env.EXPO_PUBLIC_UPDATE_URL ||
    "https://example.com",

  captainLocationInterval: 30000,
} as const;
