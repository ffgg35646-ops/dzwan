import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getDefaultCoverage,
  saveDefaultCoverage,
  applyDefaultCoverage,
  addCaptainArea,
  getCaptainAreas,
  removeCaptainArea,
} from "../services/captain-coverage.service.js";
import { UserModel } from "../models/User.js";

export async function defaultCoverage(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.method === "GET") {
      return res.json({ rows: await getDefaultCoverage() });
    }

    await saveDefaultCoverage(
      String(req.body.sourceGovernorateId),
      String(req.body.sourceAreaId),
      Array.isArray(req.body.targets) ? req.body.targets : [],
    );

    return res.json({ message: "تم حفظ التغطية الافتراضية." });
  } catch (e: any) {
    return res.status(400).json({
      message: e?.message || "تعذر حفظ التغطية.",
    });
  }
}

export async function captainSearch(
  req: AuthenticatedRequest,
  res: Response,
) {
  const q = String(req.query.q || "").trim();

  const rows = await UserModel.find({
    role: "captain",
    ...(q
      ? {
          $or: [
            { fullName: new RegExp(q, "i") },
            { email: new RegExp(q, "i") },
            ...(TypesObjectId(q)
              ? [{ _id: q }]
              : []),
          ],
        }
      : {}),
  })
    .select("_id fullName email phone governorateId areaId status")
    .limit(20)
    .lean();

  return res.json({ captains: rows });
}

function TypesObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

export async function captainCoverage(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = String(req.params.captainId);

  const captain = await UserModel.findById(captainId)
    .select("_id fullName email governorateId areaId status")
    .lean();

  if (!captain) {
    return res.status(404).json({
      message: "الكابتن غير موجود.",
    });
  }

  return res.json({
    captain,
    workAreas: await getCaptainAreas(captainId),
  });
}

export async function addArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const row = await addCaptainArea(
      String(req.params.captainId),
      String(req.body.governorateId),
      String(req.body.areaId),
    );

    return res.json({
      message: "تم تفعيل المنطقة للكابتن.",
      workArea: row,
    });
  } catch (e: any) {
    return res.status(400).json({
      message: e?.message || "تعذر إضافة المنطقة.",
    });
  }
}

export async function removeArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  await removeCaptainArea(
    String(req.params.captainId),
    String(req.params.workAreaId),
  );

  return res.json({
    message: "تم حذف منطقة العمل.",
  });
}

export async function applyDefault(
  req: AuthenticatedRequest,
  res: Response,
) {
  await applyDefaultCoverage(
    String(req.params.captainId),
  );

  return res.json({
    message: "تم تطبيق التغطية الافتراضية.",
  });
}
