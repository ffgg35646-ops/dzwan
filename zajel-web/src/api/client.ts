import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

const ACCESS_TOKEN_KEY = "zajel_access_token";
const LEGACY_TOKEN_KEY = "zajel_token";

const isWeb =
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined";

async function readToken() {
  if (isWeb) {
    const current = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    if (current) return current;
    const legacy = window.localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, legacy);
      window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return legacy;
  }
  const current = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (current) return current;
  const legacy = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacy);
    await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => undefined);
  }
  return legacy;
}

async function writeToken(token: string) {
  if (isWeb) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => undefined);
}

async function removeToken() {
  if (isWeb) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_TOKEN_KEY);
    return;
  }
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY).catch(() => undefined),
  ]);
}

api.interceptors.request.use(async (config) => {
  const token = await readToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (
    typeof FormData !== "undefined" &&
    config.data instanceof FormData
  ) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

export async function saveToken(token: string) {
  await writeToken(token);
}

export async function getToken() {
  return readToken();
}

export async function clearToken() {
  await removeToken();
}
