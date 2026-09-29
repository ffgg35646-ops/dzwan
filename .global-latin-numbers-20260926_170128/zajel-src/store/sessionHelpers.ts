
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "zajel_token";
const ACCOUNT_TYPE_KEY = "zajel_account_type";

export async function restoreSession() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const accountType = await SecureStore.getItemAsync(ACCOUNT_TYPE_KEY);

  return {
    token,
    accountType: accountType as "captain" | "shop" | null,
  };
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ACCOUNT_TYPE_KEY);
}
