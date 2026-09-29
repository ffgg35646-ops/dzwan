
import { Request, Response } from "express";
import DeliveryPriceOverride from "../models/DeliveryPriceOverride.js";

export async function listPriceOverrides(
  req: Request,
  res: Response,
) {
  const items = await DeliveryPriceOverride.find()
    .sort({ priority: -1, createdAt: -1 })
    .lean();

  return res.json({
    success: true,
    data: items,
  });
}

export async function createPriceOverride(
  req: Request,
  res: Response,
) {
  const item = await DeliveryPriceOverride.create({
    ...req.body,
  });

  return res.status(201).json({
    success: true,
    data: item,
  });
}

export async function updatePriceOverride(
  req: Request,
  res: Response,
) {
  const item =
    await DeliveryPriceOverride.findByIdAndUpdate(
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
      message: "قاعدة السعر غير موجودة.",
    });
  }

  return res.json({
    success: true,
    data: item,
  });
}

export async function deletePriceOverride(
  req: Request,
  res: Response,
) {
  const item =
    await DeliveryPriceOverride.findByIdAndDelete(
      req.params.id,
    );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: "قاعدة السعر غير موجودة.",
    });
  }

  return res.json({
    success: true,
  });
}
