import { Platform } from "react-native";
import { api } from "./client";

export async function acceptCaptainOrder(orderId: string) {
  const response = await api.post(
    `/dispatch/orders/${orderId}/accept`
  );

  return response.data;
}

export async function submitPickupPhoto(
  orderId: string,
  photoUri: string
) {
  const form = new FormData();

  if (Platform.OS === "web") {
    const fileResponse = await fetch(photoUri);

    if (!fileResponse.ok) {
      throw new Error("تعذر قراءة صورة الاستلام.");
    }

    const blob = await fileResponse.blob();

    const file = new File(
      [blob],
      "pickup-photo.jpg",
      {
        type: blob.type || "image/jpeg",
      }
    );

    form.append("photo", file);

    const response = await api.post(
      `/orders/${orderId}/pickup-photo`,
      form
    );

    return response.data;
  }

  form.append("photo", {
    uri: photoUri,
    name: "pickup-photo.jpg",
    type: "image/jpeg",
  } as any);

  const response = await api.post(
    `/orders/${orderId}/pickup-photo`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function submitDeliveryPhoto(
  orderId: string,
  photoUri: string
) {
  const form = new FormData();

  if (Platform.OS === "web") {
    const fileResponse = await fetch(photoUri);

    if (!fileResponse.ok) {
      throw new Error("تعذر قراءة صورة إثبات التسليم.");
    }

    const blob = await fileResponse.blob();

    const file = new File(
      [blob],
      "delivery-proof.jpg",
      {
        type: blob.type || "image/jpeg",
      }
    );

    form.append("photo", file);

    const response = await api.post(
      `/delivery-proof/${orderId}/photo`,
      form
    );

    return response.data;
  }

  form.append("photo", {
    uri: photoUri,
    name: "delivery-proof.jpg",
    type: "image/jpeg",
  } as any);

  const response = await api.post(
    `/delivery-proof/${orderId}/photo`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}


export async function completeDelivery(
  orderId: string
) {
  const response = await api.patch(
    `/orders/${orderId}/status`,
    { status: "delivered" }
  );

  return response.data;
}

export async function recordCash(
  orderId: string,
  captainId: string,
  payload: {
    paidToEstablishment: number;
    collectedFromCustomer: number;
    deliveryFee: number;
  }
) {
  const response = await api.post(
    `/requirements/orders/${orderId}/cash/${captainId}`,
    payload
  );

  return response.data;
}


export async function uploadDeliveryProofPhoto(
  orderId: string,
  photoUri: string,
) {
  const form = new FormData();

  form.append("photo", {
    uri: photoUri,
    name: "delivery-proof.jpg",
    type: "image/jpeg",
  } as any);

  const response = await api.post(
    `/delivery-proof/${orderId}/photo`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function getDeliveryProof(orderId: string) {
  const response = await api.get(
    `/delivery-proof/${orderId}`,
  );

  return response.data;
}

export async function uploadPickupOrderPhoto(
  orderId: string,
  photoUri: string,
) {
  const form = new FormData();

  form.append("photo", {
    uri: photoUri,
    name: "pickup-photo.jpg",
    type: "image/jpeg",
  } as any);

  const response = await api.post(
    `/orders/${orderId}/pickup-photo`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function getPickupOrderPhoto(orderId: string) {
  const response = await api.get(
    `/orders/${orderId}/pickup-photo`,
  );

  return response.data;
}
