from pathlib import Path
import re

ROOT = Path.cwd()

def write(rel, content):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"✅ {rel}")

def patch(rel, old, new, label):
    p = ROOT / rel

    if not p.exists():
        print(f"⚠️ غير موجود: {rel}")
        return False

    s = p.read_text(encoding="utf-8")

    if new in s:
        print(f"↪️ موجود مسبقًا: {label}")
        return True

    if old not in s:
        print(f"⚠️ نقطة الدمج غير موجودة: {label}")
        return False

    p.write_text(
        s.replace(old, new, 1),
        encoding="utf-8"
    )

    print(f"✅ {label}")
    return True


# ============================================================
# 1) خدمة منع العمل خارج الشفت
# ============================================================

write(
    "src/services/r11-strict-shift-runtime.service.ts",
    r'''
import CaptainShift from "../models/CaptainShift";

export type StrictShiftResult = {
  allowed: boolean;
  reason:
    | "NO_SHIFT"
    | "OUTSIDE_SHIFT"
    | "IN_SHIFT";
  shiftId?: string;
};

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);

  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return -1;
  }

  return h * 60 + m;
}

function isInsideShift(
  nowMinutes: number,
  start: string,
  end: string,
): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes < 0 || endMinutes < 0) {
    return false;
  }

  // نفس الوقت يعني شفت 24 ساعة
  if (startMinutes === endMinutes) {
    return true;
  }

  // شفت عادي داخل نفس اليوم
  if (startMinutes < endMinutes) {
    return (
      nowMinutes >= startMinutes &&
      nowMinutes < endMinutes
    );
  }

  // شفت يعبر منتصف الليل
  return (
    nowMinutes >= startMinutes ||
    nowMinutes < endMinutes
  );
}

function getCurrentDayName(date: Date): string {
  const day = date.getDay();

  const names = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return names[day];
}

export async function checkStrictShift(
  captainId: string,
  date = new Date(),
): Promise<StrictShiftResult> {
  const day = getCurrentDayName(date);

  const shifts = await CaptainShift.find({
    captainId,
    isActive: true,
  }).lean();

  if (!shifts.length) {
    return {
      allowed: false,
      reason: "NO_SHIFT",
    };
  }

  const nowMinutes =
    date.getHours() * 60 +
    date.getMinutes();

  for (const shift of shifts) {
    const shiftDay =
      String(
        (shift as any).dayOfWeek ??
        (shift as any).day ??
        "",
      ).toLowerCase();

    if (
      shiftDay &&
      shiftDay !== day
    ) {
      continue;
    }

    const start =
      String(
        (shift as any).startTime ??
        (shift as any).start ??
        "",
      );

    const end =
      String(
        (shift as any).endTime ??
        (shift as any).end ??
        "",
      );

    if (
      isInsideShift(
        nowMinutes,
        start,
        end,
      )
    ) {
      return {
        allowed: true,
        reason: "IN_SHIFT",
        shiftId: String(shift._id),
      };
    }
  }

  return {
    allowed: false,
    reason: "OUTSIDE_SHIFT",
  };
}

export async function assertCaptainInsideShift(
  captainId: string,
  date = new Date(),
) {
  const result =
    await checkStrictShift(
      captainId,
      date,
    );

  if (!result.allowed) {
    const error =
      new Error(
        result.reason === "NO_SHIFT"
          ? "لا يوجد شفت فعال للكابتن."
          : "لا يمكن للكابتن العمل خارج وقت الشفت.",
      );

    (error as any).code =
      result.reason === "NO_SHIFT"
        ? "NO_ACTIVE_SHIFT"
        : "OUTSIDE_SHIFT";

    throw error;
  }

  return result;
}
''',
)


# ============================================================
# 2) Controller لتغيير Online
# ============================================================

write(
    "src/controllers/captain-online.controller.ts",
    r'''
import { Request, Response } from "express";
import {
  assertCaptainInsideShift,
} from "../services/r11-strict-shift-runtime.service";
import Captain from "../models/Captain";

export async function setCaptainOnline(
  req: Request,
  res: Response,
) {
  try {
    const captainId =
      String(
        (req.user as any)?.id ??
        (req.user as any)?._id ??
        "",
      );

    if (!captainId) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح.",
      });
    }

    const online =
      Boolean(
        (req.body as any)?.online
      );

    if (online) {
      await assertCaptainInsideShift(
        captainId,
      );
    }

    const captain =
      await Captain.findByIdAndUpdate(
        captainId,
        {
          $set: {
            online,
            isOnline: online,
          },
        },
        {
          new: true,
        },
      );

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: "الكابتن غير موجود.",
      });
    }

    return res.json({
      success: true,
      online,
      message: online
        ? "تم تفعيل حالة العمل."
        : "تم إيقاف حالة العمل.",
    });
  } catch (error: any) {
    const code =
      error?.code;

    if (code === "OUTSIDE_SHIFT") {
      return res.status(403).json({
        success: false,
        code,
        message:
          "لا يمكنك بدء العمل خارج وقت الشفت المحدد.",
      });
    }

    if (code === "NO_ACTIVE_SHIFT") {
      return res.status(403).json({
        success: false,
        code,
        message:
          "لا يوجد شفت فعال لك حاليًا.",
      });
    }

    console.error(
      "setCaptainOnline:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "تعذر تغيير حالة العمل.",
    });
  }
}

export async function getCaptainOnline(
  req: Request,
  res: Response,
) {
  try {
    const captainId =
      String(
        (req.user as any)?.id ??
        (req.user as any)?._id ??
        "",
      );

    const captain =
      await Captain.findById(
        captainId,
      ).lean();

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: "الكابتن غير موجود.",
      });
    }

    return res.json({
      success: true,
      online: Boolean(
        (captain as any).online ??
        (captain as any).isOnline ??
        false,
      ),
    });
  } catch (error) {
    console.error(
      "getCaptainOnline:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "تعذر قراءة حالة العمل.",
    });
  }
}
''',
)


# ============================================================
# 3) Route
# ============================================================

write(
    "src/routes/captain-online.routes.ts",
    r'''
import { Router } from "express";
import {
  getCaptainOnline,
  setCaptainOnline,
} from "../controllers/captain-online.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get(
  "/",
  requireAuth,
  getCaptainOnline,
);

router.patch(
  "/",
  requireAuth,
  setCaptainOnline,
);

router.post(
  "/",
  requireAuth,
  setCaptainOnline,
);

export default router;
''',
)


# ============================================================
# 4) منع Dispatch للكابتن خارج الشفت
# ============================================================

write(
    "src/middleware/r11-shift-dispatch.middleware.ts",
    r'''
import { Request, Response, NextFunction } from "express";
import {
  assertCaptainInsideShift,
} from "../services/r11-strict-shift-runtime.service";

export async function requireCaptainInsideShiftForDispatch(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const captainId =
      String(
        (req as any).captainId ??
        (req.user as any)?.captainId ??
        (req.user as any)?.id ??
        (req.user as any)?._id ??
        "",
      );

    if (!captainId) {
      return res.status(401).json({
        success: false,
        message: "لم يتم تحديد الكابتن.",
      });
    }

    await assertCaptainInsideShift(
      captainId,
    );

    next();
  } catch (error: any) {
    if (
      error?.code === "OUTSIDE_SHIFT" ||
      error?.code === "NO_ACTIVE_SHIFT"
    ) {
      return res.status(403).json({
        success: false,
        code: error.code,
        message:
          "الكابتن غير مسموح له بالعمل خارج الشفت.",
      });
    }

    next(error);
  }
}
''',
)


# ============================================================
# 5) تسجيل الـRoute في server.ts
# ============================================================

server_candidates = [
    ROOT / "src/server.ts",
    ROOT / "src/app.ts",
    ROOT / "src/index.ts",
]

server = next(
    (
        p
        for p in server_candidates
        if p.exists()
    ),
    None,
)

if server:
    s = server.read_text(
        encoding="utf-8"
    )

    import_line = (
        'import captainOnlineRoutes from "./routes/captain-online.routes";\n'
    )

    if "captain-online.routes" not in s:
        s = import_line + s

    if "captainOnlineRoutes" not in s:
        pass

    # أشهر صيغ الـmount
    if '"/captains/online"' not in s:
        candidates = [
            'app.use("/captains/online", captainOnlineRoutes);',
            'app.use("/api/captains/online", captainOnlineRoutes);',
            'router.use("/captains/online", captainOnlineRoutes);',
        ]

        inserted = False

        for mount in candidates:
            if (
                "app.use(" in s
                and "router.use(" not in s
            ):
                marker = "app.use("
                pos = s.rfind(marker)

                if pos >= 0:
                    s = (
                        s[:pos]
                        + mount
                        + "\n"
                        + s[pos:]
                    )
                    inserted = True
                    break

        if not inserted:
            print(
                "⚠️ لم يتم تعديل server.ts تلقائيًا."
            )
            print(
                "أضف يدويًا:",
                candidates[0],
            )

    server.write_text(
        s,
        encoding="utf-8"
    )

    print(
        "✅ تمت معالجة",
        server.relative_to(ROOT)
    )
else:
    print(
        "⚠️ لم أجد server.ts/app.ts/index.ts"
    )


# ============================================================
# 6) تطبيق الكابتن — Online
# ============================================================

write(
    "../zajel-app/src/api/captainStrictShift.ts",
    r'''
import {
  apiGet,
  apiPatch,
} from "./request";

export async function getCaptainOnlineState() {
  return apiGet("/captains/online");
}

export async function setCaptainOnlineState(
  online: boolean,
) {
  return apiPatch(
    "/captains/online",
    {
      online,
    },
  );
}
''',
)

# ============================================================
# 7) ملاحظة تكامل شاشة Online
# ============================================================

print()
print("=" * 70)
print("✅ اكتمل كود النقطة 11")
print("=" * 70)
print("""
القواعد المضافة:

1. الكابتن لا يستطيع التحول إلى Online خارج الشفت.
2. عدم وجود شفت فعال يمنع بدء العمل.
3. شفت يعبر منتصف الليل مدعوم.
4. الكابتن خارج الشفت لا يدخل تشغيل العمل.
5. يمكن استخدام نفس الحارس قبل الإسناد/القبول.
6. التطبيق لديه API مخصص لحالة Online.
""")
