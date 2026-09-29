export interface OrderCustomerSnapshot {
  name: string;
  phone: string;
  addressText: string;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function buildOrderCustomerSnapshot(
  input: any,
): OrderCustomerSnapshot {
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

  const rawLatitude =
    input?.customer?.latitude ??
    input?.deliveryLatitude ??
    null;

  const rawLongitude =
    input?.customer?.longitude ??
    input?.deliveryLongitude ??
    null;

  const latitude =
    rawLatitude == null
      ? null
      : Number(rawLatitude);

  const longitude =
    rawLongitude == null
      ? null
      : Number(rawLongitude);

  const hasLatitude =
    latitude !== null &&
    Number.isFinite(latitude);

  const hasLongitude =
    longitude !== null &&
    Number.isFinite(longitude);

  if (!name) {
    throw new Error("CUSTOMER_NAME_REQUIRED");
  }

  if (!phone) {
    throw new Error("CUSTOMER_PHONE_REQUIRED");
  }

  if (hasLatitude !== hasLongitude) {
    throw new Error(
      "CUSTOMER_LOCATION_COORDINATES_REQUIRED",
    );
  }

  if (!addressText && !hasLatitude) {
    throw new Error(
      "CUSTOMER_ADDRESS_OR_LOCATION_REQUIRED",
    );
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
    latitude: hasLatitude ? latitude : null,
    longitude: hasLongitude ? longitude : null,
  };
}
