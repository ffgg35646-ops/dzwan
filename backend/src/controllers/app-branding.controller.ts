
import { Request, Response } from "../http/express-compat.js";
import AppBranding from "../models/AppBranding.js";

export async function getAppBranding(
  req: Request,
  res: Response,
) {
  let branding =
    await AppBranding.findOne().lean();

  if (!branding) {
    branding =
      await AppBranding.create({});
  }

  return res.json({
    success: true,
    data: branding,
  });
}

export async function updateAppBranding(
  req: Request,
  res: Response,
) {
  const branding =
    await AppBranding.findOneAndUpdate(
      {},
      {
        $set: req.body,
      },
      {
        new: true,
        upsert: true,
      },
    );

  return res.json({
    success: true,
    data: branding,
  });
}
