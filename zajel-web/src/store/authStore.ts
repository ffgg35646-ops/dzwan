import { create } from "zustand";
import type { AccountType, AuthUser } from "../types/auth";

type AuthState = {
  accountType: AccountType | null;
  user: AuthUser | null;
  authenticated: boolean;

  setAccountType: (type: AccountType) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accountType: null,
  user: null,
  authenticated: false,

  setAccountType: (type) =>
    set({
      accountType: type,
    }),

  setUser: (user) =>
    set({
      user,
      authenticated: true,
      accountType: user.role,
    }),

  logout: () =>
    set({
      accountType: null,
      user: null,
      authenticated: false,
    }),
}));
