import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

import type { AccountType, AuthUser } from "../types/auth";
import { clearToken } from "../api/client";
import {
  bootstrapAfterLogin,
  stopCaptainRuntime,
} from "../utils/appSessionBootstrap";

const USER_KEY = "zajel_auth_user_v1";

type AuthState = {
  accountType: AccountType | null;
  user: AuthUser | null;
  authenticated: boolean;

  setAccountType: (type: AccountType) => void;
  setUser: (user: AuthUser) => void;
  restoreStoredUser: () => Promise<AuthUser | null>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accountType: null,
  user: null,
  authenticated: false,

  setAccountType: (type) => set({ accountType: type }),

  setUser: (user) => {
    set({
      user,
      authenticated: true,
      accountType: user.role,
    });

    void SecureStore.setItemAsync(
      USER_KEY,
      JSON.stringify(user),
    ).catch(() => undefined);

    void bootstrapAfterLogin(user.role);
  },

  restoreStoredUser: async () => {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);

      if (!raw) return null;

      const user = JSON.parse(raw) as AuthUser;

      if (!user?.id || !user?.role) {
        await SecureStore.deleteItemAsync(USER_KEY);
        return null;
      }

      set({
        user,
        authenticated: true,
        accountType: user.role,
      });

      return user;
    } catch {
      return null;
    }
  },

  logout: () => {
    set({
      accountType: null,
      user: null,
      authenticated: false,
    });

    void Promise.all([
      SecureStore.deleteItemAsync(USER_KEY),
      SecureStore.deleteItemAsync("zajel_token"),
      clearToken(),
      stopCaptainRuntime(),
    ]).catch(() => undefined);
  },
}));
