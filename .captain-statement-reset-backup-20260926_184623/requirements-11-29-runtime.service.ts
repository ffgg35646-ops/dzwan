import mongoose from "mongoose";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import { CaptainShiftModel } from "../models/CaptainShift.js";
import { CaptainWorkAreaModel } from "../models/CaptainWorkArea.js";
import CaptainCashTransactionModel from "../models/CaptainCashTransaction.js";
import CaptainRatingFinalModel from "../models/CaptainRatingFinal.js";
import ComplaintModel from "../models/Complaint.js";
import { OrderModel } from "../models/Order.js";
import { EstablishmentModel } from "../models/Establishment.js";
import { UserModel } from "../models/User.js";
import OrderTimelineModel from "../models/OrderTimeline.js";

export const ORDER_ACTIVE_STATUSES = [
  "assigned",
  "heading_to_shop",
  "arrived_at_shop",
  "picked_up",
  "on_the_way",
];

export const ORDER_FINAL_STATUSES = [
  "delivered",
  "cancelled",
  "rejected",
];

export function isWithinShift(
  start = "16:00",
  end = "00:00",
  now = new Date()
) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const current =
    now.getHours() * 60 +
    now.getMinutes();

  const s = sh * 60 + sm;
  const e = eh * 60 + em;

  if (s === e) return true;

  if (s < e) {
    return current >= s && current < e;
  }

  return current >= s || current < e;
}

export function assertWithinShift(
  start = "16:00",
  end = "00:00"
) {
  if (!isWithinShift(start, end)) {
    throw new Error("CAPTAIN_OUTSIDE_SHIFT");
  }
}

export async function getCaptainActiveOrders(
  captainId: string,
  excludingOrderId?: string
) {
  const filter: any = {
    captainId,
    claimedByCaptainAt: {
      $ne: null,
    },
    status: {
      $in: ORDER_ACTIVE_STATUSES,
    },
  };

  if (
    excludingOrderId &&
    mongoose.isValidObjectId(excludingOrderId)
  ) {
    filter._id = {
      $ne: excludingOrderId,
    };
  }

  return OrderModel.countDocuments(filter);
}

export async function assertCaptainCapacity(
  captainId: string,
  maxActiveOrders = 3,
  excludingOrderId?: string
) {
  const count =
    await getCaptainActiveOrders(
      captainId,
      excludingOrderId
    );

  if (count >= maxActiveOrders) {
    throw new Error(
      "CAPTAIN_ACTIVE_ORDER_LIMIT_REACHED"
    );
  }

  return {
    activeOrders: count,
    maxActiveOrders,
  };
}

export async function setCaptainOnline(
  captainId: string,
  online: boolean
) {
  const captain =
    await UserModel.findOneAndUpdate(
      {
        _id: captainId,
        role: "captain",
      },
      {
        $set: {
          isOnline: online,
        },
      },
      {
        new: true,
      }
    );

  if (!captain) {
    throw new Error("CAPTAIN_NOT_FOUND");
  }

  return captain;
}

export async function clockIn(
  captainId: string
) {
  const captainObjectId = new mongoose.Types.ObjectId(captainId);

  const now = new Date();

  // بداية الأسبوع الحالي: الإثنين 00:00
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  // نهاية الأسبوع الحالي
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // نجيب الشفت الذي اختاره الكابتن لهذا الأسبوع
  const assignment = await CaptainShiftModel.findOne({
    captainId: captainObjectId,
    shiftId: { $exists: true },
    weekStart: {
      $gte: weekStart,
      $lt: weekEnd,
    },
  });

  if (!assignment) {
    throw new Error("CAPTAIN_HAS_NO_WEEKLY_SHIFT");
  }

  // نجيب الشفت الأساسي نفسه
  const shift = await CaptainShiftModel.findOne({
    _id: assignment.shiftId,
    isActive: true,
  });

  if (!shift) {
    throw new Error("CAPTAIN_SHIFT_INACTIVE");
  }

  // ممنوع تسجيل الحضور خارج وقت الشفت
  assertWithinShift(
    String(shift.startTime),
    String(shift.endTime)
  );

  const date = new Date(now);
  date.setHours(0, 0, 0, 0);

  const existing =
    await CaptainAttendanceModel.findOne({
      captainId,
      date,
    });

  if (existing?.clockInAt) {
    throw new Error("ALREADY_CLOCKED_IN");
  }

  return CaptainAttendanceModel.findOneAndUpdate(
    {
      captainId,
      date,
    },
    {
      $set: {
        shiftId: assignment.shiftId,
        clockInAt: now,
        status: "present",
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
}

export async function clockOut(
  captainId: string
) {
  const date = new Date();
  date.setHours(0,0,0,0);

  const attendance =
    await CaptainAttendanceModel.findOne({
      captainId,
      date,
    });

  if (!attendance?.clockInAt) {
    throw new Error("NOT_CLOCKED_IN");
  }

  if (attendance.clockOutAt) {
    return attendance;
  }

  const now = new Date();

  attendance.clockOutAt = now;
  attendance.durationMinutes =
    Math.max(
      0,
      Math.floor(
        (now.getTime() -
          attendance.clockInAt.getTime()) /
          60000
      )
    );
  attendance.status = "closed";

  await attendance.save();

  return attendance;
}


export async function autoCloseExpiredCaptainAttendance(
  now = new Date(),
) {
  const openRows =
    await CaptainAttendanceModel.find({
      status: "present",
      clockInAt: { $ne: null },
      clockOutAt: null,
      shiftId: { $ne: null },
    }).select(
      "_id captainId shiftId clockInAt clockOutAt status date",
    );

  let closedCount = 0;

  for (const attendance of openRows) {
    const shift =
      await CaptainShiftModel.findOne({
        _id: attendance.shiftId,
        isActive: true,
      }).lean();

    if (!shift) {
      continue;
    }

    const toMinutes = (value: string) => {
      const [hours, minutes] =
        String(value).split(":").map(Number);

      return hours * 60 + minutes;
    };

    const startMinutes =
      toMinutes(String(shift.startTime));

    const endMinutes =
      toMinutes(String(shift.endTime));

    const endAt = new Date(attendance.date);
    endAt.setHours(0, 0, 0, 0);

    const endDayOffset =
      endMinutes <= startMinutes ? 1 : 0;

    endAt.setDate(
      endAt.getDate() + endDayOffset,
    );

    endAt.setHours(
      Math.floor(endMinutes / 60),
      endMinutes % 60,
      0,
      0,
    );

    if (now.getTime() < endAt.getTime()) {
      continue;
    }

    const clockInAt =
      attendance.clockInAt
        ? new Date(attendance.clockInAt)
        : endAt;

    attendance.clockOutAt =
      endAt.getTime() < clockInAt.getTime()
        ? clockInAt
        : endAt;

    attendance.durationMinutes =
      Math.max(
        0,
        Math.floor(
          (
            attendance.clockOutAt.getTime() -
            clockInAt.getTime()
          ) / 60000,
        ),
      );

    attendance.status = "closed";

    await attendance.save();

    closedCount += 1;
  }

  return { closedCount };
}

export async function saveOrderEvent(
  orderId: string,
  event: string,
  input: any = {}
) {
  return OrderTimelineModel.create({
    orderId,
    event,
    status: input.status ?? null,
    actorId:
      input.actorId &&
      mongoose.isValidObjectId(input.actorId)
        ? input.actorId
        : null,
    captainId:
      input.captainId &&
      mongoose.isValidObjectId(input.captainId)
        ? input.captainId
        : null,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function getTimeline(
  orderId: string
) {
  return OrderTimelineModel.find({
    orderId,
  })
    .sort({ createdAt: 1 })
    .lean();
}

export async function saveCash(
  captainId: string,
  orderId: string,
  paidEstablishment: number,
  collectedCustomer: number
) {
  const rows = [];

  if (paidEstablishment > 0) {
    rows.push({
      captainId,
      orderId,
      type: "paid_establishment",
      amount: paidEstablishment,
    });
  }

  if (collectedCustomer > 0) {
    rows.push({
      captainId,
      orderId,
      type: "collected_customer",
      amount: collectedCustomer,
    });
  }

  if (!rows.length) return [];

  return CaptainCashTransactionModel.insertMany(
    rows
  );
}

export async function getCashStatement(
  captainId: string,
  start?: Date,
  end?: Date
) {
  const filter: any = {
    captainId,
  };

  if (start || end) {
    filter.createdAt = {};
    if (start)
      filter.createdAt.$gte = start;
    if (end)
      filter.createdAt.$lt = end;
  }

  const rows =
    await CaptainCashTransactionModel.find(
      filter
    ).lean();

  const paid =
    rows
      .filter(
        x =>
          x.type ===
          "paid_establishment"
      )
      .reduce(
        (s,x) => s + Number(x.amount || 0),
        0
      );

  const collected =
    rows
      .filter(
        x =>
          x.type ===
          "collected_customer"
      )
      .reduce(
        (s,x) => s + Number(x.amount || 0),
        0
      );

  return {
    orders: new Set(
      rows.map(x => String(x.orderId))
    ).size,
    paidToEstablishments: paid,
    collectedFromCustomers: collected,
    deliveryFees:
      collected - paid,
    rows,
  };
}

export async function rateCaptain(
  orderId: string,
  captainId: string,
  establishmentId: string,
  stars: number,
  review?: string
) {
  if (
    !Number.isInteger(stars) ||
    stars < 1 ||
    stars > 5
  ) {
    throw new Error("INVALID_RATING");
  }

  const existing =
    await CaptainRatingFinalModel.findOne({ orderId });

  if (existing) {
    throw new Error("RATING_ALREADY_EXISTS");
  }

  return CaptainRatingFinalModel.create({
    orderId,
    captainId,
    establishmentId,
    stars,
    review:
      review?.trim() || null,
  });
}

export async function captainRating(
  captainId: string
) {
  const result =
    await CaptainRatingFinalModel.aggregate([
      {
        $match: {
          captainId:
            new mongoose.Types.ObjectId(
              captainId
            ),
        },
      },
      {
        $group: {
          _id: null,
          average: {
            $avg: "$stars",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

  return {
    average:
      Number(
        result[0]?.average || 0
      ),
    count:
      Number(
        result[0]?.count || 0
      ),
  };
}

export async function createComplaint(
  input: any
) {
  return ComplaintModel.create(input);
}

export async function getComplaint(
  id: string
) {
  const complaint =
    await ComplaintModel.findById(id).lean();

  if (!complaint) {
    return null;
  }

  const [
    order,
    captain,
    establishment,
    openedBy,
    againstUser,
    assignedTo,
  ] = await Promise.all([
    complaint.orderId
      ? OrderModel.findById(
          complaint.orderId
        )
          .select(
            "_id orderNumber status customerId customerName customerPhone customerNote deliveryAddress deliveryGovernorateId deliveryAreaId subtotal deliveryFee total createdAt assignedAt pickedUpAt deliveredAt"
          )
          .populate(
            "customerId",
            "_id fullName name phone email"
          )
          .lean()
      : null,

    complaint.captainId
      ? UserModel.findById(
          complaint.captainId,
          {
            _id: 1,
            fullName: 1,
            phone: 1,
            email: 1,
            role: 1,
            status: 1,
          }
        ).lean()
      : null,

    complaint.establishmentId
      ? EstablishmentModel.findById(
          complaint.establishmentId
        ).lean()
      : null,

    complaint.openedBy
      ? UserModel.findById(
          complaint.openedBy,
          {
            _id: 1,
            fullName: 1,
            phone: 1,
            email: 1,
            role: 1,
            status: 1,
          }
        ).lean()
      : null,

    complaint.againstUserId
      ? UserModel.findById(
          complaint.againstUserId,
          {
            _id: 1,
            fullName: 1,
            phone: 1,
            email: 1,
            role: 1,
            status: 1,
          }
        ).lean()
      : null,

    complaint.assignedTo
      ? UserModel.findById(
          complaint.assignedTo,
          {
            _id: 1,
            fullName: 1,
            phone: 1,
            email: 1,
            role: 1,
            status: 1,
          }
        ).lean()
      : null,
  ]);

  return {
    ...complaint,
    order,
    captain,
    establishment,
    openedBy,
    againstUser,
    assignedTo,
  };
}

export async function getCaptainWorkAreas(
  captainId: string
) {
  return CaptainWorkAreaModel.find({
    captainId,
    isActive: true,
  })
    .populate("governorateId", "name")
    .lean();
}
