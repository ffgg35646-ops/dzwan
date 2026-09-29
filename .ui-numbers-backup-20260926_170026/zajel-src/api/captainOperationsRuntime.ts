
import { apiGet, apiPatch } from "./request";

export async function getCaptainWorkAreas() {
  for (const path of [
    "/captain-work-areas/me",
    "/captains/me/work-areas",
    "/captain/work-areas",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return [];
}

export async function toggleCaptainWorkArea(
  areaId: string,
  enabled: boolean
) {
  for (const path of [
    `/captain-work-areas/${areaId}`,
    `/captains/me/work-areas/${areaId}`,
  ]) {
    try {
      return await apiPatch(path, { enabled });
    } catch {}
  }

  throw new Error(
    "تعذر تحديث منطقة العمل."
  );
}

export async function getCaptainDocuments() {
  for (const path of [
    "/captain-documents/me",
    "/captains/me/documents",
    "/captain/documents",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return [];
}

export async function getCaptainCashStatement(
  params?: Record<string, any>
) {
  for (const path of [
    "/captain-ledger/me/statement",
    "/captains/me/cash-statement",
    "/captain-cash/statement",
  ]) {
    try {
      return await apiGet(path, { params });
    } catch {}
  }

  return null;
}
