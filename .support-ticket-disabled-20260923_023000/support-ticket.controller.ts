
import { Request, Response } from "express";
import { Types } from "mongoose";
import { SupportTicketModel } from "../models/SupportTicket.js";
import { OrderModel } from "../models/Order.js";
import UserModel from "../models/User.js";

function currentUser(req: Request): any {
  return (req as any).user || {};
}

function userId(req: Request): string {
  return String(
    currentUser(req)?._id ||
    currentUser(req)?.id ||
    "",
  );
}

function userRole(req: Request): string {
  return String(
    currentUser(req)?.role || "",
  ).toLowerCase();
}

function assertUser(req: Request, res: Response) {
  const id = userId(req);

  if (!id || !Types.ObjectId.isValid(id)) {
    res.status(401).json({
      message: "يجب تسجيل الدخول.",
    });

    return null;
  }

  return id;
}

function isAdmin(req: Request) {
  return [
    "admin",
    "super_admin",
    "governorate_leader",
    "area_leader",
  ].includes(userRole(req));
}

function normalizeSource(role: string) {
  if (role === "captain") return "captain";
  if (
    role === "shop" ||
    role === "restaurant"
  ) {
    return "shop";
  }

  return null;
}

async function resolveOrderReference(
  value: unknown,
) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  if (Types.ObjectId.isValid(raw)) {
    return OrderModel.findById(raw)
      .select(
        "_id orderNumber shortOrderNumber number sequence captainId establishmentId",
      )
      .lean();
  }

  return OrderModel.findOne({
    $or: [
      { orderNumber: raw },
      { shortOrderNumber: raw },
      { number: raw },
    ],
  })
    .select(
      "_id orderNumber shortOrderNumber number sequence captainId establishmentId",
    )
    .lean();
}

async function nextTicketNumber() {
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

async function populateTicket(ticket: any) {
  return SupportTicketModel.findById(
    ticket?._id || ticket,
  )
    .populate(
      "openedBy",
      "fullName name phone email role",
    )
    .populate(
      "orderId",
      "orderNumber shortOrderNumber number sequence status customerName total",
    )
    .populate(
      "messages.senderId",
      "fullName name phone email role",
    )
    .lean();
}

export async function createSupportTicket(
  req: Request,
  res: Response,
) {
  try {
    const openedById = assertUser(req, res);
    if (!openedById) return;

    const source = normalizeSource(
      userRole(req),
    );

    if (!source) {
      return res.status(403).json({
        message:
          "هذا الحساب غير مسموح له بإنشاء تذكرة دعم.",
      });
    }

    const {
      type,
      title,
      description,
      orderId,
    } = req.body || {};

    if (
      type !== "complaint" &&
      type !== "emergency"
    ) {
      return res.status(400).json({
        message: "نوع الدعم غير صالح.",
      });
    }

    if (
      !String(title || "").trim() ||
      String(title).trim().length < 2
    ) {
      return res.status(400).json({
        message: "موضوع التذكرة مطلوب.",
      });
    }

    if (
      !String(description || "").trim() ||
      String(description).trim().length < 3
    ) {
      return res.status(400).json({
        message: "تفاصيل التذكرة مطلوبة.",
      });
    }

    let resolvedOrder: any = null;

    if (orderId) {
      resolvedOrder =
        await resolveOrderReference(orderId);

      if (!resolvedOrder) {
        return res.status(404).json({
          message: "رقم الطلب غير موجود.",
        });
      }
    }

    const ticketNumber =
      await nextTicketNumber();

    const ticket =
      await SupportTicketModel.create({
        ticketNumber,
        openedBy: openedById,
        source,
        type,
        title: String(title).trim(),
        orderId:
          resolvedOrder?._id || null,
        status: "open",
        messages: [
          {
            senderId: openedById,
            senderRole: userRole(req),
            body: String(
              description,
            ).trim(),
          },
        ],
        lastMessageAt: new Date(),
      });

    const populated =
      await populateTicket(ticket);

    return res.status(201).json({
      ticket: populated,
    });
  } catch (error: any) {
    console.error(
      "createSupportTicket error:",
      error,
    );

    return res.status(500).json({
      message:
        error?.message ||
        "تعذر إنشاء تذكرة الدعم.",
    });
  }
}

export async function listMySupportTickets(
  req: Request,
  res: Response,
) {
  try {
    const openedById = assertUser(req, res);
    if (!openedById) return;

    const tickets =
      await SupportTicketModel.find({
        openedBy: openedById,
      })
        .populate(
          "orderId",
          "orderNumber shortOrderNumber number sequence status customerName total",
        )
        .sort({
          lastMessageAt: -1,
        })
        .lean();

    return res.json({
      tickets,
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر تحميل التذاكر.",
    });
  }
}

export async function getMySupportTicket(
  req: Request,
  res: Response,
) {
  try {
    const openedById = assertUser(req, res);
    if (!openedById) return;

    const ticket =
      await populateTicket(req.params.id);

    if (
      !ticket ||
      String(ticket.openedBy?._id || "") !==
        openedById
    ) {
      return res.status(404).json({
        message: "التذكرة غير موجودة.",
      });
    }

    return res.json({
      ticket,
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر تحميل التذكرة.",
    });
  }
}

export async function addMySupportMessage(
  req: Request,
  res: Response,
) {
  try {
    const senderId = assertUser(req, res);
    if (!senderId) return;

    const body = String(
      req.body?.body || "",
    ).trim();

    if (body.length < 1) {
      return res.status(400).json({
        message: "اكتب الرسالة أولًا.",
      });
    }

    const ticket =
      await SupportTicketModel.findOne({
        _id: req.params.id,
        openedBy: senderId,
      });

    if (!ticket) {
      return res.status(404).json({
        message: "التذكرة غير موجودة.",
      });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({
        message: "هذه التذكرة مغلقة.",
      });
    }

    ticket.messages.push({
      senderId: new Types.ObjectId(
        senderId,
      ),
      senderRole: userRole(req),
      body,
      createdAt: new Date(),
    } as any);

    ticket.status = "in_progress";
    ticket.lastMessageAt = new Date();

    await ticket.save();

    return res.json({
      ticket: await populateTicket(ticket),
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر إرسال الرسالة.",
    });
  }
}

export async function listSupportTickets(
  req: Request,
  res: Response,
) {
  try {
    if (!isAdmin(req)) {
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
        .populate(
          "orderId",
          "orderNumber shortOrderNumber number sequence status customerName total",
        )
        .sort({
          lastMessageAt: -1,
        })
        .lean();

    return res.json({
      tickets,
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر تحميل تذاكر الدعم.",
    });
  }
}

export async function getSupportTicket(
  req: Request,
  res: Response,
) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "غير مصرح.",
      });
    }

    const ticket =
      await populateTicket(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        message: "التذكرة غير موجودة.",
      });
    }

    return res.json({
      ticket,
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر تحميل التذكرة.",
    });
  }
}

export async function addAdminSupportMessage(
  req: Request,
  res: Response,
) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        message: "غير مصرح.",
      });
    }

    const adminId = userId(req);

    const body = String(
      req.body?.body || "",
    ).trim();

    if (!body) {
      return res.status(400).json({
        message: "اكتب الرسالة.",
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

    if (ticket.status === "closed") {
      return res.status(400).json({
        message: "التذكرة مغلقة.",
      });
    }

    ticket.messages.push({
      senderId: new Types.ObjectId(
        adminId,
      ),
      senderRole: userRole(req),
      body,
      createdAt: new Date(),
    } as any);

    ticket.status = "in_progress";
    ticket.lastMessageAt = new Date();

    await ticket.save();

    return res.json({
      ticket: await populateTicket(ticket),
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر إرسال رد الإدارة.",
    });
  }
}

export async function updateSupportTicketStatus(
  req: Request,
  res: Response,
) {
  try {
    if (!isAdmin(req)) {
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
        message: "حالة التذكرة غير صالحة.",
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

    if (status === "closed") {
      ticket.closedAt = new Date();
    } else {
      ticket.closedAt = null;
    }

    await ticket.save();

    return res.json({
      ticket: await populateTicket(ticket),
    });
  } catch (error: any) {
    return res.status(500).json({
      message:
        error?.message ||
        "تعذر تحديث التذكرة.",
    });
  }
}
