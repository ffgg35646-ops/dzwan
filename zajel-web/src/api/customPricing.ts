
import { apiGet } from "./request";

export async function getApplicableDeliveryPrice(
  params: {
    establishmentId?: string;
    areaId?: string;
    governorateId?: string;
    fromAreaId?: string;
    toAreaId?: string;
  },
) {
  return apiGet(
    "/delivery-price-overrides/applicable",
    {
      params,
    },
  );
}
