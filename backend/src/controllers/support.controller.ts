import { Request, Response } from "../http/express-compat.js";
import SupportSettings from "../models/SupportSettings.js";

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  ];
}

export async function getSupport(
  _req: Request,
  res: Response,
) {
  let settings =
    await SupportSettings.findOne().lean();

  if (!settings) {
    settings = await SupportSettings.create({
      phoneNumbers: [],
      whatsapp: [],
      telegram: [],
      enabled: true,
    });
  }

  return res.json({
    success: true,
    data: {
      phoneNumbers:
        settings.phoneNumbers ?? [],
      whatsapp:
        settings.whatsapp ?? [],
    },
  });
}

export async function updateSupport(
  req: Request,
  res: Response,
) {
  const current =
    await SupportSettings.findOne().lean();

  const phoneNumbers =
    req.body?.phoneNumbers !== undefined
      ? cleanList(req.body.phoneNumbers)
      : current?.phoneNumbers ?? [];

  const whatsapp =
    req.body?.whatsapp !== undefined
      ? cleanList(req.body.whatsapp)
      : current?.whatsapp ?? [];

  const settings =
    await SupportSettings.findOneAndUpdate(
      {},
      {
        $set: {
          phoneNumbers,
          whatsapp,
          enabled: true,
        },
      },
      {
        new: true,
        upsert: true,
      },
    ).lean();

  return res.json({
    success: true,
    data: {
      phoneNumbers:
        settings?.phoneNumbers ?? [],
      whatsapp:
        settings?.whatsapp ?? [],
    },
  });
}
