
import { Request, Response } from "express";
import Offer from "../models/Offer.js";

export async function listOffers(
  req: Request,
  res: Response,
) {
  const now = new Date();

  const items =
    await Offer.find({
      isActive: true,
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    data: items,
  });
}

export async function listAllOffers(
  req: Request,
  res: Response,
) {
  const items =
    await Offer.find()
      .sort({ createdAt: -1 })
      .lean();

  return res.json({
    success: true,
    data: items,
  });
}

export async function createOffer(
  req: Request,
  res: Response,
) {
  const item = await Offer.create(req.body);

  return res.status(201).json({
    success: true,
    data: item,
  });
}

export async function updateOffer(
  req: Request,
  res: Response,
) {
  const item =
    await Offer.findByIdAndUpdate(
      req.params.id,
      {
        $set: req.body,
      },
      {
        new: true,
      },
    );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "العرض غير موجود.",
    });
  }

  return res.json({
    success: true,
    data: item,
  });
}

export async function deleteOffer(
  req: Request,
  res: Response,
) {
  await Offer.findByIdAndDelete(
    req.params.id,
  );

  return res.json({
    success: true,
  });
}
