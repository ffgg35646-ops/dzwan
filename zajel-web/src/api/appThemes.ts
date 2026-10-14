
import { api } from "./client";
import {
  AppTheme,
} from "../theme/themeDefinitions";

export async function fetchActiveAppTheme(): Promise<AppTheme> {
  const response =
    await api.get(
      "/app-theme/active",
    );

  return (
    response.data?.data ??
    response.data
  );
}
