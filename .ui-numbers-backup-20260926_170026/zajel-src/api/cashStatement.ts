
import { apiGet } from "./request";

export async function getCashStatement(params?: {
  from?: string;
  to?: string;
}) {
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
