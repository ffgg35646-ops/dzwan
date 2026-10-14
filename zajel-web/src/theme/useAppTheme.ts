
import { useThemeStore } from "../store/themeStore";

export function useAppTheme() {
  return useThemeStore(
    (state) => state.theme,
  );
}
