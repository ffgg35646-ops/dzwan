import type { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { ScopedRequest } from "../middleware/scope.middleware.js";
import { UserModel } from "../models/User.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { createPasswordHash } from "../services/auth.service.js";

const createOwnerSchema = z.object({
  establishmentId: z.string().min(1),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(30),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(128),
});

const updateOwnerSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(5).max(30).optional(),
  email: z.string().trim().email().optional().nullable(),
  status: z
    .enum([
      "pending",
      "active",
      "rejected",
      "suspended",
      "inactive",
    ])
    .optional(),
  password: z.string().min(8).max(128).optional(),
});

function hasScopeAccess(
  req: ScopedRequest,
  governorateId: string,
  areaId: string,
): boolean {
  const scope = req.scopedUser;

  if (!scope) return false;

  if (
    scope.role === "admin" ||
    scope.role === "super_admin"
  ) {
    return true;
  }

  if (scope.role === "governorate_leader") {
    return (
      scope.governorateId === governorateId
    );
  }

  if (scope.role === "area_leader") {
    return (
      scope.governorateId === governorateId &&
      scope.areaId === areaId
    );
  }

  return false;
}

export async function listEstablishmentOwners(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const filter: Record<string, unknown> = {
      role: "shop",
    };

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

    const users =
      await UserModel.find(filter)
        .select(
          "_id fullName phone email role status governorateId areaId createdAt updatedAt",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const owners = await Promise.all(
      users.map(async (user) => {
        const establishment =
          await EstablishmentModel.findOne({
            ownerUserId: user._id,
          })
            .select(
              "_id name type status governorateId areaId captainId",
            )
            .lean();

        return {
          ...user,
          establishment:
            establishment ?? null,
        };
      }),
    );

    res.status(200).json({
      success: true,
      owners,
      total: owners.length,
    });
  } catch (error) {
    console.error(
      "List establishment owners error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل أصحاب المنشآت.",
    });
  }
}

export async function createEstablishmentOwner(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const data =
      createOwnerSchema.parse(
        scopedReq.body,
      );

    if (
      !Types.ObjectId.isValid(
        data.establishmentId,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "معرف المنشأة غير صحيح.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        data.establishmentId,
      );

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المنشأة غير موجودة.",
      });
      return;
    }

    if (
      !hasScopeAccess(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك إدارة منشأة خارج نطاقك.",
      });
      return;
    }

    if (establishment.ownerUserId) {
      res.status(409).json({
        success: false,
        message:
          "المنشأة مرتبطة بالفعل بحساب مالك.",
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

    const email =
      data.email?.toLowerCase();

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

    const passwordHash =
      await createPasswordHash(
        data.password,
      );

    const owner =
      new UserModel({
        role: "shop",
        status: "active",
        fullName: data.fullName,
        phone: data.phone,
        email: email ?? undefined,
        passwordHash,
        avatarUrl: null,
        isOnline: false,
        governorateId:
          establishment.governorateId,
        areaId:
          establishment.areaId,
        approvedAt: new Date(),
        approvedBy:
          scopedReq.user?.sub &&
          Types.ObjectId.isValid(
            scopedReq.user.sub,
          )
            ? new Types.ObjectId(
                scopedReq.user.sub,
              )
            : null,
      });

    await owner.save();

    establishment.ownerUserId =
      owner._id;

    await establishment.save();

    res.status(201).json({
      success: true,
      message:
        "تم إنشاء حساب صاحب المنشأة وربطه بنجاح.",
      owner: {
        _id: owner._id,
        fullName: owner.fullName,
        phone: owner.phone,
        email: owner.email ?? null,
        role: owner.role,
        status: owner.status,
        governorateId:
          owner.governorateId,
        areaId: owner.areaId,
      },
      establishment: {
        _id: establishment._id,
        name: establishment.name,
        type: establishment.type,
        ownerUserId:
          establishment.ownerUserId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات صاحب المنشأة غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Create establishment owner error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء إنشاء حساب صاحب المنشأة.",
    });
  }
}

export async function getEstablishmentOwner(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const ownerId = String(scopedReq.params.id || "").trim();

    if (!Types.ObjectId.isValid(ownerId)) {
      res.status(400).json({
        success: false,
        message: "معرّف حساب صاحب المنشأة غير صالح.",
      });
      return;
    }

    const owner =
      await UserModel.findOne({
        _id: ownerId,
        role: "shop",
      })
        .select(
          "_id fullName phone email role status governorateId areaId createdAt updatedAt",
        )
        .lean();

    if (!owner) {
      res.status(404).json({
        success: false,
        message:
          "حساب صاحب المنشأة غير موجود.",
      });
      return;
    }

    if (
      !hasScopeAccess(
        scopedReq,
        owner.governorateId?.toString() ??
          "",
        owner.areaId?.toString() ??
          "",
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك الوصول إلى حساب خارج نطاقك.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findOne({
        ownerUserId: owner._id,
      })
        .select(
          "_id name type status governorateId areaId captainId",
        )
        .lean();

    res.status(200).json({
      success: true,
      owner,
      establishment:
        establishment ?? null,
    });
  } catch (error) {
    console.error(
      "Get establishment owner error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل حساب صاحب المنشأة.",
    });
  }
}

export async function updateEstablishmentOwner(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const data =
      updateOwnerSchema.parse(
        scopedReq.body,
      );

    const ownerId = String(scopedReq.params.id || "").trim();

    if (!Types.ObjectId.isValid(ownerId)) {
      res.status(400).json({
        success: false,
        message: "معرّف حساب صاحب المنشأة غير صالح.",
      });
      return;
    }

    const owner =
      await UserModel.findOne({
        _id: ownerId,
        role: "shop",
      });

    if (!owner) {
      res.status(404).json({
        success: false,
        message:
          "حساب صاحب المنشأة غير موجود.",
      });
      return;
    }

    if (
      !hasScopeAccess(
        scopedReq,
        owner.governorateId?.toString() ??
          "",
        owner.areaId?.toString() ??
          "",
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تعديل حساب خارج نطاقك.",
      });
      return;
    }

    if (data.fullName !== undefined) {
      owner.fullName =
        data.fullName;
    }

    if (data.phone !== undefined) {
      const exists =
        await UserModel.findOne({
          phone: data.phone,
          _id: {
            $ne: owner._id,
          },
        });

      if (exists) {
        res.status(409).json({
          success: false,
          message:
            "رقم الهاتف مستخدم بالفعل.",
        });
        return;
      }

      owner.phone =
        data.phone;
    }

    if (data.email !== undefined) {
      const email =
        data.email?.toLowerCase() ??
        undefined;

      if (email) {
        const exists =
          await UserModel.findOne({
            email,
            _id: {
              $ne: owner._id,
            },
          });

        if (exists) {
          res.status(409).json({
            success: false,
            message:
              "البريد الإلكتروني مستخدم بالفعل.",
          });
          return;
        }
      }

      owner.email = email;
    }

    if (data.status !== undefined) {
      owner.status =
        data.status;
    }

    if (data.password) {
      owner.passwordHash =
        await createPasswordHash(
          data.password,
        );
    }

    await owner.save();

    res.status(200).json({
      success: true,
      message:
        "تم تحديث حساب صاحب المنشأة بنجاح.",
      owner: {
        _id: owner._id,
        fullName: owner.fullName,
        phone: owner.phone,
        email: owner.email ?? null,
        role: owner.role,
        status: owner.status,
        governorateId:
          owner.governorateId,
        areaId: owner.areaId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات الحساب غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Update establishment owner error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحديث حساب صاحب المنشأة.",
    });
  }
}

export async function deleteEstablishmentOwner(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const owner =
      await UserModel.findOne({
        _id: scopedReq.params.id,
        role: "shop",
      });

    if (!owner) {
      res.status(404).json({
        success: false,
        message:
          "حساب صاحب المنشأة غير موجود.",
      });
      return;
    }

    if (
      !hasScopeAccess(
        scopedReq,
        owner.governorateId?.toString() ??
          "",
        owner.areaId?.toString() ??
          "",
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك حذف حساب خارج نطاقك.",
      });
      return;
    }

    await EstablishmentModel.updateMany(
      {
        ownerUserId: owner._id,
      },
      {
        $set: {
          ownerUserId: null,
        },
      },
    );

    await UserModel.findByIdAndDelete(
      owner._id,
    );

    res.status(200).json({
      success: true,
      message:
        "تم حذف حساب صاحب المنشأة وفك ارتباطه بالمنشأة.",
    });
  } catch (error) {
    console.error(
      "Delete establishment owner error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء حذف حساب صاحب المنشأة.",
    });
  }
}
