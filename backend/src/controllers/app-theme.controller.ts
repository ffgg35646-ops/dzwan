
import { Request, Response } from "../http/express-compat.js";
import AppTheme from "../models/AppTheme.js";
import { APP_THEMES } from "../config/appThemes.js";

export async function getAvailableThemes(
  req: Request,
  res: Response,
) {
  return res.json({
    success: true,
    data: Object.values(APP_THEMES),
  });
}

export async function getActiveTheme(
  req: Request,
  res: Response,
) {
  let settings =
    await AppTheme.findOne().lean();

  if (!settings) {
    settings = await AppTheme.create({
      activeTheme: "classic-orange",
    });
  }

  const theme =
    APP_THEMES[
      settings.activeTheme as keyof typeof APP_THEMES
    ];

  return res.json({
    success: true,
    data: theme,
  });
}

export async function updateActiveTheme(
  req: Request,
  res: Response,
) {
  const activeTheme =
    String(req.body?.activeTheme ?? "");

  if (
    !Object.prototype.hasOwnProperty.call(
      APP_THEMES,
      activeTheme,
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "الستايل المحدد غير موجود.",
    });
  }

  const settings =
    await AppTheme.findOneAndUpdate(
      {},
      {
        $set: {
          activeTheme,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

  const theme =
    APP_THEMES[
      settings.activeTheme as keyof typeof APP_THEMES
    ];

  return res.json({
    success: true,
    data: theme,
  });
}
