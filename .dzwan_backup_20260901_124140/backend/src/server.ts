import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
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

const app = express();

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = new Set([
  "http://localhost:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", async (_req, res) => {
  try {
    const mongoose =
      (await import("mongoose")).default;

    const databaseConnected =
      mongoose.connection.readyState === 1;

    res.status(databaseConnected ? 200 : 503).json({
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

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/captains", captainRoutes);
app.use("/api/leaders", leaderRoutes);
app.use("/api/scoped/locations", scopedLocationRoutes);
app.use("/api/establishments", establishmentRoutes);
app.use("/api/establishment-users", establishmentUserRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);


app.use(
  (_req, res) => {
    res.status(404).json({
      success: false,
      message: "البيانات المطلوبة غير موجودة.",
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
        : typeof errorObject.statusCode === "number"
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
        message: "بيانات الطلب غير صالحة.",
      });
      return;
    }

    const isInvalidObjectId =
      errorName === "CastError" ||
      /cast to .* failed/i.test(errorMessage) ||
      /ObjectId/i.test(errorMessage) &&
      /CastError/i.test(errorMessage);

    if (isInvalidObjectId) {
      res.status(400).json({
        success: false,
        message: "المعرف المرسل غير صحيح.",
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

    res.status(
      status >= 400 && status < 500
        ? status
        : 500,
    ).json({
      success: false,
      message:
        status >= 400 && status < 500
          ? "تعذر تنفيذ الطلب بالبيانات الحالية."
          : "تعذر إتمام العملية حاليًا.",
    });
  },
)

export { app };

async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(
      `DZWAN API running on http://localhost:${env.port}`,
    );
  });
}

const isVercel =
  process.env.VERCEL === "1";

if (!isVercel) {
  startServer().catch((error) => {
    console.error(
      "Failed to start DZWAN API:",
      error,
    );
    process.exit(1);
  });
}
