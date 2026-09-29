export interface DeliveryProofPolicy {
  requireOtp: boolean;
  requirePhoto: boolean;
}

export function assertDeliveryProofComplete(
  policy: DeliveryProofPolicy,
  input: {
    otpVerified: boolean;
    photoUrl?: string | null;
  }
) {
  if (
    policy.requireOtp &&
    !input.otpVerified
  ) {
    throw new Error(
      "DELIVERY_OTP_REQUIRED"
    );
  }

  if (
    policy.requirePhoto &&
    !String(input.photoUrl || "").trim()
  ) {
    throw new Error(
      "DELIVERY_PHOTO_REQUIRED"
    );
  }

  if (
    !policy.requireOtp &&
    !policy.requirePhoto
  ) {
    return true;
  }

  if (
    !input.otpVerified &&
    !input.photoUrl
  ) {
    throw new Error(
      "DELIVERY_PROOF_REQUIRED"
    );
  }

  return true;
}
