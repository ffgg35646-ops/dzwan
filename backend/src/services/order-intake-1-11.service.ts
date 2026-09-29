import {
  assertCoordinates,
} from "./core-1-11.service.js";

export interface CustomerSnapshot {
  name: string;
  phone: string;
  addressText: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function buildCustomerSnapshot(
  input: any
): CustomerSnapshot {
  const name = String(
    input?.customer?.name ??
    input?.customerName ??
    ""
  ).trim();

  const phone = String(
    input?.customer?.phone ??
    input?.customerPhone ??
    ""
  ).trim();

  const addressText = String(
    input?.customer?.addressText ??
    input?.deliveryAddress ??
    input?.addressText ??
    ""
  ).trim();

  if (!name)
    throw new Error(
      "CUSTOMER_NAME_REQUIRED"
    );

  if (!phone)
    throw new Error(
      "CUSTOMER_PHONE_REQUIRED"
    );

  if (!addressText)
    throw new Error(
      "DELIVERY_ADDRESS_REQUIRED"
    );

  let latitude: number | null = null;
  let longitude: number | null = null;

  const rawLat =
    input?.customer?.latitude ??
    input?.deliveryLatitude;

  const rawLng =
    input?.customer?.longitude ??
    input?.deliveryLongitude;

  if (
    rawLat !== undefined ||
    rawLng !== undefined
  ) {
    const coords =
      assertCoordinates(
        rawLat,
        rawLng
      );

    latitude =
      coords.latitude;

    longitude =
      coords.longitude;
  }

  return {
    name,
    phone,
    addressText,
    note:
      input?.customer?.note ??
      input?.customerNote ??
      input?.deliveryNote ??
      null,
    latitude,
    longitude,
  };
}
