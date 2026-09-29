import type { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { ScopedRequest } from "../middleware/scope.middleware.js";
import { LocationModel } from "../models/Location.js";
import { UserModel } from "../models/User.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { createAuditLog } from "../services/audit-log.service.js";

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  type: z.enum(["restaurant", "shop"]),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().optional().nullable(),
  address: z.string().trim().min(2).max(300),
  governorateId: z.string().trim().min(1),
  areaId: z.string().trim().min(1),
  ownerUserId: z.string().trim().min(1).optional().nullable(),
  captainId: z.string().trim().min(1).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

const updateSchema = createSchema.partial().extend({
  status: z
    .enum([
      "pending",
      "active",
      "rejected",
      "suspended",
      "inactive",
    ])
    .optional(),
  rejectionReason: z.string().trim().max(500).optional().nullable(),
  suspensionReason: z.string().trim().max(500).optional().nullable(),
});

function isObjectId(value?: string | null): boolean {
  return !!value && Types.ObjectId.isValid(value);
}

async function shopOwnsEstablishment(
  req: ScopedRequest,
  establishmentId: string,
): Promise<boolean> {
  const scope = req.scopedUser;

  if (!scope || scope.role !== "shop") {
    return false;
  }

  if (!Types.ObjectId.isValid(establishmentId)) {
    return false;
  }

  const owned = await EstablishmentModel.exists({
    _id: new Types.ObjectId(establishmentId),
    ownerUserId: new Types.ObjectId(scope.id),
  });

  return !!owned;
}

function scopeAllows(
  req: ScopedRequest,
  governorateId: string | null,
  areaId: string | null,
): boolean {
  const scope = req.scopedUser;

  if (!scope) return false;

  if (scope.role === "super_admin") {
    return true;
  }

  if (scope.role === "admin") {
    if (
      scope.permissionGovernorateIds.length === 0 &&
      scope.permissionAreaIds.length === 0
    ) {
      return false;
    }

    if (
      governorateId &&
      scope.permissionGovernorateIds.length > 0 &&
      !scope.permissionGovernorateIds.includes(
        governorateId,
      )
    ) {
      return false;
    }

    if (
      areaId &&
      scope.permissionAreaIds.length > 0 &&
      !scope.permissionAreaIds.includes(areaId)
    ) {
      return false;
    }

    return true;
  }

  if (scope.role === "governorate_leader") {
    return (
      !!scope.governorateId &&
      !!governorateId &&
      scope.governorateId === governorateId
    );
  }

  if (scope.role === "area_leader") {
    return (
      !!scope.governorateId &&
      !!scope.areaId &&
      !!governorateId &&
      !!areaId &&
      scope.governorateId === governorateId &&
      scope.areaId === areaId
    );
  }

  return false;
}

async function validateLocation(
  governorateId: string,
  areaId: string,
  forEstablishment = false,
) {
  if (!isObjectId(governorateId)) {
    return {
      ok: false as const,
      message: "معرف المحافظة غير صحيح.",
    };
  }

  if (!isObjectId(areaId)) {
    return {
      ok: false as const,
      message: "معرف المنطقة غير صحيح.",
    };
  }

  const location = await LocationModel.findById(
    governorateId,
  );

  if (!location) {
    return {
      ok: false as const,
      message: "المحافظة غير موجودة.",
    };
  }

  if (!location.isActive) {
    return {
      ok: false as const,
      message: "المحافظة غير مفعلة.",
    };
  }

  if (
    forEstablishment &&
    location.establishmentsEnabled === false
  ) {
    return {
      ok: false as const,
      message:
        "تسجيل المطاعم والمحلات متوقف حاليًا في هذه المحافظة.",
    };
  }

  const area = location.areas.find(
    (item) => item._id.toString() === areaId,
  );

  if (!area) {
    return {
      ok: false as const,
      message: "المنطقة غير موجودة داخل المحافظة.",
    };
  }

  if (!area.isActive) {
    return {
      ok: false as const,
      message: "المنطقة غير مفعلة.",
    };
  }

  if (
    forEstablishment &&
    area.establishmentsEnabled === false
  ) {
    return {
      ok: false as const,
      message:
        "تسجيل المطاعم والمحلات متوقف حاليًا في هذه المنطقة.",
    };
  }

  return {
    ok: true as const,
    location,
    area,
  };
}

async function validateCaptain(
  captainId?: string | null,
  governorateId?: string,
  areaId?: string,
) {
  if (!captainId) {
    return {
      ok: true as const,
      captain: null,
    };
  }

  if (!isObjectId(captainId)) {
    return {
      ok: false as const,
      message: "معرف الكابتن غير صحيح.",
    };
  }

  const captain = await UserModel.findOne({
    _id: captainId,
    role: "captain",
  })
    .select(
      "_id role status governorateId areaId",
    )
    .lean();

  if (!captain) {
    return {
      ok: false as const,
      message: "الكابتن غير موجود.",
    };
  }

  if (captain.status !== "active") {
    return {
      ok: false as const,
      message: "لا يمكن تعيين كابتن غير مفعل.",
    };
  }

  if (
    governorateId &&
    captain.governorateId?.toString() !==
      governorateId
  ) {
    return {
      ok: false as const,
      message:
        "الكابتن لا يتبع المحافظة المحددة.",
    };
  }

  if (
    areaId &&
    captain.areaId?.toString() !== areaId
  ) {
    return {
      ok: false as const,
      message:
        "الكابتن لا يتبع المنطقة المحددة.",
    };
  }

  return {
    ok: true as const,
    captain,
  };
}

export async function listEstablishments(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const filter: Record<string, unknown> = {};

    const type =
      scopedReq.query.type === "restaurant" ||
      scopedReq.query.type === "shop"
        ? scopedReq.query.type
        : undefined;

    if (type) {
      filter.type = type;
    }

    const scope = scopedReq.scopedUser;

    if (
      scope?.role ===
        "governorate_leader" &&
      scope.governorateId
    ) {
      filter.governorateId =
        new Types.ObjectId(
          scope.governorateId,
        );
    }

    if (
      scope?.role === "area_leader" &&
      scope.governorateId &&
      scope.areaId
    ) {
      filter.governorateId =
        new Types.ObjectId(
          scope.governorateId,
        );
      filter.areaId =
        new Types.ObjectId(
          scope.areaId,
        );
    }

    const establishments =
      await EstablishmentModel.find(filter)
        .populate({
          path: "ownerUserId",
          select:
            "_id fullName phone email role status",
        })
        .populate({
          path: "captainId",
          select:
            "_id fullName phone status governorateId areaId",
        })
        .populate({
          path: "governorateId",
          select: "_id name",
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    res.status(200).json({
      success: true,
      establishments,
      total: establishments.length,
    });
  } catch (error) {
    console.error(
      "List establishments error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل المطاعم والمحلات.",
    });
  }
}

export async function getEstablishment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const establishmentId =
      String(scopedReq.params.id || "").trim();

    if (!Types.ObjectId.isValid(establishmentId)) {
      res.status(400).json({
        success: false,
        message: "معرّف المنشأة غير صالح.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        establishmentId,
      )
        .populate({
          path: "ownerUserId",
          select:
            "_id fullName phone email role status",
        })
        .populate({
          path: "captainId",
          select:
            "_id fullName phone status governorateId areaId",
        })
        .populate({
          path: "governorateId",
          select: "_id name",
        })
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المطعم أو المحل غير موجود.",
      });
      return;
    }

    const allowed = scopeAllows(
      scopedReq,
      establishment.governorateId
        ? establishment.governorateId._id.toString()
        : null,
      establishment.areaId?.toString() ??
        null,
    );

    const ownerAllowed =
      await shopOwnsEstablishment(
        scopedReq,
        String(establishment._id),
      );

    if (!allowed && !ownerAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك الوصول إلى منشأة خارج نطاقك.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      establishment,
    });
  } catch (error) {
    console.error(
      "Get establishment error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل بيانات المنشأة.",
    });
  }
}

export async function createEstablishment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    if (
      scopedReq.scopedUser?.role !==
        "admin" &&
      scopedReq.scopedUser?.role !==
        "super_admin" &&
      scopedReq.scopedUser?.role !==
        "governorate_leader" &&
      scopedReq.scopedUser?.role !==
        "area_leader"
    ) {
      res.status(403).json({
        success: false,
        message:
          "ليس لديك صلاحية إنشاء منشأة.",
      });
      return;
    }

    const data =
      createSchema.parse(
        scopedReq.body,
      );

    const location =
      await validateLocation(
        data.governorateId,
        data.areaId,
        true,
      );

    if (!location.ok) {
      res.status(400).json({
        success: false,
        message: location.message,
      });
      return;
    }

    if (
      !scopeAllows(
        scopedReq,
        data.governorateId,
        data.areaId,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك إنشاء منشأة خارج نطاقك.",
      });
      return;
    }

    const captain =
      await validateCaptain(
        data.captainId,
        data.governorateId,
        data.areaId,
      );

    if (!captain.ok) {
      res.status(400).json({
        success: false,
        message: captain.message,
      });
      return;
    }

    const establishment =
      await EstablishmentModel.create({
        name: data.name,
        type: data.type,
        status: "pending",
        phone: data.phone,
        email:
          data.email?.toLowerCase() ??
          null,
        address: data.address,
        governorateId:
          new Types.ObjectId(
            data.governorateId,
          ),
        areaId:
          new Types.ObjectId(
            data.areaId,
          ),
        ownerUserId:
          data.ownerUserId &&
          isObjectId(
            data.ownerUserId,
          )
            ? new Types.ObjectId(
                data.ownerUserId,
              )
            : null,
        captainId:
          data.captainId &&
          isObjectId(data.captainId)
            ? new Types.ObjectId(
                data.captainId,
              )
            : null,
        description:
          data.description ??
          null,
        logoUrl:
          data.logoUrl ?? null,
        latitude:
          data.latitude ?? null,
        longitude:
          data.longitude ?? null,
      });

    await createAuditLog({
      actorId:
        Types.ObjectId.isValid(String(scopedReq.user?.sub ?? ""))
          ? new Types.ObjectId(String(scopedReq.user?.sub))
          : null,
      actorRole: scopedReq.scopedUser?.role ?? null,
      action: "establishment.create",
      entityType: "Establishment",
      entityId: establishment._id,
      before: null,
      after: establishment.toObject() as unknown as Record<string, unknown>,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      description:
        `تم إنشاء المنشأة ${establishment.name}.`,
    });

    res.status(201).json({
      success: true,
      message:
        "تم إنشاء المطعم أو المحل بنجاح.",
      establishment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات المطعم أو المحل غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Create establishment error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء إنشاء المنشأة.",
    });
  }
}

export async function updateEstablishment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const data =
      updateSchema.parse(
        scopedReq.body,
      );

    const establishment =
      await EstablishmentModel.findById(
        scopedReq.params.id,
      );

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المطعم أو المحل غير موجود.",
      });
      return;
    }

    const managerAllowed =
      scopeAllows(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const ownerAllowed =
      await shopOwnsEstablishment(
        scopedReq,
        String(establishment._id),
      );

    if (!managerAllowed && !ownerAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تعديل منشأة خارج نطاقك.",
      });
      return;
    }

    const isShopOwner =
      ownerAllowed &&
      scopedReq.scopedUser?.role === "shop";

    if (
      isShopOwner &&
      (
        data.status !== undefined ||
        data.rejectionReason !== undefined ||
        data.suspensionReason !== undefined ||
        data.ownerUserId !== undefined ||
        data.captainId !== undefined ||
        data.governorateId !== undefined ||
        data.areaId !== undefined
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تعديل بيانات إدارية أو نقل المنشأة.",
      });
      return;
    }

    const governorateId =
      data.governorateId ??
      establishment.governorateId.toString();

    const areaId =
      data.areaId ??
      establishment.areaId.toString();

    const location =
      await validateLocation(
        governorateId,
        areaId,
      );

    if (!location.ok) {
      res.status(400).json({
        success: false,
        message: location.message,
      });
      return;
    }

    if (
      !scopeAllows(
        scopedReq,
        governorateId,
        areaId,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك نقل المنشأة خارج نطاقك.",
      });
      return;
    }

    const captain =
      await validateCaptain(
        data.captainId !== undefined
          ? data.captainId
          : establishment.captainId?.toString(),
        governorateId,
        areaId,
      );

    if (!captain.ok) {
      res.status(400).json({
        success: false,
        message: captain.message,
      });
      return;
    }

    if (data.name !== undefined) {
      establishment.name =
        data.name;
    }

    if (data.type !== undefined) {
      establishment.type =
        data.type;
    }

    if (data.status !== undefined) {
      establishment.status =
        data.status;
    }

    if (data.phone !== undefined) {
      establishment.phone =
        data.phone;
    }

    if (data.email !== undefined) {
      establishment.email =
        data.email
          ? data.email.toLowerCase()
          : null;
    }

    if (data.address !== undefined) {
      establishment.address =
        data.address;
    }

    if (
      data.ownerUserId !==
      undefined
    ) {
      establishment.ownerUserId =
        data.ownerUserId &&
        isObjectId(
          data.ownerUserId,
        )
          ? new Types.ObjectId(
              data.ownerUserId,
            )
          : null;
    }

    if (
      data.captainId !== undefined
    ) {
      establishment.captainId =
        data.captainId &&
        isObjectId(
          data.captainId,
        )
          ? new Types.ObjectId(
              data.captainId,
            )
          : null;
    }

    if (
      data.description !==
      undefined
    ) {
      establishment.description =
        data.description;
    }

    if (
      data.logoUrl !== undefined
    ) {
      establishment.logoUrl =
        data.logoUrl;
    }

    if (data.latitude !== undefined) {
      establishment.latitude =
        data.latitude;
    }

    if (data.longitude !== undefined) {
      establishment.longitude =
        data.longitude;
    }

    if (
      data.rejectionReason !==
      undefined
    ) {
      establishment.rejectionReason =
        data.rejectionReason;
    }

    if (
      data.suspensionReason !==
      undefined
    ) {
      establishment.suspensionReason =
        data.suspensionReason;
    }

    establishment.governorateId =
      new Types.ObjectId(
        governorateId,
      );

    establishment.areaId =
      new Types.ObjectId(areaId);

    const before = {
      name: establishment.name,
      type: establishment.type,
      status: establishment.status,
      phone: establishment.phone,
      email: establishment.email,
      address: establishment.address,
      governorateId:
        establishment.governorateId?.toString() ?? null,
      areaId:
        establishment.areaId?.toString() ?? null,
      ownerUserId:
        establishment.ownerUserId?.toString() ?? null,
      captainId:
        establishment.captainId?.toString() ?? null,
      rejectionReason:
        establishment.rejectionReason ?? null,
      suspensionReason:
        establishment.suspensionReason ?? null,
    };

    await establishment.save();

    await createAuditLog({
      actorId:
        Types.ObjectId.isValid(String(scopedReq.user?.sub ?? ""))
          ? new Types.ObjectId(String(scopedReq.user?.sub))
          : null,
      actorRole: scopedReq.scopedUser?.role ?? null,
      action: "establishment.update",
      entityType: "Establishment",
      entityId: establishment._id,
      before,
      after: {
        name: establishment.name,
        type: establishment.type,
        status: establishment.status,
        phone: establishment.phone,
        email: establishment.email,
        address: establishment.address,
        governorateId:
          establishment.governorateId?.toString() ?? null,
        areaId:
          establishment.areaId?.toString() ?? null,
        ownerUserId:
          establishment.ownerUserId?.toString() ?? null,
        captainId:
          establishment.captainId?.toString() ?? null,
        rejectionReason:
          establishment.rejectionReason ?? null,
        suspensionReason:
          establishment.suspensionReason ?? null,
      },
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      description:
        `تم تعديل المنشأة ${establishment.name}.`,
    });

    res.status(200).json({
      success: true,
      message:
        "تم تحديث بيانات المنشأة بنجاح.",
      establishment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "البيانات المرسلة غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Update establishment error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحديث المنشأة.",
    });
  }
}

export async function approveEstablishment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const establishment =
      await EstablishmentModel.findById(
        scopedReq.params.id,
      );

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المطعم أو المحل غير موجود.",
      });
      return;
    }

    if (
      !scopeAllows(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك قبول منشأة خارج نطاقك.",
      });
      return;
    }

    establishment.status = "active";
    establishment.approvedAt =
      new Date();

    if (
      scopedReq.user?.sub &&
      Types.ObjectId.isValid(
        scopedReq.user.sub,
      )
    ) {
      establishment.approvedBy =
        new Types.ObjectId(
          scopedReq.user.sub,
        );
    }

    establishment.rejectionReason =
      null;

    await establishment.save();

    await createAuditLog({
      actorId:
        Types.ObjectId.isValid(String(scopedReq.user?.sub ?? ""))
          ? new Types.ObjectId(String(scopedReq.user?.sub))
          : null,
      actorRole: scopedReq.scopedUser?.role ?? null,
      action: "establishment.approve",
      entityType: "Establishment",
      entityId: establishment._id,
      before: {
        status: "pending",
      },
      after: {
        status: "active",
        approvedAt: establishment.approvedAt ?? null,
        approvedBy:
          establishment.approvedBy?.toString() ?? null,
      },
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      description:
        `تمت الموافقة على المنشأة ${establishment.name}.`,
    });

    res.status(200).json({
      success: true,
      message:
        "تم قبول المنشأة وتفعيلها.",
      establishment,
    });
  } catch (error) {
    console.error(
      "Approve establishment error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء قبول المنشأة.",
    });
  }
}

export async function rejectEstablishment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const establishment =
      await EstablishmentModel.findById(
        scopedReq.params.id,
      );

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المطعم أو المحل غير موجود.",
      });
      return;
    }

    if (
      !scopeAllows(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك رفض منشأة خارج نطاقك.",
      });
      return;
    }

    const reason =
      typeof scopedReq.body?.reason ===
      "string"
        ? scopedReq.body.reason.trim()
        : "";

    establishment.status =
      "rejected";

    establishment.rejectionReason =
      reason || null;

    await establishment.save();

    await createAuditLog({
      actorId:
        Types.ObjectId.isValid(String(scopedReq.user?.sub ?? ""))
          ? new Types.ObjectId(String(scopedReq.user?.sub))
          : null,
      actorRole: scopedReq.scopedUser?.role ?? null,
      action: "establishment.reject",
      entityType: "Establishment",
      entityId: establishment._id,
      before: {
        status: "pending",
      },
      after: {
        status: "rejected",
        rejectionReason:
          establishment.rejectionReason ?? null,
      },
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      description:
        `تم رفض المنشأة ${establishment.name}.`,
    });

    res.status(200).json({
      success: true,
      message:
        "تم رفض المنشأة.",
      establishment,
    });
  } catch (error) {
    console.error(
      "Reject establishment error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء رفض المنشأة.",
    });
  }
}

export async function deleteEstablishment(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const establishment =
      await EstablishmentModel.findById(
        scopedReq.params.id,
      );

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المطعم أو المحل غير موجود.",
      });
      return;
    }

    if (
      !scopeAllows(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك حذف منشأة خارج نطاقك.",
      });
      return;
    }

    const before = establishment.toObject();

    await EstablishmentModel.findByIdAndDelete(
      scopedReq.params.id,
    );

    await createAuditLog({
      actorId:
        Types.ObjectId.isValid(String(scopedReq.user?.sub ?? ""))
          ? new Types.ObjectId(String(scopedReq.user?.sub))
          : null,
      actorRole: scopedReq.scopedUser?.role ?? null,
      action: "establishment.delete",
      entityType: "Establishment",
      entityId: establishment._id,
      before:
        before as unknown as Record<string, unknown>,
      after: null,
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      description:
        `تم حذف المنشأة ${establishment.name}.`,
    });

    res.status(200).json({
      success: true,
      message:
        "تم حذف المنشأة بنجاح.",
    });
  } catch (error) {
    console.error(
      "Delete establishment error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء حذف المنشأة.",
    });
  }
}
