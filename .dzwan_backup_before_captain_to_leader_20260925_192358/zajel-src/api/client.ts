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

const isWeb =
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined";

async function readToken() {
  if (isWeb) {
    return window.localStorage.getItem("zajel_access_token");
  }

  return SecureStore.getItemAsync("zajel_access_token");
}

async function writeToken(token: string) {
  if (isWeb) {
    window.localStorage.setItem("zajel_access_token", token);
    return;
  }

  await SecureStore.setItemAsync("zajel_access_token", token);
}

async function removeToken() {
  if (isWeb) {
    window.localStorage.removeItem("zajel_access_token");
    return;
  }

  await SecureStore.deleteItemAsync("zajel_access_token");
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
