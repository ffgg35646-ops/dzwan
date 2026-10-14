
import { apiGet, apiPost } from "./request";

export async function getMyDocuments() {
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

export async function submitDocument(payload: {
  type: string;
  fileUrl: string;
}) {
  return apiPost("/captain-documents", {
      documentType: payload.type,
      fileUrl: payload.fileUrl,
    });
}
