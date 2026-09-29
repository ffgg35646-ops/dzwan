
import { apiGet, apiPost, apiPatch } from "./request";

export type CaptainRegistrationPayload = {
  fullName: string;
  phone: string;
  email?: string;
  idFront?: string;
  idBack?: string;
  residenceFront?: string;
  residenceBack?: string;
};

export async function submitCaptainRegistration(
  payload: CaptainRegistrationPayload
) {
  if (!payload.fullName.trim()) {
    throw new Error("الاسم الثلاثي مطلوب.");
  }

  if (!payload.phone.trim()) {
    throw new Error("رقم الهاتف مطلوب.");
  }

  return apiPost("/captain-registration", {
    fullName: payload.fullName.trim(),
    phone: payload.phone.trim(),
    email: payload.email?.trim() || undefined,
    idFront: payload.idFront,
    idBack: payload.idBack,
    residenceFront: payload.residenceFront,
    residenceBack: payload.residenceBack,
  });
}

export async function getCaptainRegistration() {
  for (const path of [
    "/captain-registration/me",
    "/captain-registration/status",
    "/captains/me/registration",
  ]) {
    try {
      return await apiGet(path);
    } catch {}
  }
  return null;
}

export async function uploadCaptainDocument(
  type: string,
  fileUrl: string
) {
  return apiPost("/captain-documents", {
    type,
    fileUrl,
  });
}
