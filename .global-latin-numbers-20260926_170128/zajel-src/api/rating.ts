
import { apiPost } from "./request";

export async function createCaptainRating(payload: {
  orderId: string;
  captainId: string;
  stars: number;
  comment?: string;
}) {
  const stars = Number(payload.stars);

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw new Error("التقييم يجب أن يكون من نجمة إلى خمس نجوم.");
  }

  return apiPost("/captain-ratings", {
    orderId: payload.orderId,
    captainId: payload.captainId,
    stars,
    text: payload.comment?.trim() || undefined,
  });
}
