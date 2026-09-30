
import { Request, Response } from "../http/express-compat.js";
import { randomBytes } from "node:crypto";
import Offer from "../models/Offer.js";


function generateOfferCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  while (code.length < length) {
    const bytes = randomBytes(length);
    for (const byte of bytes) {
      code += chars[byte % chars.length];
      if (code.length === length) {
        break;
      }
    }
  }

  return `DZWAN${code}`;
}


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
  const body = {
    ...(req.body ?? {}),
  };

  let item;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateOfferCode();

    const exists = await Offer.exists({ code });

    if (exists) {
      continue;
    }

    item = await Offer.create({
      ...body,
      code,
      usageCount: 0,
    });

    break;
  }

  if (!item) {
    return res.status(500).json({
      success: false,
      message: "تعذر إنشاء كود العرض.",
    });
  }

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
