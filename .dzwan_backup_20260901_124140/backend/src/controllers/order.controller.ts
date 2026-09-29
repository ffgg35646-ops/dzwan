import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import type { ScopedRequest } from "../middleware/scope.middleware.js";
import { UserModel } from "../models/User.js";
import { CustomerAddressModel } from "../models/CustomerAddress.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { ProductModel } from "../models/Product.js";
import { OrderModel, ORDER_STATUSES, type OrderStatus } from "../models/Order.js";
import { createNotification } from "../services/notification.service.js";

const createOrderSchema = z.object({
  customerId: z.string().trim().min(1),
  establishmentId: z.string().trim().min(1),
  addressId: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1),
  deliveryFee: z.number().min(0).max(100000).optional(),
  customerNote: z.string().trim().max(1000).optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  reason: z.string().trim().max(500).optional().nullable(),
});

const assignCaptainSchema = z.object({
  captainId: z.string().trim().min(1),
});

function validId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

function canAccessOrder(
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

function canCustomerAccess(
  req: ScopedRequest,
  customerId: string,
): boolean {
  return (
    req.scopedUser?.role === "customer" &&
    req.scopedUser.id === customerId
  );
}

async function getOrderScope(
  establishmentId: Types.ObjectId,
) {
  const establishment =
    await EstablishmentModel.findById(
      establishmentId,
    )
      .select(
        "governorateId areaId status captainId",
      )
      .lean();

  if (!establishment) {
    return null;
  }

  return {
    governorateId:
      establishment.governorateId.toString(),
    areaId:
      establishment.areaId.toString(),
    status: establishment.status,
  };
}

function isAllowedTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  const transitions: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    pending: [
      "confirmed",
      "rejected",
      "cancelled",
    ],

    confirmed: [
      "preparing",
      "cancelled",
    ],

    preparing: [
      "ready_for_pickup",
      "cancelled",
    ],

    ready_for_pickup: [
      "assigned",
      "cancelled",
    ],

    assigned: [
      "picked_up",
      "cancelled",
    ],

    picked_up: [
      "on_the_way",
    ],

    on_the_way: [
      "delivered",
    ],

    delivered: [],

    cancelled: [],

    rejected: [],
  };

  return transitions[from].includes(to);
}

function makeOrderNumber(): string {
  const date = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);

  return `DZ-${date}-${randomUUID()
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase()}`;
}

export async function listOrders(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const filter: Record<string, unknown> = {};

    const status =
      typeof scopedReq.query.status ===
      "string"
        ? scopedReq.query.status
        : "";

    if (
      status &&
      ORDER_STATUSES.includes(
        status as OrderStatus,
      )
    ) {
      filter.status = status;
    }

    const customerId =
      typeof scopedReq.query.customerId ===
      "string"
        ? scopedReq.query.customerId
        : "";

    if (
      customerId &&
      validId(customerId)
    ) {
      filter.customerId =
        new Types.ObjectId(customerId);
    }

    const establishmentId =
      typeof scopedReq.query
        .establishmentId === "string"
        ? scopedReq.query.establishmentId
        : "";

    if (
      establishmentId &&
      validId(establishmentId)
    ) {
      filter.establishmentId =
        new Types.ObjectId(
          establishmentId,
        );
    }

    const scope =
      scopedReq.scopedUser;

    if (
      scope?.role ===
        "governorate_leader" &&
      scope.governorateId
    ) {
      const establishments =
        await EstablishmentModel.find({
          governorateId:
            new Types.ObjectId(
              scope.governorateId,
            ),
        })
          .select("_id")
          .lean();

      filter.establishmentId = {
        $in: establishments.map(
          (item) => item._id,
        ),
      };
    }

    if (
      scope?.role === "area_leader" &&
      scope.governorateId &&
      scope.areaId
    ) {
      const establishments =
        await EstablishmentModel.find({
          governorateId:
            new Types.ObjectId(
              scope.governorateId,
            ),
          areaId:
            new Types.ObjectId(
              scope.areaId,
            ),
        })
          .select("_id")
          .lean();

      filter.establishmentId = {
        $in: establishments.map(
          (item) => item._id,
        ),
      };
    }

    if (
      scope?.role === "customer"
    ) {
      filter.customerId =
        new Types.ObjectId(scope.id);
    }

    if (
      scope?.role === "captain"
    ) {
      filter.captainId =
        new Types.ObjectId(scope.id);
    }

    if (
      scope?.role === "shop"
    ) {
      const establishment =
        await EstablishmentModel.findOne({
          ownerUserId:
            new Types.ObjectId(scope.id),
        })
          .select("_id")
          .lean();

      if (!establishment) {
        res.status(200).json({
          success: true,
          orders: [],
          total: 0,
        });
        return;
      }

      filter.establishmentId =
        establishment._id;
    }

    const orders =
      await OrderModel.find(filter)
        .populate(
          "customerId",
          "_id fullName phone email",
        )
        .populate(
          "establishmentId",
          "_id name type status governorateId areaId",
        )
        .populate(
          "addressId",
          "_id label address notes governorateId areaId",
        )
        .populate(
          "captainId",
          "_id fullName phone status isOnline",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    res.status(200).json({
      success: true,
      orders,
      total: orders.length,
    });
  } catch (error) {
    console.error(
      "List orders error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تحميل الطلبات.",
    });
  }
}

export async function getOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const order =
      await OrderModel.findById(
        String(scopedReq.params.id),
      )
        .populate(
          "customerId",
          "_id fullName phone email",
        )
        .populate(
          "establishmentId",
          "_id name type status governorateId areaId",
        )
        .populate(
          "addressId",
          "_id label address notes governorateId areaId",
        )
        .populate(
          "captainId",
          "_id fullName phone status isOnline",
        )
        .lean();

    if (!order) {
      res.status(404).json({
        success: false,
        message: "الطلب غير موجود.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        order.establishmentId,
      )
        .select(
          "governorateId areaId",
        )
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المنشأة المرتبطة بالطلب غير موجودة.",
      });
      return;
    }

    const establishmentAllowed =
      canAccessOrder(
        scopedReq,
        establishment.governorateId.toString(),
        establishment.areaId.toString(),
      );

    const orderCustomerId =
      typeof order.customerId === "object" &&
      order.customerId !== null &&
      "_id" in order.customerId
        ? String(
            (order.customerId as { _id: unknown })._id,
          )
        : String(order.customerId);

    const customerAllowed =
      canCustomerAccess(
        scopedReq,
        orderCustomerId,
      );

    if (
      !establishmentAllowed &&
      !customerAllowed &&
      !(
        scopedReq.scopedUser?.role ===
          "captain" &&
        order.captainId?.toString() ===
          scopedReq.scopedUser.id
      ) &&
      !(
        scopedReq.scopedUser?.role ===
          "shop" &&
        (
          await EstablishmentModel.exists({
            _id: order.establishmentId,
            ownerUserId:
              new Types.ObjectId(
                scopedReq.scopedUser.id,
              ),
          })
        )
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك الوصول إلى هذا الطلب.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Get order error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحميل بيانات الطلب.",
    });
  }
}

export async function createOrder(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const data =
      createOrderSchema.parse(
        scopedReq.body,
      );

    if (
      scopedReq.scopedUser?.role !==
      "customer"
    ) {
      res.status(403).json({
        success: false,
        message:
          "إنشاء الطلب متاح للعميل فقط.",
      });
      return;
    }

    if (
      scopedReq.scopedUser.id !==
      data.customerId
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك إنشاء طلب باسم عميل آخر.",
      });
      return;
    }

    if (
      !validId(data.customerId) ||
      !validId(data.establishmentId) ||
      !validId(data.addressId)
    ) {
      res.status(400).json({
        success: false,
        message:
          "أحد معرفات الطلب غير صحيح.",
      });
      return;
    }

    const establishment =
      await EstablishmentModel.findById(
        data.establishmentId,
      )
        .select(
          "name type status governorateId areaId",
        )
        .lean();

    if (!establishment) {
      res.status(404).json({
        success: false,
        message:
          "المطعم أو المحل غير موجود.",
      });
      return;
    }

    if (
      establishment.status !== "active"
    ) {
      res.status(400).json({
        success: false,
        message:
          "المنشأة غير مفعلة حاليًا.",
      });
      return;
    }

    const address =
      await CustomerAddressModel.findOne({
        _id: data.addressId,
        userId:
          new Types.ObjectId(
            data.customerId,
          ),
      })
        .lean();

    if (!address) {
      res.status(400).json({
        success: false,
        message:
          "عنوان التوصيل غير موجود أو لا يخص العميل.",
      });
      return;
    }

    if (
      address.governorateId.toString() !==
      establishment.governorateId.toString()
    ) {
      res.status(400).json({
        success: false,
        message:
          "عنوان التوصيل خارج محافظة المنشأة.",
      });
      return;
    }

    if (
      address.areaId.toString() !==
      establishment.areaId.toString()
    ) {
      res.status(400).json({
        success: false,
        message:
          "عنوان التوصيل خارج منطقة المنشأة.",
      });
      return;
    }

    const productIds =
      data.items.map(
        (item) => item.productId,
      );

    if (
      productIds.some(
        (id) => !validId(id),
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          "معرف أحد المنتجات غير صحيح.",
      });
      return;
    }

    const uniqueProductIds = [
      ...new Set(productIds),
    ];

    const products =
      await ProductModel.find({
        _id: {
          $in: uniqueProductIds.map(
            (id) =>
              new Types.ObjectId(id),
          ),
        },
        establishmentId:
          new Types.ObjectId(
            data.establishmentId,
          ),
        status: "active",
      })
        .lean();

    if (
      products.length !==
      uniqueProductIds.length
    ) {
      res.status(400).json({
        success: false,
        message:
          "يوجد منتج غير موجود أو غير متاح أو تابع لمنشأة أخرى.",
      });
      return;
    }

    const productMap =
      new Map(
        products.map(
          (product) => [
            product._id.toString(),
            product,
          ],
        ),
      );

    const items =
      data.items.map((item) => {
        const product =
          productMap.get(
            item.productId,
          )!;

        const totalPrice =
          Number(
            (
              product.price *
              item.quantity
            ).toFixed(2),
          );

        return {
          productId:
            product._id,
          name: product.name,
          quantity:
            item.quantity,
          unitPrice:
            product.price,
          totalPrice,
        };
      });

    const subtotal = Number(
      items
        .reduce(
          (sum, item) =>
            sum + item.totalPrice,
          0,
        )
        .toFixed(2),
    );

    const deliveryFee = Number(
      (
        data.deliveryFee ?? 0
      ).toFixed(2),
    );

    const total = Number(
      (
        subtotal +
        deliveryFee
      ).toFixed(2),
    );

    const order =
      await OrderModel.create({
        orderNumber:
          makeOrderNumber(),

        customerId:
          new Types.ObjectId(
            data.customerId,
          ),

        establishmentId:
          new Types.ObjectId(
            data.establishmentId,
          ),

        addressId:
          new Types.ObjectId(
            data.addressId,
          ),

        captainId: null,

        items,

        subtotal,
        deliveryFee,
        total,

        status: "pending",

        customerNote:
          data.customerNote ??
          null,
      });


    await createNotification({
      userId: data.customerId,
      type: "order",
      title: "تم استلام الطلب",
      message: `تم إنشاء الطلب ${order.orderNumber} بنجاح.`,
      orderId: order._id,
      establishmentId: order.establishmentId,
    });

    res.status(201).json({
      success: true,
      message:
        "تم إنشاء الطلب بنجاح.",
      order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات الطلب غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Create order error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء إنشاء الطلب.",
    });
  }
}

export async function updateOrderStatus(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const data =
      updateStatusSchema.parse(
        scopedReq.body,
      );

    const order =
      await OrderModel.findById(
        String(scopedReq.params.id),
      );

    if (!order) {
      res.status(404).json({
        success: false,
        message: "الطلب غير موجود.",
      });
      return;
    }

    const scope =
      await getOrderScope(
        order.establishmentId,
      );

    if (!scope) {
      res.status(404).json({
        success: false,
        message:
          "المنشأة المرتبطة بالطلب غير موجودة.",
      });
      return;
    }

    const scopedUser =
      scopedReq.scopedUser;

    if (!scopedUser) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const role = scopedUser.role;

    const isCustomer =
      role === "customer" &&
      scopedUser.id ===
        order.customerId.toString();

    const isCaptain =
      role === "captain" &&
      scopedUser.id ===
        order.captainId?.toString();

    const isShop =
      role === "shop" &&
      !!(
        await EstablishmentModel.exists({
          _id: order.establishmentId,
          ownerUserId:
            new Types.ObjectId(
              scopedUser.id,
            ),
        })
      );

    const isManager =
      canAccessOrder(
        scopedReq,
        scope.governorateId,
        scope.areaId,
      );

    if (
      !isCustomer &&
      !isCaptain &&
      !isShop &&
      !isManager
    ) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك تغيير حالة هذا الطلب.",
      });
      return;
    }

    const requestedStatus = data.status;

    const shopStatuses = [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "cancelled",
      "rejected",
    ];

    const captainStatuses = [
      "picked_up",
      "on_the_way",
      "delivered",
    ];

    const customerStatuses = [
      "cancelled",
    ];

    const managerStatuses = [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "assigned",
      "cancelled",
      "rejected",
    ];

    const captainAllowed =
      isCaptain &&
      captainStatuses.includes(
        requestedStatus,
      );

    const shopAllowed =
      isShop &&
      shopStatuses.includes(
        requestedStatus,
      );

    const customerAllowedForStatus =
      isCustomer &&
      customerStatuses.includes(
        requestedStatus,
      );

    const managerAllowed =
      isManager &&
      managerStatuses.includes(
        requestedStatus,
      );

    if (
      !captainAllowed &&
      !shopAllowed &&
      !customerAllowedForStatus &&
      !managerAllowed
    ) {
      res.status(403).json({
        success: false,
        message:
          "حسابك لا يملك صلاحية تغيير الطلب إلى هذه الحالة.",
      });
      return;
    }

    if (
      !isAllowedTransition(
        order.status,
        data.status,
      )
    ) {
      res.status(400).json({
        success: false,
        message:
          `لا يمكن تغيير حالة الطلب من ${order.status} إلى ${data.status}.`,
      });
      return;
    }

    if (
      data.status === "assigned" ||
      data.status === "picked_up" ||
      data.status === "on_the_way" ||
      data.status === "delivered"
    ) {
      if (!order.captainId) {
        res.status(400).json({
          success: false,
          message:
            "لا يمكن الانتقال لهذه الحالة بدون كابتن معين.",
        });
        return;
      }
    }

    const now = new Date();

    order.status =
      data.status;

    if (
      data.status === "confirmed"
    ) {
      order.confirmedAt = now;
    }

    if (
      data.status === "assigned"
    ) {
      order.assignedAt = now;
    }

    if (
      data.status === "picked_up"
    ) {
      order.pickedUpAt = now;
    }

    if (
      data.status === "delivered"
    ) {
      order.deliveredAt = now;
    }

    if (
      data.status === "cancelled"
    ) {
      order.cancelledAt = now;
      order.cancellationReason =
        data.reason ?? null;
    }

    if (
      data.status === "rejected"
    ) {
      order.cancellationReason =
        data.reason ?? null;
    }

    await order.save();

    await createNotification({
      userId: order.customerId,
      type: "order",
      title: "تحديث الطلب",
      message: `تم تحديث حالة الطلب ${order.orderNumber} إلى ${data.status}.`,
      orderId: order._id,
      establishmentId: order.establishmentId,
    });

    if (order.captainId) {
      await createNotification({
        userId: order.captainId,
        type: "order",
        title: "تحديث طلب",
        message: `تم تحديث حالة الطلب ${order.orderNumber}.`,
        orderId: order._id,
        establishmentId: order.establishmentId,
      });
    }

    res.status(200).json({
      success: true,
      message:
        "تم تحديث حالة الطلب بنجاح.",
      order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "حالة الطلب غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Update order status error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء تحديث حالة الطلب.",
    });
  }
}

export async function assignCaptain(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const scopedReq =
      req as ScopedRequest;

    const data =
      assignCaptainSchema.parse(
        scopedReq.body,
      );

    if (
      !validId(data.captainId)
    ) {
      res.status(400).json({
        success: false,
        message:
          "معرف الكابتن غير صحيح.",
      });
      return;
    }

    const order =
      await OrderModel.findById(
        String(scopedReq.params.id),
      );

    if (!order) {
      res.status(404).json({
        success: false,
        message: "الطلب غير موجود.",
      });
      return;
    }

    const scope =
      await getOrderScope(
        order.establishmentId,
      );

    if (!scope) {
      res.status(404).json({
        success: false,
        message:
          "المنشأة المرتبطة بالطلب غير موجودة.",
      });
      return;
    }

    const scopeManagerAccess =
      canAccessOrder(
        scopedReq,
        scope.governorateId,
        scope.areaId,
      );

    const shopAccess =
      scopedReq.scopedUser?.role === "shop" &&
      !!(
        await EstablishmentModel.exists({
          _id: order.establishmentId,
          ownerUserId:
            new Types.ObjectId(
              scopedReq.scopedUser.id,
            ),
        })
      );

    if (!scopeManagerAccess && !shopAccess) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك إسناد طلب خارج نطاقك.",
      });
      return;
    }

    if (
      ![
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
      ].includes(order.status)
    ) {
      res.status(400).json({
        success: false,
        message:
          "لا يمكن إسناد كابتن بعد بدء تنفيذ التوصيل.",
      });
      return;
    }

    const captain =
      await UserModel.findOne({
        _id: data.captainId,
        role: "captain",
        status: "active",
      })
        .select(
          "_id fullName phone status governorateId areaId",
        )
        .lean();

    if (!captain) {
      res.status(404).json({
        success: false,
        message:
          "الكابتن غير موجود أو غير مفعل.",
      });
      return;
    }

    if (
      captain.governorateId?.toString() !==
      scope.governorateId
    ) {
      res.status(400).json({
        success: false,
        message:
          "الكابتن لا يتبع محافظة المنشأة.",
      });
      return;
    }

    if (
      captain.areaId?.toString() !==
      scope.areaId
    ) {
      res.status(400).json({
        success: false,
        message:
          "الكابتن لا يتبع منطقة المنشأة.",
      });
      return;
    }

    order.captainId =
      captain._id;

    if (
      order.status ===
      "ready_for_pickup"
    ) {
      order.status =
        "assigned";
      order.assignedAt =
        new Date();
    }

    await order.save();

    res.status(200).json({
      success: true,
      message:
        "تم إسناد الطلب للكابتن بنجاح.",
      order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات إسناد الكابتن غير صحيحة.",
        errors: error.issues,
      });
      return;
    }

    console.error(
      "Assign captain error:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "حدث خطأ أثناء إسناد الكابتن.",
    });
  }
}
