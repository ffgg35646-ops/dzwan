import type { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { ScopedRequest } from "../middleware/scope.middleware.js";
import { UserModel } from "../models/User.js";
import { LocationModel } from "../models/Location.js";

const createLeaderSchema = z.object({
  role: z.enum(["governorate_leader", "area_leader"]),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().optional(),
  governorateId: z.string().trim().min(1),
  areaId: z.string().trim().min(1).optional(),
});

const updateLeaderSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().optional(),
  status: z
    .enum([
      "pending",
      "active",
      "rejected",
      "suspended",
      "inactive",
    ])
    .optional(),
  governorateId: z.string().trim().min(1).optional(),
  areaId: z.string().trim().min(1).nullable().optional(),
});

type LeaderRole =
  | "governorate_leader"
  | "area_leader";

function getScopedRequest(
  req: AuthenticatedRequest,
): ScopedRequest {
  return req as ScopedRequest;
}

function isFullAdmin(req: ScopedRequest): boolean {
  return (
    req.scopedUser?.role === "admin" ||
    req.scopedUser?.role === "super_admin"
  );
}

function isLeader(req: ScopedRequest): boolean {
  return (
    req.scopedUser?.role ===
      "governorate_leader" ||
    req.scopedUser?.role === "area_leader"
  );
}

function validObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function normalizeId(
  value: Types.ObjectId | string | null | undefined,
): string | null {
  if (!value) return null;
  return value.toString();
}

async function validateAssignment(
  role: LeaderRole,
  governorateId: string,
  areaId?: string | null,
) {
  if (!validObjectId(governorateId)) {
    return {
      ok: false as const,
      message: "معرف المحافظة غير صحيح.",
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

  if (role === "governorate_leader") {
    if (areaId) {
      return {
        ok: false as const,
        message:
          "قائد المحافظة لا يمكن ربطه بمنطقة.",
      };
    }

    return {
      ok: true as const,
      location,
    };
  }

  if (!areaId) {
    return {
      ok: false as const,
      message:
        "قائد المنطقة يجب أن يكون مرتبطًا بمنطقة.",
    };
  }

  if (!validObjectId(areaId)) {
    return {
      ok: false as const,
      message: "معرف المنطقة غير صحيح.",
    };
  }

  const area = location.areas.find(
    (item) => item._id.toString() === areaId,
  );

  if (!area) {
    return {
      ok: false as const,
      message:
        "المنطقة غير موجودة داخل المحافظة.",
    };
  }

  if (!area.isActive) {
    return {
      ok: false as const,
      message: "المنطقة غير مفعلة.",
    };
  }

  return {
    ok: true as const,
    location,
    area,
  };
}

function leaderMatchesScope(
  req: ScopedRequest,
  leader: {
    _id: Types.ObjectId;
    role: string;
    governorateId?: Types.ObjectId | null;
    areaId?: Types.ObjectId | null;
  },
): boolean {
  const scope = req.scopedUser;

  if (!scope) return false;

  if (
    scope.role === "admin" ||
    scope.role === "super_admin"
  ) {
    return true;
  }

  const targetId = leader._id.toString();

  if (scope.role === "area_leader") {
    return targetId === scope.id;
  }

  if (scope.role === "governorate_leader") {
    const targetGovernorateId =
      normalizeId(leader.governorateId);

    if (
      !scope.governorateId ||
      targetGovernorateId !==
        scope.governorateId
    ) {
      return false;
    }

    return leader.role === "area_leader";
  }

  return false;
}

export async function listLeaders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    const scope = scopedReq.scopedUser;

    if (!scope) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const filter: Record<string, unknown> = {
      role: {
        $in: [
          "governorate_leader",
          "area_leader",
        ],
      },
    };

    if (
      scope.role === "governorate_leader"
    ) {
      filter.role = "area_leader";
      filter.governorateId =
        new Types.ObjectId(
          scope.governorateId!,
        );
    }

    if (scope.role === "area_leader") {
      filter._id =
        new Types.ObjectId(scope.id);
    }

    const leaders = await UserModel.find(filter)
      .select(
        "_id fullName email phone role status governorateId areaId avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason createdAt updatedAt",
      )
      .populate(
        "governorateId",
        "_id name",
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    res.status(200).json({
      success: true,
      leaders,
    });
  } catch (error) {
    console.error(
      "List leaders error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل القادة.",
    });
  }
}

export async function getLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    const id = String(
      scopedReq.params.id,
    );

    if (!validObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "معرف القائد غير صحيح.",
      });
      return;
    }

    const leader = await UserModel.findOne({
      _id: id,
      role: {
        $in: [
          "governorate_leader",
          "area_leader",
        ],
      },
    })
      .select(
        "_id fullName email phone role status governorateId areaId avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason createdAt updatedAt",
      )
      .populate(
        "governorateId",
        "_id name",
      )
      .lean();

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    if (
      !leaderMatchesScope(
        scopedReq,
        leader,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك الوصول إلى قائد خارج نطاقك.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      leader,
    });
  } catch (error) {
    console.error(
      "Get leader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل بيانات القائد.",
    });
  }
}

export async function createLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    if (!isFullAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message:
          "إنشاء القادة متاح للأدمن فقط.",
      });
      return;
    }

    const data =
      createLeaderSchema.parse(
        scopedReq.body,
      );

    const assignment =
      await validateAssignment(
        data.role,
        data.governorateId,
        data.areaId,
      );

    if (!assignment.ok) {
      res.status(400).json({
        success: false,
        message: assignment.message,
      });
      return;
    }

    if (
      await UserModel.exists({
        phone: data.phone,
      })
    ) {
      res.status(409).json({
        success: false,
        message:
          "رقم الهاتف مستخدم بالفعل.",
      });
      return;
    }

    if (data.email) {
      const email =
        data.email.toLowerCase();

      if (
        await UserModel.exists({
          email,
        })
      ) {
        res.status(409).json({
          success: false,
          message:
            "البريد الإلكتروني مستخدم بالفعل.",
        });
        return;
      }
    }

    if (
      data.role ===
      "governorate_leader"
    ) {
      const existing =
        await UserModel.exists({
          role:
            "governorate_leader",
          governorateId:
            new Types.ObjectId(
              data.governorateId,
            ),
        });

      if (existing) {
        res.status(409).json({
          success: false,
          message:
            "يوجد بالفعل قائد لهذه المحافظة.",
        });
        return;
      }
    }

    if (
      data.role === "area_leader" &&
      data.areaId
    ) {
      const existing =
        await UserModel.exists({
          role: "area_leader",
          governorateId:
            new Types.ObjectId(
              data.governorateId,
            ),
          areaId:
            new Types.ObjectId(
              data.areaId,
            ),
        });

      if (existing) {
        res.status(409).json({
          success: false,
          message:
            "يوجد بالفعل قائد لهذه المنطقة.",
        });
        return;
      }
    }

    const leader =
      new UserModel({
        role: data.role,
        status: "pending",
        fullName: data.fullName,
        phone: data.phone,
        email: data.email
          ?.toLowerCase(),
        passwordHash:
          "TEMP_PASSWORD_HASH",
        avatarUrl: null,
        isOnline: false,
        governorateId:
          new Types.ObjectId(
            data.governorateId,
          ),
        areaId:
          data.role === "area_leader" &&
          data.areaId
            ? new Types.ObjectId(
                data.areaId,
              )
            : null,
      });

    await leader.save();

    res.status(201).json({
      success: true,
      message:
        "تم إنشاء القائد بنجاح.",
      leader: {
        _id: leader._id,
        fullName: leader.fullName,
        phone: leader.phone,
        email:
          leader.email ?? null,
        role: leader.role,
        status: leader.status,
        governorateId:
          leader.governorateId,
        areaId:
          leader.areaId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات القائد غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Create leader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء إنشاء القائد.",
    });
  }
}

export async function updateLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    const id = String(
      scopedReq.params.id,
    );

    if (!validObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "معرف القائد غير صحيح.",
      });
      return;
    }

    const data =
      updateLeaderSchema.parse(
        scopedReq.body,
      );

    const leader =
      await UserModel.findOne({
        _id: id,
        role: {
          $in: [
            "governorate_leader",
            "area_leader",
          ],
        },
      });

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    if (
      !leaderMatchesScope(
        scopedReq,
        leader,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تعديل قائد خارج نطاقك.",
      });
      return;
    }

    if (
      leader.role === "governorate_leader" &&
      !isFullAdmin(scopedReq)
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تعديل قائد المحافظة.",
      });
      return;
    }

    const governorateId =
      data.governorateId ??
      leader.governorateId?.toString();

    if (!governorateId) {
      res.status(400).json({
        success: false,
        message:
          "القائد غير مرتبط بمحافظة.",
      });
      return;
    }

    const areaId =
      data.areaId !== undefined
        ? data.areaId
        : leader.areaId?.toString() ??
          null;

    if (
      !isFullAdmin(scopedReq) &&
      leader.role === "area_leader"
    ) {
      if (
        scopedReq.scopedUser
          ?.role === "governorate_leader"
      ) {
        if (
          scopedReq.scopedUser
            .governorateId !==
          governorateId
        ) {
          res.status(403).json({
            success: false,
            message:
              "لا يمكنك نقل قائد خارج محافظتك.",
          });
          return;
        }
      }

      if (
        scopedReq.scopedUser
          ?.role === "area_leader"
      ) {
        res.status(403).json({
          success: false,
          message:
            "قائد المنطقة لا يمكنه تعديل القادة.",
        });
        return;
      }
    }

    const assignment =
      await validateAssignment(
        leader.role as LeaderRole,
        governorateId,
        areaId,
      );

    if (!assignment.ok) {
      res.status(400).json({
        success: false,
        message: assignment.message,
      });
      return;
    }

    if (data.fullName !== undefined) {
      leader.fullName =
        data.fullName;
    }

    if (data.phone !== undefined) {
      leader.phone = data.phone;
    }

    if (data.email !== undefined) {
      leader.email =
        data.email.toLowerCase();
    }

    if (data.status !== undefined) {
      leader.status = data.status;
    }

    leader.governorateId =
      new Types.ObjectId(
        governorateId,
      );

    leader.areaId =
      leader.role === "area_leader" &&
      areaId
        ? new Types.ObjectId(areaId)
        : null;

    await leader.save();

    res.status(200).json({
      success: true,
      message:
        "تم تحديث بيانات القائد بنجاح.",
      leader,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات القائد غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Update leader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحديث القائد.",
    });
  }
}

export async function approveLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    const id = String(
      scopedReq.params.id,
    );

    const leader =
      await UserModel.findOne({
        _id: id,
        role: {
          $in: [
            "governorate_leader",
            "area_leader",
          ],
        },
      });

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    if (
      !leaderMatchesScope(
        scopedReq,
        leader,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك قبول قائد خارج نطاقك.",
      });
      return;
    }

    if (
      leader.role ===
        "governorate_leader" &&
      !isFullAdmin(scopedReq)
    ) {
      res.status(403).json({
        success: false,
        message:
          "قبول قائد المحافظة متاح للأدمن فقط.",
      });
      return;
    }

    leader.status = "active";
    leader.approvedAt =
      new Date();

    if (
      scopedReq.user?.sub &&
      Types.ObjectId.isValid(
        scopedReq.user.sub,
      )
    ) {
      leader.approvedBy =
        new Types.ObjectId(
          scopedReq.user.sub,
        );
    }

    leader.rejectionReason = null;

    await leader.save();

    res.status(200).json({
      success: true,
      message:
        "تم قبول القائد وتفعيله.",
      leader,
    });
  } catch (error) {
    console.error(
      "Approve leader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء قبول القائد.",
    });
  }
}

export async function rejectLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    const id = String(
      scopedReq.params.id,
    );

    const leader =
      await UserModel.findOne({
        _id: id,
        role: {
          $in: [
            "governorate_leader",
            "area_leader",
          ],
        },
      });

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    if (
      !leaderMatchesScope(
        scopedReq,
        leader,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك رفض قائد خارج نطاقك.",
      });
      return;
    }

    if (
      leader.role ===
        "governorate_leader" &&
      !isFullAdmin(scopedReq)
    ) {
      res.status(403).json({
        success: false,
        message:
          "رفض قائد المحافظة متاح للأدمن فقط.",
      });
      return;
    }

    const reason =
      typeof scopedReq.body?.reason ===
      "string"
        ? scopedReq.body.reason.trim()
        : "";

    leader.status = "rejected";
    leader.rejectionReason =
      reason || null;

    await leader.save();

    res.status(200).json({
      success: true,
      message: "تم رفض القائد.",
      leader,
    });
  } catch (error) {
    console.error(
      "Reject leader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء رفض القائد.",
    });
  }
}

export async function deleteLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const scopedReq = getScopedRequest(req);

  try {
    const id = String(
      scopedReq.params.id,
    );

    const leader =
      await UserModel.findOne({
        _id: id,
        role: {
          $in: [
            "governorate_leader",
            "area_leader",
          ],
        },
      });

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    if (
      !leaderMatchesScope(
        scopedReq,
        leader,
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك حذف قائد خارج نطاقك.",
      });
      return;
    }

    if (
      leader.role ===
        "governorate_leader" &&
      !isFullAdmin(scopedReq)
    ) {
      res.status(403).json({
        success: false,
        message:
          "حذف قائد المحافظة متاح للأدمن فقط.",
      });
      return;
    }

    if (
      leader.role === "area_leader" &&
      scopedReq.scopedUser
        ?.role === "area_leader"
    ) {
      res.status(403).json({
        success: false,
        message:
          "قائد المنطقة لا يمكنه حذف القادة.",
      });
      return;
    }

    await UserModel.findByIdAndDelete(
      id,
    );

    res.status(200).json({
      success: true,
      message:
        "تم حذف القائد بنجاح.",
    });
  } catch (error) {
    console.error(
      "Delete leader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء حذف القائد.",
    });
  }
}
