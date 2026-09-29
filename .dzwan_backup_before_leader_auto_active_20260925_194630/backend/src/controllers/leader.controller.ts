import type { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { ScopedRequest } from "../middleware/scope.middleware.js";

import { UserModel } from "../models/User.js";
import { LocationModel } from "../models/Location.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { OrderModel } from "../models/Order.js";
import { createPasswordHash } from "../services/auth.service.js";

const leaderRoles = [
  "governorate_leader",
  "area_leader",
] as const;

type LeaderRole = typeof leaderRoles[number];

const statuses = [
  "pending",
  "active",
  "rejected",
  "suspended",
  "inactive",
] as const;

function scoped(req: AuthenticatedRequest): ScopedRequest {
  return req as ScopedRequest;
}

function isAdmin(req: ScopedRequest) {
  return (
    req.scopedUser?.role === "admin" ||
    req.scopedUser?.role === "super_admin"
  );
}

function isLeader(req: ScopedRequest) {
  return (
    req.scopedUser?.role === "governorate_leader" ||
    req.scopedUser?.role === "area_leader"
  );
}

function validId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    Types.ObjectId.isValid(value)
  );
}

function idString(value: unknown): string | null {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value
  ) {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : null;
  }

  return String(value);
}

function leaderAreaIds(req: ScopedRequest): string[] {
  const ids = req.scopedUser?.areaIds ?? [];

  if (ids.length) {
    return ids;
  }

  const legacy = req.scopedUser?.areaId;
  return legacy ? [legacy] : [];
}

function buildGeoFilter(req: ScopedRequest) {
  const scope = req.scopedUser;

  if (!scope?.governorateId) {
    return null;
  }

  const filter: Record<string, unknown> = {
    governorateId: new Types.ObjectId(
      scope.governorateId,
    ),
  };

  if (scope.role === "area_leader") {
    const areas = leaderAreaIds(req)
      .filter(validId)
      .map((id) => new Types.ObjectId(id));

    if (!areas.length) {
      return {
        ...filter,
        areaId: {
          $in: [],
        },
      };
    }

    filter.areaId = {
      $in: areas,
    };
  }

  return filter;
}

async function validateAssignment(
  role: LeaderRole,
  governorateId: string,
  areaIds: string[],
) {
  if (!validId(governorateId)) {
    return {
      ok: false as const,
      message: "معرف المحافظة غير صحيح.",
    };
  }

  const location =
    await LocationModel.findById(governorateId);

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
    if (areaIds.length) {
      return {
        ok: false as const,
        message:
          "قائد المحافظة لا يحتاج إلى تحديد مناطق.",
      };
    }

    return {
      ok: true as const,
      location,
      areaIds: [] as string[],
    };
  }

  const uniqueAreaIds = [
    ...new Set(areaIds.map(String)),
  ];

  if (!uniqueAreaIds.length) {
    return {
      ok: false as const,
      message:
        "قائد المناطق يجب أن يكون مرتبطًا بمنطقة واحدة على الأقل.",
    };
  }

  for (const areaId of uniqueAreaIds) {
    if (!validId(areaId)) {
      return {
        ok: false as const,
        message: "أحد معرفات المناطق غير صحيح.",
      };
    }

    const area = location.areas.find(
      (item) => item._id.toString() === areaId,
    );

    if (!area) {
      return {
        ok: false as const,
        message:
          "إحدى المناطق غير موجودة داخل المحافظة.",
      };
    }

    if (!area.isActive) {
      return {
        ok: false as const,
        message:
          `المنطقة "${area.name}" غير مفعلة.`,
      };
    }
  }

  return {
    ok: true as const,
    location,
    areaIds: uniqueAreaIds,
  };
}

const createLeaderSchema = z.object({
  role: z.enum(leaderRoles),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().optional(),
  password: z.string().min(6).max(100),
  governorateId: z.string().trim().min(1),
  areaIds: z.array(z.string().trim()).default([]),
});

const updateLeaderSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().nullable().optional(),
  password: z.string().min(6).max(100).optional(),
  status: z.enum(statuses).optional(),
  governorateId: z.string().trim().min(1).optional(),
  areaIds: z.array(z.string().trim()).optional(),
});

async function scopePayload(req: ScopedRequest) {
  const scope = req.scopedUser;

  if (!scope?.governorateId) {
    return {
      governorateId: null,
      governorateName: null,
      areas: [],
    };
  }

  const location =
    await LocationModel.findById(
      scope.governorateId,
    )
      .select("_id name areas")
      .lean();

  if (!location) {
    return {
      governorateId: scope.governorateId,
      governorateName: null,
      areas: [],
    };
  }

  if (scope.role === "governorate_leader") {
    return {
      governorateId:
        location._id.toString(),
      governorateName: location.name,
      areas: location.areas
        .filter((area) => area.isActive)
        .map((area) => ({
          id: area._id.toString(),
          name: area.name,
        })),
    };
  }

  const ids = new Set(
    leaderAreaIds(req),
  );

  return {
    governorateId:
      location._id.toString(),
    governorateName: location.name,
    areas: location.areas
      .filter(
        (area) =>
          area.isActive &&
          ids.has(area._id.toString()),
      )
      .map((area) => ({
        id: area._id.toString(),
        name: area.name,
      })),
  };
}

function leaderVisible(
  req: ScopedRequest,
  leader: {
    _id: Types.ObjectId;
    role: string;
    governorateId?: Types.ObjectId | null;
  },
) {
  const scope = req.scopedUser;

  if (!scope) return false;

  if (
    scope.role === "admin" ||
    scope.role === "super_admin"
  ) {
    return true;
  }

  if (scope.role === "area_leader") {
    return leader._id.toString() === scope.id;
  }

  if (
    scope.role === "governorate_leader" &&
    scope.governorateId &&
    leader.governorateId
  ) {
    return (
      leader.role === "area_leader" &&
      leader.governorateId.toString() ===
        scope.governorateId
    );
  }

  return false;
}

// =========================================================
// CAPTAIN -> LEADER
// =========================================================

const convertCaptainSchema = z.object({
  captainId: z.string().trim().min(1),
  role: z.enum(leaderRoles),
  governorateId: z.string().trim().min(1),
  areaIds: z.array(z.string().trim()).default([]),
});

export async function searchCaptainsForLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);
    const scope = scopedReq.scopedUser;

    if (!scope) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لتحويل الكباتن.",
      });
      return;
    }

    const rawQuery =
      typeof req.query.q === "string"
        ? req.query.q.trim()
        : "";

    if (!rawQuery) {
      res.json({
        success: true,
        captains: [],
      });
      return;
    }

    // البحث يبدأ من أول حرف عادي جدًا.
    // مثال: g -> يعرض كل النتائج التي تحتوي على g في الاسم أو الإيميل.
    const escaped = rawQuery.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    const regex = new RegExp(escaped, "i");

    const captains = await UserModel.find({
      role: "captain",
      $or: [
        { fullName: regex },
        { email: regex },
      ],
    })
      .select(
        "_id fullName phone email role status avatarUrl governorateId areaId createdAt",
      )
      .populate(
        "governorateId",
        "_id name",
      )
      .sort({
        fullName: 1,
      })
      .limit(30)
      .lean();

    res.json({
      success: true,
      captains,
    });
  } catch (error: any) {
    console.error(
      "searchCaptainsForLeader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "تعذر البحث عن الكباتن.",
    });
  }
}

export async function convertCaptainToLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);
    const scope = scopedReq.scopedUser;

    if (!scope) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "ليس لديك صلاحية لتحويل الكباتن.",
      });
      return;
    }

    const parsed =
      convertCaptainSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message:
          parsed.error.issues[0]?.message ||
          "بيانات التحويل غير صحيحة.",
      });
      return;
    }

    const {
      captainId,
      role,
      governorateId,
      areaIds,
    } = parsed.data;

    if (!validId(captainId)) {
      res.status(400).json({
        success: false,
        message: "معرف الكابتن غير صحيح.",
      });
      return;
    }

    const assignment = await validateAssignment(
      role,
      governorateId,
      areaIds,
    );

    if (!assignment.ok) {
      res.status(400).json({
        success: false,
        message: assignment.message,
      });
      return;
    }

    const captain =
      await UserModel.findById(captainId);

    if (!captain) {
      res.status(404).json({
        success: false,
        message: "الكابتن غير موجود.",
      });
      return;
    }

    if (captain.role !== "captain") {
      res.status(409).json({
        success: false,
        message:
          "هذا الحساب لم يعد كابتنًا.",
      });
      return;
    }

    // لا ننشئ User جديد.
    // نفس الحساب ونفس passwordHash وكل سجل الكابتن يظل موجودًا.
    captain.role = role;
    captain.governorateId =
      new Types.ObjectId(governorateId);

    captain.areaIds = (
      role === "area_leader"
        ? assignment.areaIds
        : []
    ).map(
      (id) => new Types.ObjectId(id),
    );

    // Leader لا يستخدم areaId المفرد.
    captain.areaId = null;

    await captain.save();

    const result = await UserModel.findById(
      captain._id,
    )
      .select(
        "_id fullName phone email role status avatarUrl governorateId areaId areaIds",
      )
      .populate(
        "governorateId",
        "_id name",
      )
      .lean();

    res.json({
      success: true,
      message:
        "تم تحويل الكابتن إلى Leader بنجاح.",
      leader: result,
    });
  } catch (error: any) {
    console.error(
      "convertCaptainToLeader error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "تعذر تحويل الكابتن إلى Leader.",
    });
  }
}


// =========================================================
// ADMIN / LEADER CRUD
// =========================================================

export async function listLeaders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);
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
        $in: [...leaderRoles],
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

    const leaders =
      await UserModel.find(filter)
        .select(
          "_id fullName email phone role status governorateId areaId areaIds avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason createdAt updatedAt",
        )
        .populate(
          "governorateId",
          "_id name",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const enriched = await Promise.all(
      leaders.map(async (leader) => {
        const governorateId =
          idString(leader.governorateId);

        let areas: Array<{
          id: string;
          name: string;
        }> = [];

        if (governorateId) {
          const location =
            await LocationModel.findById(
              governorateId,
            )
              .select("areas")
              .lean();

          const ids = new Set(
            (
              leader.areaIds?.length
                ? leader.areaIds
                : leader.areaId
                  ? [leader.areaId]
                  : []
            ).map((id) => id.toString()),
          );

          areas =
            location?.areas
              .filter((area) =>
                ids.has(area._id.toString()),
              )
              .map((area) => ({
                id: area._id.toString(),
                name: area.name,
              })) ?? [];
        }

        return {
          ...leader,
          areaIds: (
            leader.areaIds?.length
              ? leader.areaIds
              : leader.areaId
                ? [leader.areaId]
                : []
          ).map((id) => id.toString()),
          areas,
        };
      }),
    );

    res.status(200).json({
      success: true,
      leaders: enriched,
    });
  } catch (error) {
    console.error("List leaders error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل القادة.",
    });
  }
}

export async function getLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);
    const id = String(scopedReq.params.id);

    if (!validId(id)) {
      res.status(400).json({
        success: false,
        message: "معرف القائد غير صحيح.",
      });
      return;
    }

    const leader =
      await UserModel.findOne({
        _id: id,
        role: {
          $in: [...leaderRoles],
        },
      })
        .select(
          "_id fullName email phone role status governorateId areaId areaIds avatarUrl isOnline lastSeenAt lastLoginAt approvedAt approvedBy rejectionReason suspensionReason createdAt updatedAt",
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
      !leaderVisible(
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
      leader: {
        ...leader,
        areaIds: (
          leader.areaIds?.length
            ? leader.areaIds
            : leader.areaId
              ? [leader.areaId]
              : []
        ).map((id) => id.toString()),
      },
    });
  } catch (error) {
    console.error("Get leader error:", error);

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
  try {
    const scopedReq = scoped(req);

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "إنشاء القادة متاح للأدمن فقط.",
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
        data.areaIds,
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
        message: "رقم الهاتف مستخدم بالفعل.",
      });
      return;
    }

    const email =
      data.email?.toLowerCase() || null;

    if (
      email &&
      (await UserModel.exists({
        email,
      }))
    ) {
      res.status(409).json({
        success: false,
        message:
          "البريد الإلكتروني مستخدم بالفعل.",
      });
      return;
    }

    if (
      data.role ===
      "governorate_leader"
    ) {
      const existing =
        await UserModel.exists({
          role: "governorate_leader",
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
      data.role === "area_leader"
    ) {
      const ids =
        assignment.areaIds.map(
          (id) => new Types.ObjectId(id),
        );

      const existing =
        await UserModel.findOne({
          role: "area_leader",
          governorateId:
            new Types.ObjectId(
              data.governorateId,
            ),
          $or: [
            {
              areaIds: {
                $in: ids,
              },
            },
            {
              areaId: {
                $in: ids,
              },
            },
          ],
        })
          .select("_id")
          .lean();

      if (existing) {
        res.status(409).json({
          success: false,
          message:
            "إحدى المناطق المحددة مرتبطة بالفعل بقائد آخر.",
        });
        return;
      }
    }

    const passwordHash =
      await createPasswordHash(
        data.password,
      );

    const leader =
      await UserModel.create({
        role: data.role,
        status: "pending",
        operationalEnabled: true,
        fullName: data.fullName,
        phone: data.phone,
        email,
        passwordHash,
        avatarUrl: null,
        isOnline: false,
        governorateId:
          new Types.ObjectId(
            data.governorateId,
          ),
        areaId: null,
        areaIds:
          data.role === "area_leader"
            ? assignment.areaIds.map(
                (id) =>
                  new Types.ObjectId(id),
              )
            : [],
      });

    res.status(201).json({
      success: true,
      message:
        "تم إنشاء القائد بنجاح. الحساب في انتظار التفعيل.",
      leader: {
        _id: leader._id,
        fullName: leader.fullName,
        phone: leader.phone,
        email: leader.email ?? null,
        role: leader.role,
        status: leader.status,
        governorateId:
          leader.governorateId,
        areaId: null,
        areaIds:
          leader.areaIds?.map((id) =>
            id.toString(),
          ) ?? [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات القائد غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Create leader error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء القائد.",
    });
  }
}

export async function updateLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message:
          "تعديل القادة متاح للأدمن فقط.",
      });
      return;
    }

    const id = String(scopedReq.params.id);

    if (!validId(id)) {
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
          $in: [...leaderRoles],
        },
      });

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    const role =
      leader.role as LeaderRole;

    const governorateId =
      data.governorateId ??
      leader.governorateId?.toString() ??
      "";

    const areaIds =
      data.areaIds ??
      (
        leader.areaIds?.length
          ? leader.areaIds
          : leader.areaId
            ? [leader.areaId]
            : []
      ).map((id) => id.toString());

    const assignment =
      await validateAssignment(
        role,
        governorateId,
        areaIds,
      );

    if (!assignment.ok) {
      res.status(400).json({
        success: false,
        message: assignment.message,
      });
      return;
    }

    if (data.phone && data.phone !== leader.phone) {
      const duplicate =
        await UserModel.exists({
          phone: data.phone,
          _id: {
            $ne: leader._id,
          },
        });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message:
            "رقم الهاتف مستخدم بالفعل.",
        });
        return;
      }
    }

    const email =
      data.email === undefined
        ? leader.email ?? null
        : data.email?.toLowerCase() || null;

    if (
      email &&
      email !== leader.email
    ) {
      const duplicate =
        await UserModel.exists({
          email,
          _id: {
            $ne: leader._id,
          },
        });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message:
            "البريد الإلكتروني مستخدم بالفعل.",
        });
        return;
      }
    }

    if (
      role === "governorate_leader" &&
      data.governorateId &&
      data.governorateId !==
        leader.governorateId?.toString()
    ) {
      const duplicate =
        await UserModel.exists({
          role: "governorate_leader",
          governorateId:
            new Types.ObjectId(
              data.governorateId,
            ),
          _id: {
            $ne: leader._id,
          },
        });

      if (duplicate) {
        res.status(409).json({
          success: false,
          message:
            "يوجد بالفعل قائد لهذه المحافظة.",
        });
        return;
      }
    }

    if (role === "area_leader") {
      const ids =
        assignment.areaIds.map(
          (id) => new Types.ObjectId(id),
        );

      const duplicate =
        await UserModel.findOne({
          role: "area_leader",
          _id: {
            $ne: leader._id,
          },
          governorateId:
            new Types.ObjectId(
              governorateId,
            ),
          $or: [
            {
              areaIds: {
                $in: ids,
              },
            },
            {
              areaId: {
                $in: ids,
              },
            },
          ],
        })
          .select("_id")
          .lean();

      if (duplicate) {
        res.status(409).json({
          success: false,
          message:
            "إحدى المناطق المحددة مرتبطة بالفعل بقائد آخر.",
        });
        return;
      }
    }

    leader.fullName =
      data.fullName ??
      leader.fullName;

    leader.phone =
      data.phone ??
      leader.phone;

    leader.email = email;

    leader.governorateId =
      new Types.ObjectId(
        governorateId,
      );

    leader.areaId = null;

    leader.areaIds =
      role === "area_leader"
        ? assignment.areaIds.map(
            (id) =>
              new Types.ObjectId(id),
          )
        : [];

    if (data.status !== undefined) {
      leader.status = data.status;
    }

    if (data.password) {
      leader.passwordHash =
        await createPasswordHash(
          data.password,
        );
    }

    if (leader.status === "active") {
      leader.rejectionReason = null;
      leader.suspensionReason = null;
    }

    await leader.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث القائد بنجاح.",
      leader: {
        _id: leader._id,
        fullName: leader.fullName,
        phone: leader.phone,
        email: leader.email ?? null,
        role: leader.role,
        status: leader.status,
        governorateId:
          leader.governorateId,
        areaIds:
          leader.areaIds?.map((id) =>
            id.toString(),
          ) ?? [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات التعديل غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Update leader error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تعديل القائد.",
    });
  }
}

export async function approveLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message:
          "تفعيل القادة متاح للأدمن فقط.",
      });
      return;
    }

    const leader =
      await UserModel.findOneAndUpdate(
        {
          _id: req.params.id,
          role: {
            $in: [...leaderRoles],
          },
        },
        {
          $set: {
            status: "active",
            approvedAt: new Date(),
            approvedBy:
              new Types.ObjectId(
                scopedReq.scopedUser!.id,
              ),
          },
          $unset: {
            rejectionReason: 1,
            suspensionReason: 1,
          },
        },
        {
          new: true,
        },
      )
        .select(
          "_id fullName phone email role status governorateId areaId areaIds",
        )
        .lean();

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "تم تفعيل القائد.",
      leader,
    });
  } catch (error) {
    console.error("Approve leader error:", error);

    res.status(500).json({
      success: false,
      message: "تعذر تفعيل القائد.",
    });
  }
}

export async function rejectLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message:
          "رفض القادة متاح للأدمن فقط.",
      });
      return;
    }

    const reason =
      typeof scopedReq.body?.reason ===
      "string"
        ? scopedReq.body.reason.trim()
        : "رفض من لوحة الإدارة";

    const leader =
      await UserModel.findOneAndUpdate(
        {
          _id: req.params.id,
          role: {
            $in: [...leaderRoles],
          },
        },
        {
          $set: {
            status: "rejected",
            rejectionReason: reason,
          },
          $unset: {
            approvedAt: 1,
            approvedBy: 1,
          },
        },
        {
          new: true,
        },
      )
        .select(
          "_id fullName phone email role status governorateId areaId areaIds rejectionReason",
        )
        .lean();

    if (!leader) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "تم رفض القائد.",
      leader,
    });
  } catch (error) {
    console.error("Reject leader error:", error);

    res.status(500).json({
      success: false,
      message: "تعذر رفض القائد.",
    });
  }
}

export async function deleteLeader(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isAdmin(scopedReq)) {
      res.status(403).json({
        success: false,
        message:
          "حذف القادة متاح للأدمن فقط.",
      });
      return;
    }

    const deleted =
      await UserModel.findOneAndDelete({
        _id: req.params.id,
        role: {
          $in: [...leaderRoles],
        },
      });

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: "القائد غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "تم حذف القائد.",
    });
  } catch (error) {
    console.error("Delete leader error:", error);

    res.status(500).json({
      success: false,
      message: "تعذر حذف القائد.",
    });
  }
}

// =========================================================
// LEADER APP ENDPOINTS
// =========================================================

export async function leaderDashboard(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isLeader(scopedReq)) {
      res.status(403).json({
        success: false,
        message:
          "هذه البيانات مخصصة للقادة فقط.",
      });
      return;
    }

    const geoFilter =
      buildGeoFilter(scopedReq);

    if (!geoFilter) {
      res.status(400).json({
        success: false,
        message: "نطاق القائد غير مكتمل.",
      });
      return;
    }

    const [
      captainTotal,
      captainOnline,
      establishmentTotal,
      establishmentActive,
      establishments,
    ] = await Promise.all([
      UserModel.countDocuments({
        ...geoFilter,
        role: "captain",
      }),

      UserModel.countDocuments({
        ...geoFilter,
        role: "captain",
        status: "active",
        isOnline: true,
      }),

      EstablishmentModel.countDocuments(
        geoFilter,
      ),

      EstablishmentModel.countDocuments({
        ...geoFilter,
        status: {
          $in: ["active", "approved"],
        },
      }),

      EstablishmentModel.find(
        geoFilter,
      )
        .select("_id")
        .lean(),
    ]);

    const establishmentIds =
      establishments.map((item) => item._id);

    const [
      totalOrders,
      activeOrders,
      pendingOrders,
      recentOrders,
    ] = establishmentIds.length
      ? await Promise.all([
          OrderModel.countDocuments({
            establishmentId: {
              $in: establishmentIds,
            },
          }),

          OrderModel.countDocuments({
            establishmentId: {
              $in: establishmentIds,
            },
            status: {
              $nin: [
                "delivered",
                "cancelled",
                "rejected",
                "completed",
              ],
            },
          }),

          OrderModel.countDocuments({
            establishmentId: {
              $in: establishmentIds,
            },
            status: "pending",
          }),

          OrderModel.find({
            establishmentId: {
              $in: establishmentIds,
            },
          })
            .sort({
              createdAt: -1,
            })
            .limit(5)
            .select(
              "_id orderNumber status total createdAt establishmentId",
            )
            .populate(
              "establishmentId",
              "_id name areaId",
            )
            .lean(),
        ])
      : [
          0,
          0,
          0,
          [],
        ];

    res.status(200).json({
      success: true,

      scope: await scopePayload(
        scopedReq,
      ),

      stats: {
        captains: captainTotal,
        onlineCaptains: captainOnline,
        establishments: establishmentTotal,
        activeEstablishments:
          establishmentActive,
        orders: totalOrders,
        activeOrders,
        pendingOrders,
      },

      recentOrders,
    });
  } catch (error) {
    console.error(
      "Leader dashboard error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "تعذر تحميل لوحة القائد.",
    });
  }
}

export async function leaderOrders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isLeader(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "غير مصرح.",
      });
      return;
    }

    const geoFilter =
      buildGeoFilter(scopedReq);

    if (!geoFilter) {
      res.status(400).json({
        success: false,
        message: "نطاق القائد غير مكتمل.",
      });
      return;
    }

    const establishments =
      await EstablishmentModel.find(
        geoFilter,
      )
        .select("_id")
        .lean();

    const ids =
      establishments.map(
        (item) => item._id,
      );

    const orders =
      ids.length
        ? await OrderModel.find({
            establishmentId: {
              $in: ids,
            },
          })
            .sort({
              createdAt: -1,
            })
            .limit(100)
            .select(
              "_id orderNumber status total createdAt establishmentId captainId",
            )
            .populate(
              "establishmentId",
              "_id name areaId",
            )
            .populate(
              "captainId",
              "_id fullName phone isOnline status",
            )
            .lean()
        : [];

    res.status(200).json({
      success: true,
      orders,
      total: orders.length,
    });
  } catch (error) {
    console.error("Leader orders error:", error);

    res.status(500).json({
      success: false,
      message: "تعذر تحميل طلبات القائد.",
    });
  }
}

export async function leaderCaptains(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isLeader(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "غير مصرح.",
      });
      return;
    }

    const geoFilter =
      buildGeoFilter(scopedReq);

    if (!geoFilter) {
      res.status(400).json({
        success: false,
        message: "نطاق القائد غير مكتمل.",
      });
      return;
    }

    const captains =
      await UserModel.find({
        ...geoFilter,
        role: "captain",
      })
        .select(
          "_id fullName phone email status isOnline operationalEnabled governorateId areaId avatarUrl lastSeenAt lastLoginAt",
        )
        .sort({
          isOnline: -1,
          fullName: 1,
        })
        .limit(200)
        .lean();

    res.status(200).json({
      success: true,
      captains,
      total: captains.length,
    });
  } catch (error) {
    console.error(
      "Leader captains error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "تعذر تحميل الكباتن.",
    });
  }
}

export async function leaderEstablishments(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isLeader(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "غير مصرح.",
      });
      return;
    }

    const geoFilter =
      buildGeoFilter(scopedReq);

    if (!geoFilter) {
      res.status(400).json({
        success: false,
        message: "نطاق القائد غير مكتمل.",
      });
      return;
    }

    const establishments =
      await EstablishmentModel.find(
        geoFilter,
      )
        .select(
          "_id name type phone status governorateId areaId ownerUserId createdAt updatedAt",
        )
        .populate(
          "areaId",
          "_id name",
        )
        .sort({
          status: 1,
          name: 1,
        })
        .limit(300)
        .lean();

    res.status(200).json({
      success: true,
      establishments,
      total: establishments.length,
    });
  } catch (error) {
    console.error(
      "Leader establishments error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "تعذر تحميل المطاعم والمحلات.",
    });
  }
}

export async function leaderScope(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq = scoped(req);

    if (!isLeader(scopedReq)) {
      res.status(403).json({
        success: false,
        message: "غير مصرح.",
      });
      return;
    }

    const user =
      await UserModel.findById(
        scopedReq.scopedUser!.id,
      )
        .select(
          "_id fullName phone email role status governorateId areaId areaIds avatarUrl",
        )
        .lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "الحساب غير موجود.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        ...user,
        areaIds: (
          user.areaIds?.length
            ? user.areaIds
            : user.areaId
              ? [user.areaId]
              : []
        ).map((id) => id.toString()),
      },
      scope: await scopePayload(
        scopedReq,
      ),
    });
  } catch (error) {
    console.error(
      "Leader scope error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "تعذر تحميل نطاق القائد.",
    });
  }
}
