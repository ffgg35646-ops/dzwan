
import React, {
  PropsWithChildren,
  useEffect,
} from "react";
import {
  fetchActiveAppTheme,
} from "../api/appThemes";
import {
  useThemeStore,
} from "../store/themeStore";

export default function ThemeProvider({
  children,
}: PropsWithChildren) {
  const setTheme =
    useThemeStore(
      (state) => state.setTheme,
    );

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const remote =
          await fetchActiveAppTheme();

        if (
          alive &&
          remote?.id
        ) {
          setTheme(remote);
        }
      } catch {
        // الاحتفاظ بالستايل الافتراضي عند تعذر API
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [setTheme]);

  return <>{children}</>;
}
