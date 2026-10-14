import { create } from "zustand";
import type { AccountType, AuthUser } from "../types/auth";
import { api, clearToken, getToken } from "../api/client";

const USER_KEY = "zajel_auth_user_v1";
const ACCOUNT_TYPE_KEY = "zajel_account_type";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeUser(value: any): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const id = String(value.id || value._id || "").trim();
  const role = value.role as AccountType;
  const validRole = [
    "captain",
    "shop",
    "governorate_leader",
    "area_leader",
  ].includes(role);

  if (!id || !validRole) return null;

  return {
    id,
    role,
    name: value.name || value.fullName || "",
    phone: value.phone || "",
    email: value.email ?? null,
    status: value.status,
    governorateId: value.governorateId ?? null,
    governorateName: value.governorateName ?? null,
    areaId: value.areaId ?? null,
    areaName: value.areaName ?? null,
    areaIds: Array.isArray(value.areaIds) ? value.areaIds.map(String) : [],
    avatarUrl: value.avatarUrl ?? null,
  };
}

function readStoredUser(): AuthUser | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function storeUser(user: AuthUser) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.localStorage.setItem(ACCOUNT_TYPE_KEY, user.role);
  } catch {
    // Keep the live session usable even if browser storage is unavailable.
  }
}

function clearStoredUser() {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(USER_KEY);
    window.localStorage.removeItem(ACCOUNT_TYPE_KEY);
  } catch {
    // The in-memory session is still cleared below.
  }
}

const initialUser = readStoredUser();

type AuthState = {
  accountType: AccountType | null;
  user: AuthUser | null;
  authenticated: boolean;
  navigationVersion: number;
  setAccountType: (type: AccountType) => void;
  setUser: (user: AuthUser) => void;
  restoreSession: () => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  accountType: initialUser?.role ?? null,
  user: initialUser,
  authenticated: Boolean(initialUser),
  navigationVersion: 0,

  setAccountType: (type) => set({ accountType: type }),

  setUser: (value) => {
    const user = normalizeUser(value);
    if (!user) return;

    storeUser(user);
    set({
      user,
      authenticated: true,
      accountType: user.role,
    });
  },

  restoreSession: async () => {
    const cachedUser = get().user ?? readStoredUser();
    const token = await getToken().catch(() => null);

    // Avoid making guest users wait or clearing a role they just selected.
    if (!cachedUser && !token) {
      set({ navigationVersion: get().navigationVersion + 1 });
      return;
    }

    try {
      let response;

      try {
        response = await api.get("/auth/me");
      } catch (error: any) {
        if (error?.response?.status !== 401) throw error;

        // The access token may have expired; try the existing refresh cookie.
        await clearToken();
        await api.post("/auth/refresh");
        response = await api.get("/auth/me");
      }

      const user = normalizeUser(response?.data?.user);
      if (!user || user.status !== "active") {
        const invalidSession = new Error("Session is not active") as Error & {
          sessionStatus?: number;
        };
        invalidSession.sessionStatus = 401;
        throw invalidSession;
      }

      storeUser(user);
      set({
        user,
        authenticated: true,
        accountType: user.role,
      });
    } catch (error: any) {
      const status = error?.response?.status ?? error?.sessionStatus;

      if (status === 401 || status === 403) {
        clearStoredUser();
        await clearToken().catch(() => undefined);
        set({
          user: null,
          authenticated: false,
          accountType: null,
        });
        void import("../utils/appSessionBootstrap")
          .then((runtime) => runtime.stopCaptainRuntime())
          .catch(() => undefined);
      }
      // On network/server failure, retain the last verified local user so a
      // temporary outage doesn't kick an active captain/shop out of the UI.
    } finally {
      set({ navigationVersion: get().navigationVersion + 1 });
    }
  },

  logout: () => {
    // Clear the UI and local credentials immediately; server cookies are revoked
    // in parallel so a slow network cannot trap the user in the profile screen.
    void api.post("/auth/logout").catch(() => undefined);
    clearStoredUser();
    void clearToken().catch(() => undefined);
    void import("../utils/appSessionBootstrap")
      .then((runtime) => runtime.stopCaptainRuntime())
      .catch(() => undefined);

    set({
      user: null,
      authenticated: false,
      accountType: null,
      navigationVersion: get().navigationVersion + 1,
    });
  },
}));
