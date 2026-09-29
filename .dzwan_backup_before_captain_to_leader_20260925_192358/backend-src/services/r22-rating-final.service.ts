import mongoose from "mongoose";
import CaptainRatingFinalModel from "../models/CaptainRatingFinal.js";

export async function rateCaptain(
  orderId: string,
  captainId: string,
  establishmentId: string,
  stars: number,
  review?: string
) {
  if (
    !Number.isInteger(stars) ||
    stars < 1 ||
    stars > 5
  ) {
    throw new Error("INVALID_RATING");
  }

  return CaptainRatingFinalModel.findOneAndUpdate(
    { orderId },
    {
      $set: {
        captainId,
        establishmentId,
        stars,
        review:
          review?.trim() || null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

export async function getCaptainAverageRating(
  captainId: string
) {
  const result =
    await CaptainRatingFinalModel.aggregate([
      {
        $match: {
          captainId: new mongoose.Types.ObjectId(captainId),
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$stars",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

  return {
    average:
      result[0]?.average || 0,
    count:
      result[0]?.count || 0,
  };
}
