
import { create } from "zustand";
import {
  AppTheme,
  DEFAULT_THEME,
} from "../theme/themeDefinitions";

type ThemeState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

export const useThemeStore =
  create<ThemeState>((set) => ({
    theme: DEFAULT_THEME,

    setTheme: (theme) =>
      set({
        theme,
      }),
  }));
