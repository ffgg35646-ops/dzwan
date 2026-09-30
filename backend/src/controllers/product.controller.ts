import type { Response } from "../http/express-compat.js";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { ScopedRequest } from "../middleware/scope.middleware.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { ProductModel } from "../models/Product.js";

const createSchema = z.object({
  establishmentId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.number().min(0),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

const updateSchema = createSchema.omit({
  establishmentId: true,
}).partial();

function canManageEstablishment(
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
    return scope.governorateId === governorateId;
  }

  if (scope.role === "area_leader") {
    return (
      scope.governorateId === governorateId &&
      scope.areaId === areaId
    );
  }

  return false;
}

async function canShopManageEstablishment(
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

export async function listProducts(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const establishmentId = String(
      req.query.establishmentId ?? "",
    );

    if (!Types.ObjectId.isValid(establishmentId)) {
      res.status(400).json({
        success: false,
        message: "معرف المنشأة غير صحيح.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        establishmentId,
      )
        .select("governorateId areaId")
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message: "المنشأة غير موجودة.",
      });
      return;
    }

    const scopedReq = req as ScopedRequest;

    const managerAllowed =
      canManageEstablishment(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const shopAllowed =
      await canShopManageEstablishment(
        scopedReq,
        establishmentId,
      );

    if (!managerAllowed && !shopAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك الوصول إلى منتجات منشأة خارج نطاقك.",
      });
      return;
    }

    const products = await ProductModel.find({
      establishmentId:
        new Types.ObjectId(establishmentId),
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error) {
    console.error("List products error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل المنتجات.",
    });
  }
}

export async function createProduct(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = createSchema.parse(req.body);

    if (!Types.ObjectId.isValid(data.establishmentId)) {
      res.status(400).json({
        success: false,
        message: "معرف المنشأة غير صحيح.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        data.establishmentId,
      )
        .select("governorateId areaId status")
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message: "المنشأة غير موجودة.",
      });
      return;
    }

    if (establishment.status !== "active") {
      res.status(400).json({
        success: false,
        message:
          "لا يمكن إضافة منتجات لمنشأة غير مفعلة.",
      });
      return;
    }

    const scopedReq = req as ScopedRequest;

    const managerAllowed =
      canManageEstablishment(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const shopAllowed =
      await canShopManageEstablishment(
        scopedReq,
        data.establishmentId,
      );

    if (!managerAllowed && !shopAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك إدارة منتجات منشأة خارج نطاقك.",
      });
      return;
    }

    const product = await ProductModel.create({
      establishmentId:
        new Types.ObjectId(data.establishmentId),
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      imageUrl: data.imageUrl ?? null,
      status: data.status ?? "active",
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المنتج بنجاح.",
      product,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات المنتج غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Create product error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء إنشاء المنتج.",
    });
  }
}

export async function getProduct(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const productId =
      String(req.params.id || "").trim();

    if (!Types.ObjectId.isValid(productId)) {
      res.status(400).json({
        success: false,
        message: "معرّف المنتج غير صالح.",
      });
      return;
    }

    const product = await ProductModel.findById(
      productId,
    ).lean();

    if (!product) {
      res.status(404).json({
        success: false,
        message: "المنتج غير موجود.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        product.establishmentId,
      )
        .select("governorateId areaId")
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message: "المنشأة المرتبطة غير موجودة.",
      });
      return;
    }

    const scopedReq = req as ScopedRequest;

    const managerAllowed =
      canManageEstablishment(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const shopAllowed =
      await canShopManageEstablishment(
        scopedReq,
        product.establishmentId.toString(),
      );

    if (!managerAllowed && !shopAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك الوصول إلى منتج خارج نطاقك.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل المنتج.",
    });
  }
}

export async function updateProduct(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const data = updateSchema.parse(req.body);

    const product = await ProductModel.findById(
      String(req.params.id),
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: "المنتج غير موجود.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        product.establishmentId,
      )
        .select("governorateId areaId")
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message: "المنشأة المرتبطة غير موجودة.",
      });
      return;
    }

    const scopedReq = req as ScopedRequest;

    const managerAllowed =
      canManageEstablishment(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const shopAllowed =
      await canShopManageEstablishment(
        scopedReq,
        product.establishmentId.toString(),
      );

    if (!managerAllowed && !shopAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تعديل منتج خارج نطاقك.",
      });
      return;
    }

    if (data.name !== undefined) {
      product.name = data.name;
    }

    if (data.description !== undefined) {
      product.description = data.description;
    }

    if (data.price !== undefined) {
      product.price = data.price;
    }

    if (data.imageUrl !== undefined) {
      product.imageUrl = data.imageUrl;
    }

    if (data.status !== undefined) {
      product.status = data.status;
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث المنتج بنجاح.",
      product,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: "بيانات المنتج غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error("Update product error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحديث المنتج.",
    });
  }
}

export async function deleteProduct(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const product = await ProductModel.findById(
      String(req.params.id),
    );

    if (!product) {
      res.status(404).json({
        success: false,
        message: "المنتج غير موجود.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        product.establishmentId,
      )
        .select("governorateId areaId")
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message: "المنشأة المرتبطة غير موجودة.",
      });
      return;
    }

    const scopedReq = req as ScopedRequest;

    const managerAllowed =
      canManageEstablishment(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const shopAllowed =
      await canShopManageEstablishment(
        scopedReq,
        product.establishmentId.toString(),
      );

    if (!managerAllowed && !shopAllowed) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك حذف منتج خارج نطاقك.",
      });
      return;
    }

    await ProductModel.findByIdAndDelete(
      product._id,
    );

    res.status(200).json({
      success: true,
      message: "تم حذف المنتج بنجاح.",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء حذف المنتج.",
    });
  }
}
