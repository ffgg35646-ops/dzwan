import mongoose, { Types } from "mongoose";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { OrderModel } from "../models/Order.js";
import Core11OrderStateModel from "../models/Core11OrderState.js";
import { UserModel } from "../models/User.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { DispatchSettingsModel } from "../models/DispatchSettings.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import {
  captainCanWorkNow,
} from "../services/dispatch.service.js";
import {
  getCaptainActiveOrders,
  getCaptainWorkAreas,
  isWithinShift,
} from "../services/requirements-11-29-runtime.service.js";
import { saveCancellation } from "../services/ops-31-47.service.js";

const ACTIVE_STATUSES = [
  "assigned",
  "heading_to_shop",
  "arrived_at_shop",
  "picked_up",
  "on_the_way",
];

const REJECTABLE_STATUSES = [
  "assigned",
  "heading_to_shop",
  "arrived_at_shop",
];

const CaptainOrderModel = OrderModel as any;

const AVAILABLE_STATUSES = [
  "pending",
  "ready_for_pickup",
];

function getCaptainId(req: AuthenticatedRequest): string | null {
  const scope = (req as any).scopedUser;

  if (
    !scope ||
    scope.role !== "captain" ||
    !scope.id
  ) {
    return null;
  }

  return String(scope.id);
}

function validObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value);
}

async function isCaptainInsideSelectedWeeklyShift(
  captainId: string,
) {
  const now = new Date();

  // نفس منطق تسجيل الحضور:
  // تعيين الشفت قد يكون محفوظًا بتاريخ اختيار الكابتن،
  // لذلك نبحث في آخر 7 أيام.
  const assignmentWindowStart =
    new Date(
      now.getTime() -
        7 * 24 * 60 * 60 * 1000,
    );

  // نجيب اختيار الكابتن لهذا الأسبوع
  const assignment =
    await CaptainShiftModel.findOne({
      captainId:
        new Types.ObjectId(captainId),
      shiftId: {
        $exists: true,
        $ne: null,
      },
      weekStart: {
        $gt: assignmentWindowStart,
        $lte: now,
      },
    })
      .sort({
        updatedAt: -1,
      })
      .lean();

  if (!assignment?.shiftId) {
    return false;
  }

  // نجيب الشفت نفسه
  const shift =
    await CaptainShiftModel.findOne({
      _id: assignment.shiftId,
      isActive: true,
    })
      .select(
        "startTime endTime isOpen",
      )
      .lean();

  if (!shift) {
    return false;
  }

  if (shift.isOpen === true) {
    return true;
  }

  return isWithinShift(
    String(shift.startTime),
    String(shift.endTime),
    now,
  );
}

async function getCaptainScopeData(captainId: string) {
  const captain = await UserModel.findOne({
    _id: new Types.ObjectId(captainId),
    role: "captain",
  })
    .select(
      "_id fullName phone status isOnline operationalEnabled governorateId areaId"
    )
    .lean();

  if (!captain) {
    return {
      captain: null,
      areaIds: [],
      governorateIds: [],
    };
  }

  const workAreas =
    await getCaptainWorkAreas(captainId).catch(() => []);

  const areaIds = Array.from(
    new Set(
      (Array.isArray(workAreas) ? workAreas : [])
        .filter(
          (item: any) =>
            item?.isActive !== false
        )
        .flatMap((item: any) => [
          item?.areaId,
          item?.area?._id,
        ])
        .filter(Boolean)
        .map(String)
    )
  );

  const governorateIds = Array.from(
    new Set(
      (Array.isArray(workAreas) ? workAreas : [])
        .filter(
          (item: any) =>
            item?.isActive !== false
        )
        .flatMap((item: any) => [
          item?.governorateId,
          item?.governorate?._id,
        ])
        .filter(Boolean)
        .map(String)
    )
  );

  if (captain.areaId) {
    areaIds.push(String(captain.areaId));
  }

  if (captain.governorateId) {
    governorateIds.push(
      String(captain.governorateId)
    );
  }

  return {
    captain,
    areaIds: Array.from(new Set(areaIds)),
    governorateIds: Array.from(
      new Set(governorateIds)
    ),
  };
}

function buildAvailableLocationFilter(
  areaIds: string[],
  governorateIds: string[],
) {
  if (areaIds.length > 0) {
    return {
      deliveryAreaId: {
        $in: areaIds.map(
          (id) => new Types.ObjectId(id)
        ),
      },
    };
  }

  if (governorateIds.length > 0) {
    return {
      deliveryGovernorateId: {
        $in: governorateIds.map(
          (id) => new Types.ObjectId(id)
        ),
      },
    };
  }

  // مهم: لا نعرض للكابتن كل طلبات العراق
  // إذا لم يكن لديه نطاق عمل معروف.
  return null;
}


async function attachCaptainCustomerSnapshots(
  orders: any[],
) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return orders;
  }

  const ids = orders
    .map((order) => order?._id)
    .filter(Boolean);

  if (ids.length === 0) {
    return orders;
  }

  const states = await Core11OrderStateModel.find({
    orderId: { $in: ids },
  })
    .select("orderId customerSnapshot")
    .lean();

  const byOrder = new Map(
    states.map((state: any) => [
      String(state.orderId),
      state.customerSnapshot,
    ]),
  );

  for (const order of orders) {
    const snapshot = byOrder.get(
      String(order._id),
    );

    if (!snapshot) {
      continue;
    }

    order.customerSnapshot = snapshot;

    order.customerName =
      snapshot.name || order.customerName || "";

    order.customerPhone =
      snapshot.phone || order.customerPhone || "";

    order.deliveryAddress =
      snapshot.addressText ||
      order.deliveryAddress ||
      "";
  }

  return orders;
}

async function attachCaptainOrderLocationNames(
  orders: any[],
) {
  const { LocationModel } =
    await import("../models/Location.js");

  const governorateIds = Array.from(
    new Set(
      orders.flatMap((order) => {
        const ids: string[] = [];

        if (validObjectId(String(order?.deliveryGovernorateId || ""))) {
          ids.push(String(order.deliveryGovernorateId));
        }

        const establishment =
          order?.establishmentId &&
          typeof order.establishmentId === "object"
            ? order.establishmentId
            : null;

        if (
          validObjectId(
            String(establishment?.governorateId || ""),
          )
        ) {
          ids.push(String(establishment.governorateId));
        }

        return ids;
      }),
    ),
  );

  const locations =
    governorateIds.length > 0
      ? await LocationModel.find({
          _id: {
            $in: governorateIds.map(
              (id) => new Types.ObjectId(id),
            ),
          },
        })
          .select("_id name areas")
          .lean()
      : [];

  const governorateMap = new Map(
    locations.map((location: any) => [
      String(location._id),
      String(location.name || ""),
    ]),
  );

  const areaMap = new Map<string, string>();

  for (const location of locations as any[]) {
    for (const area of Array.isArray(location.areas)
      ? location.areas
      : []) {
      areaMap.set(
        String(area._id),
        String(area.name || ""),
      );
    }
  }

  for (const order of orders) {
    const establishment =
      order?.establishmentId &&
      typeof order.establishmentId === "object"
        ? order.establishmentId
        : null;

    order.establishmentGovernorateName =
      governorateMap.get(
        String(establishment?.governorateId || ""),
      ) || "";

    order.establishmentAreaName =
      areaMap.get(
        String(establishment?.areaId || ""),
      ) || "";

    order.deliveryGovernorateName =
      governorateMap.get(
        String(order?.deliveryGovernorateId || ""),
      ) || "";

    order.deliveryAreaName =
      areaMap.get(
        String(order?.deliveryAreaId || ""),
      ) || "";

    order.customerGovernorateName =
      order.deliveryGovernorateName;

    order.customerAreaName =
      order.deliveryAreaName;

    order.pickupGovernorateName =
      order.establishmentGovernorateName;

    order.pickupAreaName =
      order.establishmentAreaName;
  }

  return orders;
}

function serializeOrder(order: any) {
  const customer =
    order?.customerId &&
    typeof order.customerId === "object"
      ? order.customerId
      : null;

  const establishment =
    order?.establishmentId &&
    typeof order.establishmentId === "object"
      ? order.establishmentId
      : null;

  return {
    ...order,
    id: String(order?._id || ""),
    customerName:
      order?.customerName ||
      customer?.fullName ||
      customer?.name ||
      "العميل",
    customerPhone:
      order?.customerPhone ||
      customer?.phone ||
      "",
    establishmentName:
      order?.establishmentName ||
      establishment?.name ||
      "المطعم / المتجر",
    restaurantName:
      order?.restaurantName ||
      establishment?.name ||
      "",
    shopName:
      order?.shopName ||
      establishment?.name ||
      "",
  };
}


export async function getCaptainOrderBoard(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = getCaptainId(req);

    if (
      !captainId ||
      !validObjectId(captainId)
    ) {
      res.status(403).json({
        success: false,
        message:
          "هذا المسار مخصص للكابتن فقط.",
      });
      return;
    }

    const settings =
      await DispatchSettingsModel.findOne()
        .select("maxActiveOrdersPerCaptain")
        .lean();

    const maxActiveOrders =
      Number(
        settings?.maxActiveOrdersPerCaptain
      ) > 0
        ? Number(
            settings?.maxActiveOrdersPerCaptain
          )
        : 3;

    const activeRaw =
      await CaptainOrderModel.find({
        captainId:
          new Types.ObjectId(captainId),
        claimedByCaptainAt: {
          $ne: null,
        },
        status: {
          $in: ACTIVE_STATUSES,
        },
      })
        .select(
          "_id orderNumber status customerId establishmentId deliveryAddress deliveryGovernorateId deliveryAreaId addressId items subtotal deliveryFee total customerNote createdAt assignedAt pickedUpAt"
        )
        .populate(
          "customerId",
          "_id fullName name phone"
        )
        .populate(
          "establishmentId",
          "_id name type phone address latitude longitude governorateId areaId"
        )
        .sort({
          createdAt: -1,
        })
        .limit(maxActiveOrders)
        .lean();

    const {
      captain,
      areaIds,
      governorateIds,
    } =
      await getCaptainScopeData(captainId);

    if (!captain) {
      res.status(404).json({
        success: false,
        message:
          "الكابتن غير موجود.",
      });
      return;
    }

    const requestedAreaId =
      String(req.query?.areaId || "").trim();

    const selectedAreaAllowed =
      Boolean(
        requestedAreaId &&
        validObjectId(requestedAreaId) &&
        areaIds.some(
          (id: any) =>
            String(id) === requestedAreaId
        )
      );

    // الطلبات المتاحة للكابتن تعتمد على المنطقة الجغرافية
    // المكتوبة في الطلب نفسه: محافظة التسليم + منطقة التسليم.
    // أي طلب خارج مناطق العمل النشطة للكابتن لا يظهر له.
    const captainWorkAreas =
      await getCaptainWorkAreas(captainId).catch(() => []);

    const orderScopePairs =
      (Array.isArray(captainWorkAreas)
        ? captainWorkAreas
            .filter((item: any) => item?.isActive !== false)
            .map((item: any) => ({
              areaId:
                item?.areaId?._id ??
                item?.area?._id ??
                item?.areaId,
              governorateId:
                item?.governorateId?._id ??
                item?.governorate?._id ??
                item?.governorateId,
            }))
        : []
      ).filter(
        (item: any) =>
          validObjectId(String(item?.areaId || "")) &&
          validObjectId(String(item?.governorateId || ""))
      );

    const scopedPairs = selectedAreaAllowed
      ? orderScopePairs.filter(
          (item: any) =>
            String(item.areaId) === requestedAreaId
        )
      : orderScopePairs;

    const locationFilter =
      scopedPairs.length > 0
        ? {
            $or: scopedPairs.map((pair: any) => ({
              deliveryGovernorateId: new Types.ObjectId(
                String(pair.governorateId)
              ),
              deliveryAreaId: new Types.ObjectId(
                String(pair.areaId)
              ),
            })),
          }
        : null;

    // لا نستقبل طلبات جديدة إلا بعد اختيار شفت هذا الأسبوع
    // وداخل وقت الشفت المختار.
    const insideSelectedShift =
      await isCaptainInsideSelectedWeeklyShift(
        captainId,
      );

    let availableRaw: any[] = [];

    if (
      locationFilter &&
      insideSelectedShift
    ) {
      availableRaw =
        await CaptainOrderModel.find({
          ...locationFilter,
          captainId: null,
          status: {
            $in: AVAILABLE_STATUSES,
          },
        })
          .select(
            "_id orderNumber status customerId customerName customerPhone establishmentId deliveryAddress deliveryGovernorateId deliveryAreaId addressId items subtotal deliveryFee total customerNote createdAt"
          )
          .populate(
            "customerId",
            "_id fullName name phone"
          )
          .populate(
            "establishmentId",
            "_id name type phone address latitude longitude governorateId areaId"
          )
          .sort({
            createdAt: 1,
          })
          .limit(20)
          .lean();
    }

    const allCaptainOrders = [
      ...activeRaw,
      ...availableRaw,
    ];

    await attachCaptainCustomerSnapshots(
      allCaptainOrders,
    );

    await attachCaptainOrderLocationNames(
      allCaptainOrders,
    );

    res.status(200).json({
      success: true,
      maxActiveOrders,
      activeOrders:
        activeRaw.map(serializeOrder),
      activeOrdersCount: activeRaw.length,
      availableOrders:
        availableRaw.map(serializeOrder),
      availableOrdersCount:
        availableRaw.length,
      insideShift:
        insideSelectedShift,
    });
  } catch (error: any) {
    console.error(
      "getCaptainOrderBoard error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error?.message ||
        "تعذر تحميل طلبات الكابتن حاليًا.",
    });
  }
}


export async function claimCaptainOrder(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = getCaptainId(req);

  if (
    !captainId ||
    !validObjectId(captainId)
  ) {
    res.status(403).json({
      success: false,
      message:
        "هذا المسار مخصص للكابتن فقط.",
    });
    return;
  }

  const orderId = String(
    req.params.id || ""
  );

  if (!validObjectId(orderId)) {
    res.status(400).json({
      success: false,
      message:
        "معرف الطلب غير صحيح.",
    });
    return;
  }

  try {
    const {
      captain,
      areaIds,
      governorateIds,
    } =
      await getCaptainScopeData(captainId);

    if (!captain) {
      res.status(404).json({
        success: false,
        message:
          "الكابتن غير موجود.",
      });
      return;
    }

    if (captain.status !== "active") {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك حجز الطلب حاليًا.",
      });
      return;
    }

    if (
      captain.operationalEnabled === false
    ) {
      res.status(403).json({
        success: false,
        message:
          "التشغيل غير متاح لحسابك حاليًا.",
      });
      return;
    }

    if (captain.isOnline === false) {
      res.status(403).json({
        success: false,
        message:
          "يجب تشغيل حالة الاستعداد أولًا لحجز الطلب.",
      });
      return;
    }

    // نفس فحص الشفت المستخدم لعرض الطلبات:
    // الشفت المختار + الوقت داخل بداية/نهاية الشفت.
    const canWork =
      await isCaptainInsideSelectedWeeklyShift(
        captainId,
      );

    if (!canWork) {
      res.status(403).json({
        success: false,
        message:
          "لا يمكنك حجز الطلب خارج الشفت.",
      });
      return;
    }

    const settings =
      await DispatchSettingsModel.findOne()
        .select("maxActiveOrdersPerCaptain")
        .lean();

    const maxActiveOrders =
      Number(
        settings?.maxActiveOrdersPerCaptain
      ) > 0
        ? Number(
            settings?.maxActiveOrdersPerCaptain
          )
        : 3;

    // الحجز يستخدم نفس منطق Board:
    // منطقة الطلب نفسها يجب أن تكون ضمن مناطق العمل النشطة للكابتن.
    const captainWorkAreas =
      await getCaptainWorkAreas(captainId).catch(() => []);

    const orderScopePairs =
      (Array.isArray(captainWorkAreas)
        ? captainWorkAreas
            .filter((item: any) => item?.isActive !== false)
            .map((item: any) => ({
              areaId:
                item?.areaId?._id ??
                item?.area?._id ??
                item?.areaId,
              governorateId:
                item?.governorateId?._id ??
                item?.governorate?._id ??
                item?.governorateId,
            }))
        : []
      ).filter(
        (item: any) =>
          validObjectId(String(item?.areaId || "")) &&
          validObjectId(String(item?.governorateId || ""))
      );

    if (orderScopePairs.length === 0) {
      res.status(403).json({
        success: false,
        message:
          "لا توجد منطقة عمل محددة لهذا الكابتن.",
      });
      return;
    }

    const session =
      await mongoose.startSession();

    let claimedOrder: any = null;

    try {
      await session.withTransaction(
        async () => {
          /*
           * نكتب على مستند الكابتن داخل المعاملة
           * حتى تتصادم محاولات الحجز المتزامنة
           * للكابتن نفسه بدل أن يتجاوز العدد 3.
           */
          await UserModel.updateOne(
            {
              _id:
                new Types.ObjectId(
                  captainId
                ),
              role: "captain",
            },
            {
              $set: {
                lastSeenAt: new Date(),
              },
            },
            {
              session,
            }
          );

          const activeCount =
            await getCaptainActiveOrders(
              captainId
            );

          if (
            activeCount >=
            maxActiveOrders
          ) {
            const error =
              new Error(
                "CAPTAIN_ACTIVE_ORDER_LIMIT_REACHED"
              );

            throw error;
          }

          const candidateOrder =
            await (OrderModel as any)
              .findOne(
                {
                  _id:
                    new Types.ObjectId(
                      orderId
                    ),
                  captainId: null,
                  status: {
                    $in: AVAILABLE_STATUSES,
                  },
                },
                null,
                { session }
              );

          if (!candidateOrder) {
            const error =
              new Error(
                "ORDER_NO_LONGER_AVAILABLE"
              );

            throw error;
          }

          const orderGovernorateId =
            String(
              candidateOrder.deliveryGovernorateId || ""
            );

          const orderAreaId =
            String(
              candidateOrder.deliveryAreaId || ""
            );

          const orderAllowed =
            orderScopePairs.some(
              (pair: any) =>
                String(pair.governorateId) ===
                  orderGovernorateId &&
                String(pair.areaId) ===
                  orderAreaId
            );

          if (!orderAllowed) {
            const error =
              new Error(
                "ORDER_NO_LONGER_AVAILABLE"
              );

            throw error;
          }

          const customerState =
            await Core11OrderStateModel.findOne({
              orderId: candidateOrder._id,
            })
              .select("customerSnapshot")
              .session(session)
              .lean();

          const customerSnapshot =
            (customerState as any)?.customerSnapshot;

          if (!candidateOrder.customerName) {
            candidateOrder.customerName =
              customerSnapshot?.name ||
              "";
          }

          if (!candidateOrder.customerPhone) {
            candidateOrder.customerPhone =
              customerSnapshot?.phone ||
              "";
          }

          candidateOrder.captainId =
            new Types.ObjectId(captainId);

          candidateOrder.claimedByCaptainAt =
            new Date();

          candidateOrder.status =
            "assigned";

          candidateOrder.assignedAt =
            new Date();

          claimedOrder =
            await candidateOrder.save({
              session,
            });

          await claimedOrder.populate([
            {
              path: "customerId",
              select: "_id fullName name phone",
            },
            {
              path: "establishmentId",
              select:
                "_id name type phone address latitude longitude governorateId areaId",
            },
          ]);
        }
      );
    } finally {
      await session.endSession();
    }

    res.status(200).json({
      success: true,
      message:
        "تم حجز الطلب بنجاح.",
      order:
        serializeOrder(
          claimedOrder?.toObject
            ? claimedOrder.toObject()
            : claimedOrder
        ),
    });
  } catch (error: any) {
    const code = String(
      error?.message || ""
    );

    if (
      code ===
      "CAPTAIN_ACTIVE_ORDER_LIMIT_REACHED"
    ) {
      res.status(409).json({
        success: false,
        message:
          `لديك ${3} طلبات نشطة بالفعل. أكمل أحد الطلبات الحالية أولًا.`,
      });
      return;
    }

    if (
      code ===
      "ORDER_NO_LONGER_AVAILABLE"
    ) {
      res.status(409).json({
        success: false,
        message:
          "الطلب لم يعد متاحًا. ربما قام كابتن آخر بحجزه بالفعل.",
      });
      return;
    }

    console.error(
      "claimCaptainOrder error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "تعذر حجز الطلب حاليًا.",
    });
  }
}


export async function rejectCaptainOrder(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = getCaptainId(req);

    if (
      !captainId ||
      !validObjectId(captainId)
    ) {
      res.status(403).json({
        success: false,
        message:
          "هذا المسار مخصص للكابتن فقط.",
      });
      return;
    }

    const orderId = String(
      req.params.id || ""
    );

    if (!validObjectId(orderId)) {
      res.status(400).json({
        success: false,
        message:
          "معرف الطلب غير صحيح.",
      });
      return;
    }

    const reason = String(
      req.body?.reason || ""
    ).trim();

    if (reason.length < 3) {
      res.status(400).json({
        success: false,
        message:
          "سبب رفض الطلب إجباري.",
      });
      return;
    }

    const order =
      await CaptainOrderModel.findOne({
        _id:
          new Types.ObjectId(orderId),
        captainId:
          new Types.ObjectId(captainId),
        status: {
          $in: REJECTABLE_STATUSES,
        },
      });

    if (!order) {
      res.status(404).json({
        success: false,
        message:
          "لا يمكن رفض هذا الطلب من قائمة الطلبات النشطة.",
      });
      return;
    }

    order.status = "cancelled";
    order.captainId = null;
    order.cancellationReason =
      reason;
    order.cancelledAt = new Date();

    await order.save();

    await saveCancellation({
      orderId: order._id,
      cancelledBy: new Types.ObjectId(
        captainId,
      ),
      cancelledByRole: "captain",
      reason,
    });

    res.status(200).json({
      success: true,
      message:
        "تم إلغاء الطلب وإزالة إسناده من الكابتن.",
      order: {
        _id: order._id,
        orderNumber:
          order.orderNumber,
        status:
          order.status,
        cancellationReason:
          order.cancellationReason,
      },
    });
  } catch (error: any) {
    console.error(
      "rejectCaptainOrder error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "تعذر رفض الطلب حاليًا.",
    });
  }
}
