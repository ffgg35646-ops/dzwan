export function assertValidCoordinates(
  latitude: unknown,
  longitude: unknown
) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("INVALID_COORDINATES");
  }

  if (lat < -90 || lat > 90) {
    throw new Error("INVALID_LATITUDE");
  }

  if (lng < -180 || lng > 180) {
    throw new Error("INVALID_LONGITUDE");
  }

  return {
    latitude: lat,
    longitude: lng,
  };
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    earthRadiusKm *
    Math.asin(Math.sqrt(a))
  );
}
