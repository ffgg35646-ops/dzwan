import {
  Request,
  Response,
} from "express";
import RewardRule from "../models/RewardRule.js";

export async function listRewards(
  req: Request,
  res: Response,
) {
  const items =
    await RewardRule.find()
      .sort({
        createdAt: -1,
      })
      .lean();

  return res.json({
    success: true,
    data: items,
  });
}

export async function createReward(
  req: Request,
  res: Response,
) {
  const target =
    req.body?.target === "establishment"
      ? "establishment"
      : "captain";

  const recipientMode =
    req.body?.recipientMode === "selected"
      ? "selected"
      : "all";

  const captainIds =
    target === "captain" &&
    recipientMode === "selected" &&
    Array.isArray(
      req.body?.captainIds,
    )
      ? req.body.captainIds
      : [];

  const establishmentIds =
    target === "establishment" &&
    recipientMode === "selected" &&
    Array.isArray(
      req.body?.establishmentIds,
    )
      ? req.body.establishmentIds
      : [];

  if (
    recipientMode === "selected" &&
    target === "captain" &&
    captainIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "اختر كابتنًا واحدًا على الأقل.",
    });
  }

  if (
    recipientMode === "selected" &&
    target === "establishment" &&
    establishmentIds.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "اختر منشأة واحدة على الأقل.",
    });
  }

  if (!String(req.body?.name ?? "").trim()) {
    return res.status(400).json({
      success: false,
      message:
        "اسم المكافأة مطلوب.",
    });
  }

  const item =
    await RewardRule.create({
      ...req.body,

      target,
      recipientMode,

      captainIds,
      establishmentIds,
    });

  return res.status(201).json({
    success: true,
    data: item,
  });
}

export async function updateReward(
  req: Request,
  res: Response,
) {
  const body = {
    ...req.body,
  };

  if (
    body.target !== "captain" &&
    body.target !== "establishment"
  ) {
    delete body.target;
  }

  if (
    body.recipientMode === "selected"
  ) {
    if (
      body.target === "establishment"
    ) {
      body.establishmentIds =
        Array.isArray(
          body.establishmentIds,
        )
          ? body.establishmentIds
          : [];

      if (
        body.establishmentIds.length ===
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "اختر منشأة واحدة على الأقل.",
        });
      }
    } else {
      body.captainIds =
        Array.isArray(
          body.captainIds,
        )
          ? body.captainIds
          : [];

      if (
        body.captainIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "اختر كابتنًا واحدًا على الأقل.",
        });
      }
    }
  } else {
    body.captainIds = [];
    body.establishmentIds = [];
  }

  const item =
    await RewardRule.findByIdAndUpdate(
      req.params.id,
      {
        $set: body,
      },
      {
        new: true,
      },
    );

  if (!item) {
    return res.status(404).json({
      success: false,
      message:
        "المكافأة غير موجودة.",
    });
  }

  return res.json({
    success: true,
    data: item,
  });
}

export async function deleteReward(
  req: Request,
  res: Response,
) {
  await RewardRule.findByIdAndDelete(
    req.params.id,
  );

  return res.json({
    success: true,
  });
}

export async function listRewardRecordsController(
  req: Request,
  res: Response,
) {
  const {
    listRewardRecords,
  } = await import(
    "../services/reward.service.js"
  );

  const items =
    await listRewardRecords();

  return res.json({
    success: true,
    data: items,
  });
}

export async function updateRewardRecordStatusController(
  req: Request,
  res: Response,
) {
  const status =
    String(
      req.body?.status ?? "",
    );

  if (
    ![
      "pending",
      "approved",
      "paid",
      "cancelled",
    ].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "حالة المكافأة غير صحيحة.",
    });
  }

  const {
    updateRewardRecordStatus,
  } = await import(
    "../services/reward.service.js"
  );

  const item =
    await updateRewardRecordStatus(
      String(req.params.id),
      status as any,
    );

  if (!item) {
    return res.status(404).json({
      success: false,
      message:
        "سجل المكافأة غير موجود.",
    });
  }

  return res.json({
    success: true,
    data: item,
  });
}
