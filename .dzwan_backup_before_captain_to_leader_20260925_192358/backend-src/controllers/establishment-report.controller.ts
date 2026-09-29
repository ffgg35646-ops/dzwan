import type { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { EstablishmentModel } from "../models/Establishment.js";
import { getEstablishmentReport } from "../services/establishment-report.service.js";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function getPeriod(query: Record<string, unknown>) {
  const parsed = querySchema.safeParse(query);

  if (!parsed.success) {
    return {
      error: "بيانات الفترة غير صحيحة.",
    };
  }

  const periodFrom = parsed.data.from
    ? new Date(parsed.data.from)
    : undefined;

  const periodTo = parsed.data.to
    ? new Date(parsed.data.to)
    : undefined;

  if (periodFrom && periodTo && periodFrom > periodTo) {
    return {
      error: "تاريخ البداية يجب أن يسبق تاريخ النهاية.",
    };
  }

  return {
    periodFrom,
    periodTo,
  };
}

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

  const period = getPeriod(req.query as Record<string, unknown>);

  if ("error" in period) {
    return res.status(400).json({
      message: period.error,
    });
  }

  try {
    const report = await getEstablishmentReport(
      new Types.ObjectId(establishmentId),
      period.periodFrom,
      period.periodTo,
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

export async function getMyEstablishmentReportController(
  req: Request,
  res: Response,
) {
  const ownerUserId = String(
    (req as any).user?.sub ?? "",
  ).trim();

  if (
    !ownerUserId ||
    !Types.ObjectId.isValid(ownerUserId)
  ) {
    return res.status(401).json({
      message: "جلسة المستخدم غير صالحة.",
    });
  }

  const period = getPeriod(req.query as Record<string, unknown>);

  if ("error" in period) {
    return res.status(400).json({
      message: period.error,
    });
  }

  const establishment =
    await EstablishmentModel.findOne({
      ownerUserId: new Types.ObjectId(ownerUserId),
    })
      .select("_id")
      .lean();

  if (!establishment) {
    return res.status(404).json({
      message: "لا توجد منشأة مرتبطة بهذا الحساب.",
    });
  }

  try {
    const report = await getEstablishmentReport(
      establishment._id,
      period.periodFrom,
      period.periodTo,
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
