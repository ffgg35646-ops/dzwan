
import { Request, Response } from "express";
import AppVersion from "../models/AppVersion.js";

export async function getAppUpdateInfo(
  req: Request,
  res: Response,
) {
  const app = String(
    req.query.app ?? "captain",
  );

  const item =
    await AppVersion.findOne({
      app,
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!item) {
    return res.json({
      success: true,
      data: {
        app,
        version: "1.0.0",
        minimumVersion: "1.0.0",
        forceUpdate: false,
        downloadUrl: null,
      },
    });
  }

  return res.json({
    success: true,
    data: item,
  });
}
