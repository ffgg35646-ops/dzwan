import AppUpdateRoutes from "./routes/app-update.routes.js";
import {
  autoCloseExpiredCaptainAttendance,
} from "./services/requirements-11-29-runtime.service.js";
import BrandingRoutes from "./routes/app-branding.routes.js";
import RewardsRoutes from "./routes/reward.routes.js";
import SupportRoutes from "./routes/support.routes.js";
import DeliveryPriceOverrideRoutes from "./routes/delivery-price-override.routes.js";
import captainOnlineRoutes from "./routes/captain-online.routes.js";
import requirements3046Routes from "./routes/requirements-30-46.routes.js";
import supportTicketRoutes from "./routes/support-ticket.routes.js";

import core11EstablishmentRoutes from "./routes/core11-establishment.routes.js";
import core11SettingsRoutes from "./routes/core11-settings.routes.js";

import pricingRoutes from "./routes/pricing.routes.js";
import ops3147Routes from "./routes/ops-31-47.routes.js";
import geofenceRoutes from "./routes/geofence.routes.js";
import express from "express";
import path from "node:path";
import orderPickupPhotoRoutes from "./routes/order-pickup-photo.routes.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { detectStuckOrders } from "./services/ops-31-47.service.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import authRoutes from "./routes/auth.routes.js";

import profileRoutes from "./routes/profile.routes.js";
import usersRoutes from "./routes/users.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import locationRoutes from "./routes/location.routes.js";
import userRoutes from "./routes/user.routes.js";
import captainRoutes from "./routes/captain.routes.js";
import leaderRoutes from "./routes/leader.routes.js";
import scopedLocationRoutes from "./routes/scoped-location.routes.js";
import establishmentRoutes from "./routes/establishment.routes.js";
import establishmentUserRoutes from "./routes/establishment-user.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import pushDeviceRoutes from "./routes/push-device.routes.js";
import adminNotificationRoutes from "./routes/admin-notification.routes.js";
import userComplaintRoutes from "./routes/user-complaint.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import completionRoutes from "./routes/completion.routes.js";
import offerRoutes from "./routes/offer.routes.js";
import establishmentReportRoutes from "./routes/establishment-report.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import dispatchRoutes from "./routes/dispatch.routes.js";
import {
  processDispatchQueue,
  expireAssignments,
} from "./services/dispatch-manager.service.js";
import systemSettingsRoutes from "./routes/system-settings.routes.js";
import deliveryProofRoutes from "./routes/delivery-proof.routes.js";
import captainLedgerRoutes from "./routes/captain-ledger.routes.js";
import captainWorkAreaRoutes from "./routes/captain-work-area.routes.js";
import captainDocumentRoutes from "./routes/captain-document.routes.js";
import captainRegistrationRoutes from "./routes/captain-registration.routes.js";
import establishmentRegistrationRoutes from "./routes/establishment-registration.routes.js";
import captainAttendanceRoutes from "./routes/captain-attendance.routes.js";
import captainShiftManagementRoutes from "./routes/captain-shift-management.routes.js";
import requirements1129Router from "./routes/requirements-11-29.routes.js";

import AppThemeRoutes from "./routes/app-theme.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://192.168.100.11:5173",
  "http://192.168.100.11:5174",
  "http://192.168.100.15:5173",
  "http://192.168.100.15:5174",
]);

const corsOptions =
  process.env.NODE_ENV === "production"
    ? {
        origin(
          origin: string | undefined,
          callback: (
            error: Error | null,
            allowed?: boolean,
          ) => void,
        ) {
          if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
          }

          callback(new Error("Origin not allowed by CORS"));
        },
        credentials: true,
      }
    : {
        origin: true,
        credentials: true,
      };

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed =
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
          origin,
        );

      callback(null, allowed);
    },

    credentials: true,

    methods: [
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cookie",
    ],

    exposedHeaders: ["Set-Cookie"],
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads"),
  ),
);

app.use(cookieParser());

app.use("/app-theme", AppThemeRoutes);

app.use(
  "/api/requirements-30-46",
  requirements3046Routes,
);

app.use("/api/support", SupportRoutes);

app.use(
  "/api/support-tickets",
  supportTicketRoutes,
);

app.get("/api/health", async (_req, res) => {
  try {
    const mongoose =
      (await import("mongoose")).default;

    const databaseConnected =
      mongoose.connection.readyState === 1;

    res
      .status(databaseConnected ? 200 : 503)
      .json({
        success: databaseConnected,
        service: "DZWAN API",
        status: databaseConnected
          ? "ok"
          : "degraded",
        database: databaseConnected
          ? "connected"
          : "disconnected",
      });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Health check error:",
        error,
      );
    }

    res.status(503).json({
      success: false,
      service: "DZWAN API",
      status: "degraded",
      database: "unknown",
    });
  }
});

app.get(
  "/api/system/status",
  async (_req, res) => {
    try {
      const mongoose =
        (await import("mongoose")).default;

      const databaseConnected =
        mongoose.connection.readyState === 1;

      res.status(200).json({
        success: true,

        services: {
          api: {
            status: "online",
          },

          database: {
            status: databaseConnected
              ? "online"
              : "offline",
          },
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "System status error:",
          error,
        );
      }

      res.status(200).json({
        success: false,

        services: {
          api: {
            status: "online",
          },

          database: {
            status: "unknown",
          },
        },
      });
    }
  },
);

const isVercel =
  process.env.VERCEL === "1";

let databaseConnectionPromise:
  | Promise<unknown>
  | null = null;

async function ensureDatabaseConnection(): Promise<void> {
  if (!databaseConnectionPromise) {
    databaseConnectionPromise =
      connectDatabase().catch((error) => {
        databaseConnectionPromise = null;
        throw error;
      });
  }

  await databaseConnectionPromise;
}

app.use(
  async (_req, _res, next) => {
    try {
      await ensureDatabaseConnection();
      next();
    } catch (error) {
      console.error(
        "DATABASE CONNECTION ERROR:",
        error,
      );

      next(error);
    }
  },
);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/captains", captainRoutes);
app.use("/api/leaders", leaderRoutes);

app.use(
  "/api/scoped/locations",
  scopedLocationRoutes,
);

app.use(
  "/api/establishments",
  establishmentRoutes,
);

app.use(
  "/api/establishment-users",
  establishmentUserRoutes,
);

app.use(
  "/api/customers",
  customerRoutes,
);

app.use(
  "/api/products",
  productRoutes,
);

app.use(
  "/api/orders",
  orderRoutes,
);

app.use(
  "/api/pricing",
  pricingRoutes,
);

app.use(
  "/api/geofences",
  geofenceRoutes,
);

app.use(
  "/api/notifications",
  notificationRoutes,
);

app.use(
  "/api/notifications",
  pushDeviceRoutes,
);

app.use(
  "/api/admin/notifications",
  adminNotificationRoutes,
);

app.use(
  "/api/complaints",
  userComplaintRoutes,
);

app.use(
  "/api/audit-logs",
  auditRoutes,
);

app.use(
  "/api/settings",
  settingsRoutes,
);

app.use(
  "/api/dispatch",
  dispatchRoutes,
);

app.use(
  "/api/system-settings",
  systemSettingsRoutes,
);

app.use(
  "/api/delivery-proof",
  deliveryProofRoutes,
);

app.use(
  "/api/captain-ledger",
  captainLedgerRoutes,
);

app.use(
  "/api/captain-work-areas",
  captainWorkAreaRoutes,
);

app.use(
  "/api/captain-documents",
  captainDocumentRoutes,
);

app.use(
  "/api/captain-registration",
  captainRegistrationRoutes,
);

app.use(
  "/api/establishment-registration",
  establishmentRegistrationRoutes,
);

app.use(
  "/api/captain-attendance",
  captainAttendanceRoutes,
);

app.use(
  "/api/captain-shifts",
  captainShiftManagementRoutes,
);

app.use(
  "/api/reports",
  reportsRoutes,
);

app.use(
  "/api/completion",
  completionRoutes,
);

app.use(
  "/api/completion",
  orderPickupPhotoRoutes,
);

app.use(
  "/api",
  orderPickupPhotoRoutes,
);

app.use(
  "/api/ops",
  ops3147Routes,
);

app.use(
  "/api/offers",
  offerRoutes,
);

app.use(
  "/api/reports",
  establishmentReportRoutes,
);

app.use(
  "/captains/online",
  captainOnlineRoutes,
);

app.use(
  "/delivery-price-overrides",
  DeliveryPriceOverrideRoutes,
);

app.use(
  "/support",
  SupportRoutes,
);

app.use(
  "/rewards",
  RewardsRoutes,
);

app.use(
  "/app-branding",
  BrandingRoutes,
);

app.use(
  "/app-update",
  AppUpdateRoutes,
);

app.use(
  "/api/requirements",
  requirements1129Router,
);

app.use(
  "/api/core11/establishments",
  core11EstablishmentRoutes,
);

app.use(
  "/api/core11/settings",
  core11SettingsRoutes,
);

app.get(
  "/api/captain-ratings/order/:orderId",
  requireAuth,
  async (req, res) => {
    try {
      const {
        default: CaptainRatingFinalModel,
      } = await import(
        "./models/CaptainRatingFinal.js"
      );

      const rating =
        await CaptainRatingFinalModel.findOne({
          orderId: String(req.params.orderId),
        }).lean();

      return res.json({
        success: true,
        rated: Boolean(rating),
        rating: rating || null,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "تعذر معرفة حالة التقييم.",
      });
    }
  },
);

app.post(
  "/api/captain-ratings",
  requireAuth,
  async (req, res) => {
    try {
      const {
        orderId,
        captainId,
        stars,
        text,
      } = req.body;

      if (!orderId || !captainId) {
        return res.status(400).json({
          success: false,
          message:
            "بيانات التقييم غير مكتملة.",
        });
      }

      if (
        !Number.isInteger(Number(stars)) ||
        Number(stars) < 1 ||
        Number(stars) > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "التقييم يجب أن يكون من 1 إلى 5 نجوم.",
        });
      }

      const {
        OrderModel,
      } = await import("./models/Order.js");

      const {
        default: CaptainRatingFinalModel,
      } = await import(
        "./models/CaptainRatingFinal.js"
      );

      const order: any =
        await OrderModel.findById(
          orderId,
        ).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "الطلب غير موجود.",
        });
      }

      if (!order.establishmentId) {
        return res.status(400).json({
          success: false,
          message:
            "المنشأة المرتبطة بالطلب غير موجودة.",
        });
      }

      if (
        order.captainId?.toString() !==
        String(captainId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "الكابتن غير مرتبط بهذا الطلب.",
        });
      }

      const existing =
        await CaptainRatingFinalModel.findOne({
          orderId,
        });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "تم تقييم هذا الطلب مسبقًا.",
          rating: existing,
        });
      }

      const rating =
        await CaptainRatingFinalModel.create({
          orderId,
          captainId,
          establishmentId:
            order.establishmentId,
          stars: Number(stars),
          review:
            typeof text === "string"
              ? text.trim() || null
              : null,
        });

      return res.status(201).json({
        success: true,
        message:
          "تم حفظ التقييم.",
        rating,
      });
    } catch (error: any) {
      console.error(
        "CAPTAIN_RATING_ERROR:",
        error,
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "تعذر حفظ التقييم.",
      });
    }
  },
);

app.use(
  (_req, res) => {
    res.status(404).json({
      success: false,
      message:
        "البيانات المطلوبة غير موجودة.",
    });
  },
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Unhandled server error:",
        error,
      );
    }

    if (res.headersSent) {
      return;
    }

    const errorObject =
      error as {
        status?: unknown;
        statusCode?: unknown;
        type?: unknown;
        name?: unknown;
        message?: unknown;
      };

    const statusCandidate =
      typeof errorObject.status === "number"
        ? errorObject.status
        : typeof errorObject.statusCode ===
            "number"
          ? errorObject.statusCode
          : 500;

    const errorType =
      typeof errorObject.type === "string"
        ? errorObject.type
        : "";

    const errorName =
      typeof errorObject.name === "string"
        ? errorObject.name
        : "";

    const errorMessage =
      typeof errorObject.message === "string"
        ? errorObject.message
        : "";

    const isJsonParseError =
      error instanceof SyntaxError ||
      errorType === "entity.parse.failed";

    if (isJsonParseError) {
      res.status(400).json({
        success: false,
        message:
          "بيانات الطلب غير صالحة.",
      });
      return;
    }

    const isInvalidObjectId =
      errorName === "CastError" ||
      /cast to .* failed/i.test(
        errorMessage,
      ) ||
      (/ObjectId/i.test(
        errorMessage,
      ) &&
        /CastError/i.test(
          errorMessage,
        ));

    if (isInvalidObjectId) {
      res.status(400).json({
        success: false,
        message:
          "المعرف المرسل غير صحيح.",
      });
      return;
    }

    const status =
      statusCandidate >= 400 &&
      statusCandidate < 500
        ? statusCandidate
        : 500;

    if (status === 404) {
      res.status(404).json({
        success: false,
        message:
          "البيانات المطلوبة غير موجودة.",
      });
      return;
    }

    if (status === 401) {
      res.status(401).json({
        success: false,
        message:
          "انتهت جلسة الدخول.",
      });
      return;
    }

    if (status === 403) {
      res.status(403).json({
        success: false,
        message:
          "ليس لديك صلاحية لتنفيذ هذه العملية.",
      });
      return;
    }

    res
      .status(
        status >= 400 &&
          status < 500
          ? status
          : 500,
      )
      .json({
        success: false,
        message:
          status >= 400 &&
          status < 500
            ? "تعذر تنفيذ الطلب بالبيانات الحالية."
            : "تعذر إتمام العملية حاليًا.",
      });
  },
);

export { app };
export default app;

let stuckOrderMonitorStarted = false;

async function startStuckOrderMonitor(): Promise<void> {
  if (stuckOrderMonitorStarted) {
    return;
  }

  stuckOrderMonitorStarted = true;

  const runCheck = async () => {
    try {
      const result =
        await detectStuckOrders();

      if (result.detected > 0) {
        console.log(
          `STUCK ORDER MONITOR: detected ${result.detected} new alert(s) using ${result.stuckMinutes} minute threshold.`,
        );
      }
    } catch (error) {
      console.error(
        "STUCK ORDER MONITOR ERROR:",
        error,
      );
    }
  };

  await runCheck();

  setInterval(() => {
    void runCheck();
  }, 60_000);
}

async function startServer(): Promise<void> {
  await ensureDatabaseConnection();

  await startStuckOrderMonitor();

  let dispatchWorkerRunning = false;

  setInterval(async () => {
    if (dispatchWorkerRunning) {
      return;
    }

    dispatchWorkerRunning = true;

    try {
      await expireAssignments();
      await processDispatchQueue();
    } catch (error) {
      console.error(
        "Dispatch worker error:",
        error,
      );
    } finally {
      dispatchWorkerRunning = false;
    }
  }, 5000);

  void autoCloseExpiredCaptainAttendance().catch(
    (error) => {
      console.error(
        "attendance auto-close startup error:",
        error,
      );
    },
  );

  setInterval(() => {
    void autoCloseExpiredCaptainAttendance().catch(
      (error) => {
        console.error(
          "attendance auto-close error:",
          error,
        );
      },
    );
  }, 30_000);

  app.listen(env.port, () => {
    console.log(
      `DZWAN API running on http://localhost:${env.port}`,
    );
  });
}

if (!isVercel) {
  startServer().catch((error) => {
    console.error(
      "Failed to start DZWAN API:",
      error,
    );
    process.exit(1);
  });
}
