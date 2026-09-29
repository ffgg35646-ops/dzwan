import { Response } from "express";
import { Types } from "mongoose";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { resetCaptainStatement } from "../services/captain-statement-reset.service.js";

export async function resetCaptainStatements(
  req: AuthenticatedRequest,
  res: Response,
) {
  const rawIds = Array.isArray(req.body?.captainIds)
    ? req.body.captainIds
    : [];

  const uniqueIds = [
    ...new Set(
      rawIds
        .map((id: unknown) => String(id ?? "").trim())
        .filter((id: string) =>
          Types.ObjectId.isValid(id),
        ),
    ),
  ];

  if (uniqueIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "اختر كابتنًا واحدًا على الأقل.",
    });
  }

  const resetBy =
    req.user?.sub != null
      ? String(req.user.sub)
      : null;

  await Promise.all(
    uniqueIds.map((captainId) =>
      resetCaptainStatement(
        String(captainId),
        resetBy,
      ),
    ),
  );

  return res.json({
    success: true,
    count: uniqueIds.length,
    message:
      uniqueIds.length === 1
        ? "تم تصفير كشف الحساب."
        : `تم تصفير كشوفات ${uniqueIds.length} كباتن.`,
  });
}
