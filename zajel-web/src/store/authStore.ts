import { create } from "zustand";
import { api } from "../api/client";
import type { AccountType, AuthUser } from "../types/auth";

const USER_KEY = "zajel_auth_user_v1";

function readStoredUser(): AuthUser | null {
  try {
    if (typeof window === "undefined") return null;
    const token = window.localStorage.getItem("zajel_access_token") || window.localStorage.getItem("zajel_token");
    if (!token) return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    return user?.id && user?.role ? user : null;
  } catch {
    return null;
  }
}

type AuthState = {
  accountType: AccountType | null;
  user: AuthUser | null;
  authenticated: boolean;
  setAccountType: (type: AccountType) => void;
  setUser: (user: AuthUser) => void;
  restoreStoredUser: () => Promise<AuthUser | null>;
  logout: () => void;
};

const initialUser = readStoredUser();
export const useAuthStore = create<AuthState>((set) => ({
  accountType: initialUser?.role ?? null,
  user: initialUser,
  authenticated: Boolean(initialUser),
  setAccountType: (type) => set({ accountType: type }),
  setUser: (user) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
    set({ user, authenticated: true, accountType: user.role });
  },
  restoreStoredUser: async () => {
    const user = readStoredUser();
    if (!user) return null;
    set({ user, authenticated: true, accountType: user.role });
    return user;
  },
  logout: () => {
    // Clear server-issued HttpOnly cookies as well as the local browser session.
    void api.post("/auth/logout").catch(() => undefined);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_KEY);
        window.localStorage.removeItem("zajel_access_token");
        window.localStorage.removeItem("zajel_token");
      }
    } catch {}
    set({ accountType: null, user: null, authenticated: false });
  },
}));
