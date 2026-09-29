import { apiGet, apiPost } from "./request";

export type CaptainRatingItem = {
  _id: string;
  stars: number;
  comment?: string | null;
  createdAt?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  restaurantName?: string | null;
};

export type CaptainRatingsResponse = {
  total: number;
  average: number;
  page: number;
  limit: number;
  totalPages: number;
  ratings: CaptainRatingItem[];
};

export type CaptainRatingSummary = {
  _id: string;
  name: string;
  phone?: string;
  total: number;
  average: number;
};

export async function rateCaptain(payload: {
  orderId: string;
  captainId: string;
  stars: number;
  text?: string;
}) {
  const stars = Number(payload.stars);

  if (
    !Number.isInteger(stars) ||
    stars < 1 ||
    stars > 5
  ) {
    throw new Error("التقييم يجب أن يكون من 1 إلى 5 نجوم.");
  }

  return apiPost("/captain-ratings", {
    orderId: payload.orderId,
    captainId: payload.captainId,
    stars,
    text: payload.text?.trim() || undefined,
  });
}

export async function getMyCaptainRatings(
  page = 1,
  limit = 4,
) {
  return apiGet(
    `/completion/ratings/me?page=${page}&limit=${limit}`,
  ) as Promise<{
    data?: CaptainRatingsResponse;
  }>;
}

export async function getCaptainRatings(
  captainId: string,
  page = 1,
  limit = 4,
) {
  return apiGet(
    `/completion/ratings/${encodeURIComponent(
      captainId,
    )}?page=${page}&limit=${limit}`,
  ) as Promise<{
    data?: CaptainRatingsResponse;
  }>;
}

export async function getCaptainRatingSummaries() {
  return apiGet(
    "/completion/ratings/captains",
  ) as Promise<{
    data?: {
      captains?: CaptainRatingSummary[];
    };
  }>;
}

export async function getCaptainRating(
  captainId: string,
) {
  return getCaptainRatings(captainId);
}
