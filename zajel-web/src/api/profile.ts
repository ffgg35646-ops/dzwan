import { apiGet, apiPost } from "./request";

export async function getMyProfile() {
  return apiGet("/profile/me");
}

export async function requestEmailChange(email: string) {
  return apiPost("/profile/email/request", {
    email,
  });
}

export async function verifyEmailChange(
  verificationId: string,
  otp: string,
) {
  return apiPost("/profile/email/verify", {
    verificationId,
    otp,
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiPost("/profile/password/change", payload);
}
