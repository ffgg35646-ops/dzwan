import type {
  NextFunction,
  Request,
  Response,
} from "express";

type Entry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<
  string,
  Entry
>();

const WINDOW_MS = 15 * 60 * 1000;

function getMaxAttempts(): 5 | 10 {
  return process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS === "10"
    ? 10
    : 5;
}

function getKey(req: Request): string {
  const forwarded =
    req.headers["x-forwarded-for"];

  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.ip || "unknown";

  const email =
    typeof req.body?.email === "string"
      ? req.body.email
          .trim()
          .toLowerCase()
      : "no-email";

  return `${ip}:${email}`;
}

export function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  const key = getKey(req);
  const maxAttempts = getMaxAttempts();

  const current = attempts.get(key);

  if (current && current.resetAt <= now) {
    attempts.delete(key);
  }

  const active = attempts.get(key);

  if (active && active.count >= maxAttempts) {
    const retryAfter = Math.ceil(
      (active.resetAt - now) / 1000,
    );

    res.setHeader(
      "Retry-After",
      retryAfter,
    );

    res.status(429).json({
      success: false,
      message:
        "تم تجاوز عدد محاولات تسجيل الدخول الخاطئة. حاول لاحقًا.",
    });

    return;
  }

  res.once("finish", () => {
    // النجاح يصفر العداد.
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300
    ) {
      attempts.delete(key);
      return;
    }

    // 401 فقط = محاولة دخول خاطئة.
    if (res.statusCode !== 401) {
      return;
    }

    const finishedAt = Date.now();
    const entry = attempts.get(key);

    if (!entry || entry.resetAt <= finishedAt) {
      attempts.set(key, {
        count: 1,
        resetAt: finishedAt + WINDOW_MS,
      });
      return;
    }

    entry.count += 1;
  });

  next();
}

/*
 * تنظيف دوري للذاكرة.
 */
setInterval(() => {
  const now = Date.now();

  for (const [
    key,
    entry,
  ] of attempts.entries()) {
    if (entry.resetAt <= now) {
      attempts.delete(key);
    }
  }
}, WINDOW_MS).unref();
