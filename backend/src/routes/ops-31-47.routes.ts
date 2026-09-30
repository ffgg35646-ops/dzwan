
import { Router } from "../http/express-compat.js";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middleware/auth.middleware.js";
import {
  createComplaint,
  listComplaints,
  updateComplaint,
  orderTimeline,
  createTimeline,
  createTimer,
  finishTimer,
  processStuck,
  listStuck,
  resolveStuck,
  createCaptainEmergency,
  listEmergencies,
  resolveCaptainEmergency,
  createAppVersion,
  listAppVersions,
  checkAppVersion,
  maintenance,
  globalSearch,
  cancellation,
  securityEvent,
  permissions,
} from "../controllers/ops-31-47.controller.js";

const router = Router();

// 31 الشكاوى
router.post("/complaints", requireAuth, createComplaint);
router.get("/complaints", requireAuth, requireAdmin, listComplaints);
router.patch("/complaints/:id", requireAuth, requireAdmin, updateComplaint);

// 32 Timeline
router.get("/orders/:orderId/timeline", requireAuth, orderTimeline);
router.post("/orders/:orderId/timeline", requireAuth, requireAdmin, createTimeline);

// 33 المؤقتات
router.post("/orders/:orderId/timers", requireAuth, requireAdmin, createTimer);
router.post("/orders/:orderId/timers/:stage/finish", requireAuth, requireAdmin, finishTimer);

// 34 الطلبات العالقة
router.post("/stuck/process", requireAuth, requireAdmin, processStuck);
router.get("/stuck", requireAuth, requireAdmin, listStuck);
router.patch("/stuck/:id/resolve", requireAuth, requireAdmin, resolveStuck);

// 35 إعادة التعيين عبر Smart Dispatch الموجود
// endpoint مساعد لإعادة تشغيل الإسناد للطلب
router.post("/orders/:orderId/re-dispatch", requireAuth, requireAdmin,
  async (req, res) => {
    try {
      const { dispatchOrder } =
        await import("../services/dispatch-manager.service.js");

      const id = String(req.params.orderId);

      const result = await dispatchOrder(
        new (await import("mongoose")).Types.ObjectId(id),
      );

      // تسجيل العملية وإبلاغ المطعم / المحل.
      try {
        const { OrderModel } =
          await import("../models/Order.js");

        const { EstablishmentModel } =
          await import("../models/Establishment.js");

        const { saveOrderEvent } =
          await import(
            "../services/requirements-11-29-runtime.service.js"
          );

        const { createNotification } =
          await import(
            "../services/notification.service.js"
          );

        const order =
          await OrderModel.findById(id)
            .select(
              "_id orderNumber establishmentId captainId status",
            )
            .lean();

        if (order) {
          await saveOrderEvent(
            id,
            "admin_redispatched",
            {
              status: order.status,
              actorId:
                (req as any).user?.sub || null,
              captainId:
                order.captainId?.toString?.() || null,
              note:
                "تمت إعادة الطلب إلى نظام التوزيع من الإدارة.",
              metadata: {
                reason:
                  "admin_redispatch",
              },
            },
          );

          const establishment =
            await EstablishmentModel.findById(
              order.establishmentId,
            )
              .select(
                "_id name ownerUserId",
              )
              .lean();

          if (establishment?.ownerUserId) {
            await createNotification({
              userId:
                establishment.ownerUserId,
              type: "establishment",
              title:
                "🔄 تمت إعادة الطلب إلى التوزيع",
              message:
                `تمت إعادة الطلب ${order.orderNumber} إلى نظام التوزيع من الإدارة، وسيتم التعامل معه من جديد.`,
              orderId: order._id,
              establishmentId:
                establishment._id,
            });
          }
        }
      } catch (opsError) {
        console.error(
          "Redispatch shop notification/event error:",
          opsError,
        );
      }

      return res.json(result);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error
          ? error.message
          : "تعذر إعادة إسناد الطلب.",
      });
    }
  }
);

// 36 طوارئ الكابتن
router.post("/emergencies", requireAuth, createCaptainEmergency);
router.get("/emergencies", requireAuth, requireAdmin, listEmergencies);
router.patch("/emergencies/:id/resolve", requireAuth, requireAdmin, resolveCaptainEmergency);

// 37/38 السجلات
router.post("/security-events", requireAuth, requireAdmin, securityEvent);

// 41/42 الإصدارات + Force Update
router.post("/app-versions", requireAuth, requireAdmin, createAppVersion);
router.get("/app-versions", requireAuth, requireAdmin, listAppVersions);
router.get("/app-version-check", checkAppVersion);

// 43 البحث
router.get("/search", requireAuth, requireAdmin, globalSearch);

// 45/46 الصيانة + الإعدادات
router.get("/maintenance", requireAuth, maintenance);
router.patch("/maintenance", requireAuth, requireAdmin, maintenance);

// 40 الصلاحيات
router.get("/permissions/:userId", requireAuth, requireSuperAdmin, permissions);
router.patch("/permissions/:userId", requireAuth, requireSuperAdmin, permissions);

// 47 الإلغاء
router.post("/orders/:orderId/cancel", requireAuth, cancellation);

export default router;
