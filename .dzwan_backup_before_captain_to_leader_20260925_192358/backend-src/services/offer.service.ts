import { Types } from "mongoose";
import OfferModel from "../models/Offer.js";

function isOfferCurrentlyValid(
  offer: {
    isActive: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
    usageLimit?: number | null;
    usageCount?: number | null;
  },
  now = new Date(),
) {
  if (!offer.isActive) {
    return false;
  }

  if (
    offer.startsAt &&
    now < new Date(offer.startsAt)
  ) {
    return false;
  }

  if (
    offer.endsAt &&
    now > new Date(offer.endsAt)
  ) {
    return false;
  }

  if (
    offer.usageLimit !== null &&
    offer.usageLimit !== undefined &&
    Number(offer.usageCount ?? 0) >=
      Number(offer.usageLimit)
  ) {
    return false;
  }

  return true;
}

export async function findValidOffer(input: {
  establishmentId?: Types.ObjectId | null;
  code: string;
}) {
  const code = input.code.trim().toUpperCase();

  if (!code) {
    throw new Error("أدخل كود العرض.");
  }

  const establishmentId =
    input.establishmentId ?? null;

  const offers = await OfferModel.find({
    code,
    isActive: true,
    $or: [
      {
        establishmentId,
      },
      {
        establishmentId: null,
      },
      {
        establishmentId: {
          $exists: false,
        },
      },
    ],
  })
    .sort({
      establishmentId: -1,
      createdAt: -1,
    })
    .lean();

  const offer = offers.find((candidate) => {
    if (
      candidate.audience !== "all" &&
      candidate.audience !==
        "establishments"
    ) {
      return false;
    }

    if (
      candidate.establishmentId &&
      String(candidate.establishmentId) !==
        String(establishmentId)
    ) {
      return false;
    }

    return isOfferCurrentlyValid(
      candidate,
    );
  });

  if (!offer) {
    throw new Error(
      "العرض غير موجود أو لا ينطبق على هذه المنشأة.",
    );
  }

  return offer;
}

export async function calculateOfferDiscount(
  offer: {
    type: "percentage" | "fixed";
    value: number;
    minOrderAmount: number;
    maxDiscount?: number | null;
  },
  orderAmount: number,
) {
  if (
    Number(orderAmount) <
    Number(offer.minOrderAmount)
  ) {
    throw new Error(
      `الحد الأدنى للاستفادة من العرض هو ${offer.minOrderAmount}.`,
    );
  }

  let discount =
    offer.type === "percentage"
      ? orderAmount *
        (Number(offer.value) / 100)
      : Number(offer.value);

  if (
    offer.maxDiscount !== null &&
    offer.maxDiscount !== undefined
  ) {
    discount = Math.min(
      discount,
      Number(offer.maxDiscount),
    );
  }

  discount = Math.min(
    discount,
    orderAmount,
  );

  return Number(
    discount.toFixed(2),
  );
}

export async function consumeOffer(
  offerId: Types.ObjectId,
) {
  const now = new Date();

  const query: Record<
    string,
    unknown
  > = {
    _id: offerId,
    isActive: true,
    $or: [
      {
        startsAt: {
          $lte: now,
        },
      },
      {
        startsAt: null,
      },
    ],
    $and: [
      {
        $or: [
          {
            endsAt: {
              $gte: now,
            },
          },
          {
            endsAt: null,
          },
        ],
      },
      {
        $or: [
          {
            usageLimit: null,
          },
          {
            usageLimit: {
              $exists: false,
            },
          },
          {
            $expr: {
              $lt: [
                "$usageCount",
                "$usageLimit",
              ],
            },
          },
        ],
      },
    ],
  };

  const offer =
    await OfferModel.findOneAndUpdate(
      query,
      {
        $inc: {
          usageCount: 1,
        },
      },
      {
        new: true,
      },
    );

  if (!offer) {
    throw new Error(
      "تعذر استخدام العرض؛ ربما انتهى حد الاستخدام.",
    );
  }

  return offer;
}
