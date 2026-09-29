
import { Request, Response } from "express";
import { Types } from "mongoose";
import { SupportTicketModel } from "../models/SupportTicket.js";

function user(req: Request): any {
  return (req as any).user || {};
}

function uid(req: Request) {
  return String(
    user(req)?.sub ||
    user(req)?.userId ||
    user(req)?._id ||
    user(req)?.id ||
    "",
  );
}

function role(req: Request) {
  return String(
    user(req)?.role || "",
  ).toLowerCase();
}

function admin(req: Request) {
  return [
    "admin",
    "super_admin",
    "governorate_leader",
    "area_leader",
  ].includes(role(req));
}

async function nextNumber() {
  const latest =
    await SupportTicketModel.findOne(
      {},
      { ticketNumber: 1 },
    )
      .sort({ createdAt: -1 })
      .lean();

  const match = String(
    latest?.ticketNumber || "",
  ).match(/T-(\d+)$/);

  const next = match
    ? Number(match[1]) + 1
    : 1001;

  return `T-${next}`;
}

function sourceFromRole(value: string) {
  if (value === "captain") return "captain";
  if (
    value === "shop" ||
    value === "restaurant"
  ) {
    return "shop";
  }

  return null;
}

export async function createSupportTicket(
  req: Request,
  res: Response,
) {
  try {
    const openedBy = uid(req);
    const source = sourceFromRole(role(req));

    if (
      !openedBy ||
      !Types.ObjectId.isValid(openedBy)
    ) {
      return res.status(401).json({
        message: "يجب تسجيل الدخول.",
      });
    }

    if (!source) {
      return res.status(403).json({
        message:
          "هذا الحساب لا يمكنه إنشاء تذكرة دعم.",
      });
    }

    const type = String(
      req.body?.type || "",
    ).toLowerCase();

    const title = String(
      req.body?.title || "",
    ).trim();

    const description = String(
      req.body?.description || "",
    ).trim();

    const orderReference = String(
      req.body?.orderId || "",
    ).trim();

    if (
      type !== "complaint" &&
      type !== "emergency"
    ) {
      return res.status(400).json({
        message: "نوع التذكرة غير صحيح.",
      });
    }

    if (title.length < 2) {
      return res.status(400).json({
        message: "موضوع التذكرة مطلوب.",
      });
    }

    if (description.length < 2) {
      return res.status(400).json({
        message: "تفاصيل التذكرة مطلوبة.",
      });
    }

    const ticketNumber =
      await nextNumber();

    const ticket =
      await SupportTicketModel.create({
        ticketNumber,
        openedBy,
        source,
        type,
        title,
        description,
        orderReference,
        status: "open",
        messages: [
          {
            senderId: openedBy,
            senderRole: role(req),
            body: description,
          },
        ],
      });

    return res.status(201).json({
      ticket,
    });
  } catch (error: any) {
    console.error(
      "createSupportTicket:",
      error,
    );

    return res.status(500).json({
      message:
        error?.message ||
        "تعذر إنشاء التذكرة.",
    });
  }
}

export async function listMySupportTickets(
  req: Request,
  res: Response,
) {
  const openedBy = uid(req);
  const currentRole = role(req);

  console.log(
    "SUPPORT LIST AUTH:",
    {
      user: user(req),
      openedBy,
      currentRole,
      validObjectId: Types.ObjectId.isValid(openedBy),
    },
  );

  if (!openedBy || !Types.ObjectId.isValid(openedBy)) {
    return res.status(401).json({
      success: false,
      message: "تعذر تحديد صاحب حساب الدعم.",
      debug: {
        openedBy,
        currentRole,
        user: user(req),
      },
    });
  }

  const tickets =
    await SupportTicketModel.find({
      openedBy,
    })
      .sort({
        lastMessageAt: -1,
      })
      .lean();

  return res.json({ tickets });
}

export async function getMySupportTicket(
  req: Request,
  res: Response,
) {
  const openedBy = uid(req);

  const ticket =
    await SupportTicketModel.findOne({
      _id: req.params.id,
      openedBy,
    }).lean();

  if (!ticket) {
    return res.status(404).json({
      message: "التذكرة غير موجودة.",
    });
  }

  return res.json({ ticket });
}

export async function addMySupportMessage(
  req: Request,
  res: Response,
) {
  const openedBy = uid(req);

  const body = String(
    req.body?.body || "",
  ).trim();

  if (!openedBy || !Types.ObjectId.isValid(openedBy)) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول.",
    });
  }

  if (!body) {
    return res.status(400).json({
      message: "الرسالة مطلوبة.",
    });
  }

  const ticket =
    await SupportTicketModel.findOne({
      _id: req.params.id,
      openedBy,
    });

  if (!ticket) {
    return res.status(404).json({
      message: "التذكرة غير موجودة.",
    });
  }

  const senderRole = role(req);

  ticket.messages.push({
    senderId: new Types.ObjectId(openedBy),
    senderRole,
    body,
    createdAt: new Date(),
  } as any);

  ticket.lastMessageAt = new Date();
  ticket.lastMessageSenderRole = senderRole;

  // المستخدم يرد الآن، إذن هو شاهد الردود السابقة.
  ticket.userLastReadAt = new Date();

  await ticket.save();

  return res.json({
    ticket,
  });
}


export async function getMySupportUnreadCount(
  req: Request,
  res: Response,
) {
  const openedBy = uid(req);

  if (
    !openedBy ||
    !Types.ObjectId.isValid(openedBy)
  ) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول.",
    });
  }

  const tickets =
    await SupportTicketModel.find({
      openedBy,
    })
      .select(
        "messages userLastReadAt",
      )
      .lean();

  const adminRoles = new Set([
    "admin",
    "super_admin",
    "governorate_leader",
    "area_leader",
  ]);

  let count = 0;

  for (const ticket of tickets as any[]) {
    const readAt = ticket.userLastReadAt
      ? new Date(ticket.userLastReadAt).getTime()
      : 0;

    const messages = Array.isArray(
      ticket.messages,
    )
      ? ticket.messages
      : [];

    for (const message of messages) {
      const senderRole = String(
        message?.senderRole || "",
      ).toLowerCase();

      const createdAt = message?.createdAt
        ? new Date(message.createdAt).getTime()
        : 0;

      if (
        adminRoles.has(senderRole) &&
        createdAt > readAt
      ) {
        count += 1;
      }
    }
  }

  return res.json({
    count,
    message:
      count === 1
        ? "لديك رسالة جديدة في الدعم السريع"
        : `لديك ${count} رسائل جديدة في الدعم السريع`,
  });
}


export async function markMySupportTicketRead(
  req: Request,
  res: Response,
) {
  const openedBy = uid(req);

  if (!openedBy || !Types.ObjectId.isValid(openedBy)) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول.",
    });
  }

  const ticket =
    await SupportTicketModel.findOneAndUpdate(
      {
        _id: req.params.id,
        openedBy,
      },
      {
        $set: {
          userLastReadAt: new Date(),
        },
      },
      {
        new: true,
      },
    ).lean();

  if (!ticket) {
    return res.status(404).json({
      message: "التذكرة غير موجودة.",
    });
  }

  return res.json({
    success: true,
    ticket,
  });
}

export async function markMyAllSupportRead(
  req: Request,
  res: Response,
) {
  const openedBy = uid(req);

  if (
    !openedBy ||
    !Types.ObjectId.isValid(openedBy)
  ) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول.",
    });
  }

  await SupportTicketModel.updateMany(
    { openedBy },
    {
      $set: {
        userLastReadAt: new Date(),
      },
    },
  );

  return res.json({
    success: true,
  });
}

export async function listSupportTickets(
  req: Request,
  res: Response,
) {
  if (!admin(req)) {
    return res.status(403).json({
      message: "غير مصرح.",
    });
  }

  const filter: any = {};

  if (
    req.query.source === "captain" ||
    req.query.source === "shop"
  ) {
    filter.source = req.query.source;
  }

  if (
    req.query.type === "complaint" ||
    req.query.type === "emergency"
  ) {
    filter.type = req.query.type;
  }

  if (
    req.query.status === "open" ||
    req.query.status === "in_progress" ||
    req.query.status === "closed"
  ) {
    filter.status = req.query.status;
  }

  const tickets =
    await SupportTicketModel.find(filter)
      .populate(
        "openedBy",
        "fullName name phone email role",
      )
      .sort({
        lastMessageAt: -1,
      })
      .lean();

  return res.json({ tickets });
}

export async function getSupportTicket(
  req: Request,
  res: Response,
) {
  if (!admin(req)) {
    return res.status(403).json({
      message: "غير مصرح.",
    });
  }

  const ticket =
    await SupportTicketModel.findById(
      req.params.id,
    )
      .populate(
        "openedBy",
        "fullName name phone email role",
      )
      .lean();

  if (!ticket) {
    return res.status(404).json({
      message: "التذكرة غير موجودة.",
    });
  }

  return res.json({ ticket });
}

export async function addAdminSupportMessage(
  req: Request,
  res: Response,
) {
  const adminId = uid(req);
  const body = String(
    req.body?.body || "",
  ).trim();

  if (
    !adminId ||
    !Types.ObjectId.isValid(adminId)
  ) {
    return res.status(401).json({
      message: "يجب تسجيل الدخول.",
    });
  }

  if (!body) {
    return res.status(400).json({
      message: "الرسالة مطلوبة.",
    });
  }

  if (!admin(req)) {
    return res.status(403).json({
      message: "ليس لديك صلاحية الرد.",
    });
  }

  const ticket =
    await SupportTicketModel.findById(
      req.params.id,
    );

  if (!ticket) {
    return res.status(404).json({
      message: "التذكرة غير موجودة.",
    });
  }

  const senderRole =
    role(req) || "admin";

  ticket.messages.push({
    senderId: new Types.ObjectId(adminId),
    senderRole,
    body,
    createdAt: new Date(),
  } as any);

  ticket.lastMessageAt = new Date();
  ticket.lastMessageSenderRole =
    senderRole;

  if (ticket.status === "open") {
    ticket.status = "in_progress";
  }

  // لا نغيّر userLastReadAt هنا.
  // لذلك يظهر الرقم على جرس المستخدم حتى يفتح التذكرة.

  await ticket.save();

  return res.json({
    ticket,
  });
}

export async function updateSupportTicketStatus(
  req: Request,
  res: Response,
) {
  if (!admin(req)) {
    return res.status(403).json({
      message: "غير مصرح.",
    });
  }

  const status = String(
    req.body?.status || "",
  );

  if (
    ![
      "open",
      "in_progress",
      "closed",
    ].includes(status)
  ) {
    return res.status(400).json({
      message: "حالة غير صحيحة.",
    });
  }

  const ticket =
    await SupportTicketModel.findById(
      req.params.id,
    );

  if (!ticket) {
    return res.status(404).json({
      message: "التذكرة غير موجودة.",
    });
  }

  ticket.status = status;
  ticket.lastMessageAt = new Date();

  await ticket.save();

  return res.json({ ticket });
}

export async function getSupportUnreadCount(
  req: Request,
  res: Response,
) {
  if (!admin(req)) {
    return res.status(403).json({
      message: "غير مصرح.",
    });
  }

  const count =
    await SupportTicketModel.countDocuments({
      status: {
        $in: ["open", "in_progress"],
      },
    });

  return res.json({ count });
}
