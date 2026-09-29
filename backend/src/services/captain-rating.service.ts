import { Types } from "mongoose";
import { CaptainRatingModel } from "../models/CaptainRating.js";

export async function getCaptainRatingSummary(
  captainId: Types.ObjectId,
) {
  const [summary] =
    await CaptainRatingModel.aggregate([
      {
        $match: { captainId },
      },
      {
        $group: {
          _id: "$captainId",
          total: { $sum: 1 },
          average: { $avg: "$stars" },
        },
      },
    ]);

  return {
    total: summary?.total ?? 0,
    average: Number(
      (summary?.average ?? 0).toFixed(2),
    ),
  };
}
