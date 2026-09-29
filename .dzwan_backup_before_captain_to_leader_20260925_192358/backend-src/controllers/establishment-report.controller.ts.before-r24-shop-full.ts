import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { getEstablishmentReport } from "../services/establishment-report.service.js";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function getEstablishmentReportController(
  req: Request,
  res: Response,
) {
  const establishmentId = String(req.params.establishmentId);

  if (!Types.ObjectId.isValid(establishmentId)) {
    return res.status(400).json({
      message: "معرف المنشأة غير صحيح.",
    });
  }

  const parsed = querySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      message: "بيانات الفترة غير صحيحة.",
      errors: parsed.error.flatten(),
    });
  }

  const now = new Date();

  const periodTo = parsed.data.to
    ? new Date(parsed.data.to)
    : now;

  const periodFrom = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(
        periodTo.getTime() -
          30 * 24 * 60 * 60 * 1000,
      );

  if (periodFrom > periodTo) {
    return res.status(400).json({
      message: "تاريخ البداية يجب أن يسبق تاريخ النهاية.",
    });
  }

  try {
    const report = await getEstablishmentReport(
      new Types.ObjectId(establishmentId),
      periodFrom,
      periodTo,
    );

    return res.json(report);
  } catch (error) {
    return res.status(404).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر تحميل تقرير المنشأة.",
    });
  }
}
