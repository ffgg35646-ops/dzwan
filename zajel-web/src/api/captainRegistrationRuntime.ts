
import { apiGet, apiPost } from "./request";

export type CaptainRegistrationInput = {
 fullName: string;
  phone: string;
  email?: string;
  idFront?: string;
  idBack?: string;
  residenceFront?: string;
  residenceBack?: string;
};

export async function registerCaptain(
  input: CaptainRegistrationInput
) {
  if (!input.fullName.trim()) {
    throw new Error("الاسم الثلاثي مطلوب.");
  }

  if (!input.phone.trim()) {
    throw new Error("رقم الهاتف مطلوب.");
  }

  return apiPost("/captain-registration", {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    idFront: input.idFront,
    idBack: input.idBack,
    residenceFront: input.residenceFront,
    residenceBack: input.residenceBack,
  });
}

export async function getCaptainRegistrationStatus() {
  const candidates = [
    "/captain-registration/me",
    "/captain-registration/status",
    "/captains/me/registration",
  ];

  for (const path of candidates) {
    try {
      return await apiGet(path);
    } catch {}
  }

  return null;
}
