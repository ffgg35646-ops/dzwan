
import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
} from "./request";

export async function getSupport() {
  return apiGet("/support");
}

export async function getOffers() {
  return apiGet("/offers");
}

export async function getAppBranding() {
  return apiGet("/app-branding");
}

export async function getAppUpdateInfo(
  app: "captain" | "shop",
) {
  return apiGet(
    `/app-update?app=${app}`,
  );
}

export async function getRewards() {
  return apiGet("/rewards");
}

export async function createComplaintFromApp(
  payload: Record<string, any>,
) {
  return apiPost(
    "/complaints",
    payload,
  );
}

export async function getPriceOverrides() {
  return apiGet(
    "/delivery-price-overrides",
  );
}
