
import {
  apiPatch,
  apiPost,
} from "./request";

export async function submitPickupPhoto(
  orderId: string,
  photoUrl: string
) {
  return apiPost(
    `/completion/orders/${orderId}/pickup-photo`,
    {
      photoUrl,
    }
  );
}

export async function submitDeliveryPhoto(
  orderId: string,
  photoUrl: string
) {
  return apiPost(
    `/completion/orders/${orderId}/delivery-photo`,
    {
      photoUrl,
    }
  );
}

export async function submitDeliveryOtp(
  orderId: string,
  otp: string
) {
  return apiPost(
    `/completion/orders/${orderId}/verify-otp`,
    {
      otp,
    }
  );
}

export async function completeDelivery(
  orderId: string
) {
  return apiPatch(
    `/orders/${orderId}/status`,
    {
      status: "delivered",
    }
  );
}
