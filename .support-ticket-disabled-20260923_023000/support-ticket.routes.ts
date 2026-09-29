
import { Router, Request, Response } from "express";
import { Types } from "mongoose";

import { requireAuth } from "../middleware/auth.middleware.js";
import { SupportTicketModel } from "../models/SupportTicket.js";

import {
  createSupportTicket,
  listMySupportTickets,
  getMySupportTicket,
  addMySupportMessage,
  listSupportTickets,
  getSupportTicket,
  addAdminSupportMessage,
  updateSupportTicketStatus,
} from "../controllers/support-ticket.controller.js";

const router = Router();

router.use(requireAuth);

function currentUserId(req: Request) {
  const user = (req as any).user || {};

  return String(
    user?._id ||
    user?.id ||
    "",
  );
}

/*
 * المستخدم: عدد تذاكر الدعم التي تحتاج انتباهه.
 */
router.get(
  "/my/unread-count",
  async (req: Request, res: Response) => {
    try {
      const userId = currentUserId(req);

      if (
        !userId ||
        !Types.ObjectId.isValid(userId)
      ) {
        return res.status(401).json({
          message: "يجب تسجيل الدخول.",
        });
      }

      const count =
        await SupportTicketModel.countDocuments({
          openedBy: userId,
          status: { $ne: "closed" },
          $or: [
            {
              readByUserAt: null,
            },
            {
              readByUserAt: {
                $exists: false,
              },
            },
          ],
        });

      return res.json({ count });
    } catch (error: any) {
      return res.status(500).json({
        message:
          error?.message ||
          "تعذر تحميل إشعارات الدعم.",
      });
    }
  },
);

/*
 * إنشاء التذكرة.
 */
router.post(
  "/",
  createSupportTicket,
);

/*
 * تذاكر المستخدم.
 */
router.get(
  "/my",
  listMySupportTickets,
);

router.get(
  "/my/:id",
  getMySupportTicket,
);

router.post(
  "/my/:id/messages",
  addMySupportMessage,
);

router.patch(
  "/my/:id/read",
  async (req: Request, res: Response) => {
    try {
      const userId = currentUserId(req);

      if (
        !userId ||
        !Types.ObjectId.isValid(userId)
      ) {
        return res.status(401).json({
          message: "يجب تسجيل الدخول.",
        });
      }

      const ticket =
        await SupportTicketModel.findOne({
          _id: req.params.id,
          openedBy: userId,
        });

      if (!ticket) {
        return res.status(404).json({
          message: "التذكرة غير موجودة.",
        });
      }

      (ticket as any).readByUserAt =
        new Date();

      await ticket.save();

      return res.json({
        ok: true,
      });
    } catch (error: any) {
      return res.status(500).json({
        message:
          error?.message ||
          "تعذر تحديث القراءة.",
      });
    }
  },
);

/*
 * الإدارة.
 */
router.get(
  "/",
  listSupportTickets,
);

router.get(
  "/:id",
  getSupportTicket,
);

router.post(
  "/:id/messages",
  addAdminSupportMessage,
);

router.patch(
  "/:id/status",
  updateSupportTicketStatus,
);

export default router;
