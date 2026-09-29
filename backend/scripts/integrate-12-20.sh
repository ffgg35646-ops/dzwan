#!/usr/bin/env bash
set -e

echo "========================================"
echo "بدء دمج الأقسام 12 → 20"
echo "========================================"

mkdir -p src/controllers src/routes

# =========================================================
# 1) Captain Attendance
# =========================================================
cat > src/controllers/captain-attendance.controller.ts <<'TS'
import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import CaptainAttendanceModel from "../models/CaptainAttendance.js";
import CaptainShiftModel from "../models/CaptainShift.js";

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayOfWeek() {
  return new Date().getDay();
}

export async function checkIn(req: AuthenticatedRequest, res: Response) {
  try {
    const captainId = req.user?.sub;
    if (!captainId) return res.status(401).json({ message: "غير مصرح." });

    const existing = await CaptainAttendanceModel.findOne({
      captainId,
      date: todayKey(),
    });

    if (existing) {
      return res.status(409).json({
        message: "تم تسجيل الحضور اليوم بالفعل.",
        attendance: existing,
      });
    }

    const shifts = await CaptainShiftModel.find({
      captainId,
      dayOfWeek: dayOfWeek(),
      isActive: true,
    }).lean();

    if (!shifts.length) {
      return res.status(400).json({
        message: "لا يوجد شفت فعال للكابتن اليوم.",
      });
    }

    const now = new Date();

    const attendance = await CaptainAttendanceModel.create({
      captainId: new Types.ObjectId(captainId),
      shiftId: shifts[0]._id,
      date: todayKey(),
      checkInAt: now,
      status: "present",
      checkInIp:
        typeof req.ip === "string" ? req.ip : undefined,
    });

    return res.status(201).json({
      message: "تم تسجيل الحضور بنجاح.",
      attendance,
    });
  } catch (error) {
    console.error("checkIn error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الحضور.",
    });
  }
}

export async function checkOut(req: AuthenticatedRequest, res: Response) {
  try {
    const captainId = req.user?.sub;
    if (!captainId) return res.status(401).json({ message: "غير مصرح." });

    const attendance = await CaptainAttendanceModel.findOne({
      captainId,
      date: todayKey(),
      status: "present",
    });

    if (!attendance) {
      return res.status(404).json({
        message: "لا يوجد حضور مفتوح لليوم.",
      });
    }

    attendance.checkOutAt = new Date();
    attendance.status = "completed";
    attendance.checkOutIp =
      typeof req.ip === "string" ? req.ip : undefined;

    await attendance.save();

    return res.json({
      message: "تم تسجيل الانصراف بنجاح.",
      attendance,
    });
  } catch (error) {
    console.error("checkOut error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الانصراف.",
    });
  }
}

export async function myAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;
    if (!captainId) return res.status(401).json({ message: "غير مصرح." });

    const rows = await CaptainAttendanceModel.find({ captainId })
      .sort({ date: -1 })
      .limit(100)
      .lean();

    return res.json({ attendance: rows });
  } catch (error) {
    console.error("myAttendance error:", error);
    return res.status(500).json({
      message: "تعذر تحميل سجل الحضور.",
    });
  }
}

export async function adminAttendance(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const rows = await CaptainAttendanceModel.find()
      .populate("captainId", "fullName phone")
      .populate("shiftId", "dayOfWeek startTime endTime")
      .sort({ date: -1, checkInAt: -1 })
      .limit(500)
      .lean();

    return res.json({ attendance: rows });
  } catch (error) {
    console.error("adminAttendance error:", error);
    return res.status(500).json({
      message: "تعذر تحميل حضور الكباتن.",
    });
  }
}
TS

# =========================================================
# 2) Captain Registration
# =========================================================
cat > src/controllers/captain-registration.controller.ts <<'TS'
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import CaptainRegistrationModel from "../models/CaptainRegistration.js";
import UserModel from "../models/User.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export async function registerCaptain(req: Request, res: Response) {
  try {
    const {
      fullName,
      phone,
      email,
      password,
      governorateId,
      areaId,
    } = req.body;

    if (
      !fullName ||
      !phone ||
      !password ||
      !governorateId ||
      !areaId
    ) {
      return res.status(400).json({
        message: "جميع البيانات الأساسية مطلوبة.",
      });
    }

    if (!Types.ObjectId.isValid(governorateId) ||
        !Types.ObjectId.isValid(areaId)) {
      return res.status(400).json({
        message: "المحافظة أو المنطقة غير صحيحة.",
      });
    }

    const existingUser = await UserModel.findOne({
      $or: [
        { phone },
        ...(email ? [{ email }] : []),
      ],
    }).lean();

    if (existingUser) {
      return res.status(409).json({
        message: "رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل.",
      });
    }

    const pending = await CaptainRegistrationModel.findOne({
      $or: [
        { phone, status: "pending" },
        ...(email ? [{ email, status: "pending" }] : []),
      ],
    });

    if (pending) {
      return res.status(409).json({
        message: "يوجد طلب تسجيل قيد المراجعة بالفعل.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const registration = await CaptainRegistrationModel.create({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      passwordHash,
      governorateId,
      areaId,
      status: "pending",
    });

    return res.status(201).json({
      message: "تم إرسال طلب التسجيل للمراجعة.",
      registrationId: registration._id,
      status: registration.status,
    });
  } catch (error) {
    console.error("registerCaptain error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء إرسال طلب التسجيل.",
    });
  }
}

export async function listCaptainRegistrations(
  req: AuthenticatedRequest,
  res: Response,
) {
  const rows = await CaptainRegistrationModel.find()
    .select("-passwordHash")
    .populate("governorateId", "name")
    .populate("areaId", "name")
    .populate("reviewedBy", "fullName")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ registrations: rows });
}

export async function approveCaptainRegistration(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const registration = await CaptainRegistrationModel
      .findById(req.params.id)
      .select("+passwordHash");

    if (!registration) {
      return res.status(404).json({
        message: "طلب التسجيل غير موجود.",
      });
    }

    if (registration.status !== "pending") {
      return res.status(400).json({
        message: "طلب التسجيل تمت مراجعته بالفعل.",
      });
    }

    const existing = await UserModel.findOne({
      $or: [
        { phone: registration.phone },
        ...(registration.email
          ? [{ email: registration.email }]
          : []),
      ],
    });

    if (existing) {
      return res.status(409).json({
        message: "يوجد حساب مستخدم بنفس الهاتف أو البريد.",
      });
    }

    const user = await UserModel.create({
      role: "captain",
      status: "active",
      fullName: registration.fullName,
      phone: registration.phone,
      email: registration.email || undefined,
      passwordHash: registration.passwordHash,
      governorateId: registration.governorateId,
      areaId: registration.areaId,
      isOnline: false,
      approvedAt: new Date(),
      approvedBy: req.user?.sub,
    });

    registration.status = "approved";
    registration.reviewedAt = new Date();
    registration.reviewedBy = new Types.ObjectId(req.user!.sub);
    registration.rejectionReason = null;

    await registration.save();

    return res.json({
      message: "تم اعتماد الكابتن وإنشاء الحساب.",
      captain: {
        id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("approveCaptainRegistration error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء اعتماد الطلب.",
    });
  }
}

export async function rejectCaptainRegistration(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { reason } = req.body;

    if (!reason || String(reason).trim().length < 2) {
      return res.status(400).json({
        message: "سبب الرفض مطلوب.",
      });
    }

    const registration = await CaptainRegistrationModel.findById(
      req.params.id,
    );

    if (!registration) {
      return res.status(404).json({
        message: "طلب التسجيل غير موجود.",
      });
    }

    if (registration.status !== "pending") {
      return res.status(400).json({
        message: "طلب التسجيل تمت مراجعته بالفعل.",
      });
    }

    registration.status = "rejected";
    registration.rejectionReason = String(reason).trim();
    registration.reviewedAt = new Date();
    registration.reviewedBy = new Types.ObjectId(req.user!.sub);

    await registration.save();

    return res.json({
      message: "تم رفض طلب التسجيل.",
    });
  } catch (error) {
    console.error("rejectCaptainRegistration error:", error);
    return res.status(500).json({
      message: "حدث خطأ أثناء رفض الطلب.",
    });
  }
}
TS

# =========================================================
# 3) Captain Documents
# =========================================================
cat > src/controllers/captain-document.controller.ts <<'TS'
import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import CaptainDocumentModel from "../models/CaptainDocument.js";

export async function createDocument(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    const {
      documentType,
      documentNumber,
      fileUrl,
      expiresAt,
    } = req.body;

    if (!captainId || !documentType || !documentNumber || !fileUrl) {
      return res.status(400).json({
        message: "بيانات الوثيقة ناقصة.",
      });
    }

    const doc = await CaptainDocumentModel.create({
      captainId,
      documentType,
      documentNumber,
      fileUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: "pending",
      submittedAt: new Date(),
    });

    return res.status(201).json({
      message: "تم رفع الوثيقة للمراجعة.",
      document: doc,
    });
  } catch (error) {
    console.error("createDocument error:", error);
    return res.status(500).json({
      message: "تعذر حفظ الوثيقة.",
    });
  }
}

export async function listMyDocuments(
  req: AuthenticatedRequest,
  res: Response,
) {
  const docs = await CaptainDocumentModel.find({
    captainId: req.user?.sub,
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ documents: docs });
}

export async function listCaptainDocuments(
  req: AuthenticatedRequest,
  res: Response,
) {
  const filter =
    req.params.captainId &&
    Types.ObjectId.isValid(req.params.captainId)
      ? { captainId: req.params.captainId }
      : {};

  const docs = await CaptainDocumentModel.find(filter)
    .populate("captainId", "fullName phone")
    .populate("reviewedBy", "fullName")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ documents: docs });
}

export async function reviewDocument(
  req: AuthenticatedRequest,
  res: Response,
) {
  const { status, reason } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      message: "حالة المراجعة غير صحيحة.",
    });
  }

  const doc = await CaptainDocumentModel.findById(req.params.id);

  if (!doc) {
    return res.status(404).json({
      message: "الوثيقة غير موجودة.",
    });
  }

  doc.status = status;
  doc.reviewedAt = new Date();
  doc.reviewedBy = new Types.ObjectId(req.user!.sub);
  doc.rejectionReason =
    status === "rejected" ? String(reason || "").trim() : null;

  await doc.save();

  return res.json({
    message: status === "approved"
      ? "تم اعتماد الوثيقة."
      : "تم رفض الوثيقة.",
    document: doc,
  });
}
TS

# =========================================================
# 4) Captain Work Areas
# =========================================================
cat > src/controllers/captain-work-area.controller.ts <<'TS'
import { Response } from "express";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import CaptainWorkAreaModel from "../models/CaptainWorkArea.js";

export async function addWorkArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.params.captainId || req.user?.sub;
    const { governorateId, areaId } = req.body;

    if (
      !captainId ||
      !governorateId ||
      !areaId ||
      !Types.ObjectId.isValid(governorateId) ||
      !Types.ObjectId.isValid(areaId)
    ) {
      return res.status(400).json({
        message: "بيانات منطقة العمل غير صحيحة.",
      });
    }

    const exists = await CaptainWorkAreaModel.findOne({
      captainId,
      governorateId,
      areaId,
    });

    if (exists) {
      if (!exists.isActive) {
        exists.isActive = true;
        await exists.save();
      }

      return res.json({
        message: "منطقة العمل موجودة بالفعل.",
        workArea: exists,
      });
    }

    const workArea = await CaptainWorkAreaModel.create({
      captainId,
      governorateId,
      areaId,
      isActive: true,
    });

    return res.status(201).json({
      message: "تمت إضافة منطقة العمل.",
      workArea,
    });
  } catch (error) {
    console.error("addWorkArea error:", error);
    return res.status(500).json({
      message: "تعذر إضافة منطقة العمل.",
    });
  }
}

export async function listWorkAreas(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = req.params.captainId || req.user?.sub;

  const rows = await CaptainWorkAreaModel.find({
    captainId,
  })
    .populate("governorateId", "name")
    .populate("areaId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ workAreas: rows });
}

export async function toggleWorkArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  const row = await CaptainWorkAreaModel.findById(req.params.id);

  if (!row) {
    return res.status(404).json({
      message: "منطقة العمل غير موجودة.",
    });
  }

  row.isActive = !row.isActive;
  await row.save();

  return res.json({
    message: row.isActive
      ? "تم تفعيل منطقة العمل."
      : "تم تعطيل منطقة العمل.",
    workArea: row,
  });
}

export async function deleteWorkArea(
  req: AuthenticatedRequest,
  res: Response,
) {
  const row = await CaptainWorkAreaModel.findByIdAndDelete(
    req.params.id,
  );

  if (!row) {
    return res.status(404).json({
      message: "منطقة العمل غير موجودة.",
    });
  }

  return res.json({
    message: "تم حذف منطقة العمل.",
  });
}
TS

# =========================================================
# 5) Captain Ledger
# =========================================================
cat > src/controllers/captain-ledger.controller.ts <<'TS'
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getCaptainBalance,
} from "../services/captain-ledger.service.js";
import CaptainLedgerModel from "../models/CaptainLedger.js";

export async function myLedger(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = req.user?.sub;

  if (!captainId) {
    return res.status(401).json({
      message: "غير مصرح.",
    });
  }

  const entries = await CaptainLedgerModel.find({ captainId })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const balance = await getCaptainBalance(captainId);

  return res.json({
    balance,
    entries,
  });
}

export async function captainLedger(
  req: AuthenticatedRequest,
  res: Response,
) {
  const captainId = req.params.captainId;

  const entries = await CaptainLedgerModel.find({ captainId })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const balance = await getCaptainBalance(captainId);

  return res.json({
    balance,
    entries,
  });
}
TS

# =========================================================
# 6) Delivery Proof
# =========================================================
cat > src/controllers/delivery-proof.controller.ts <<'TS'
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createDeliveryOtp,
  verifyDeliveryOtp,
  setDeliveryPhoto,
  getDeliveryProof,
} from "../services/delivery-proof.service.js";

export async function createOtp(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    if (!captainId) {
      return res.status(401).json({
        message: "غير مصرح.",
      });
    }

    const result = await createDeliveryOtp(
      req.params.orderId,
      captainId,
    );

    return res.json({
      message: "تم إنشاء رمز التسليم.",
      ...result,
    });
  } catch (error) {
    console.error("createOtp error:", error);
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر إنشاء رمز التسليم.",
    });
  }
}

export async function verifyOtp(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    if (!captainId) {
      return res.status(401).json({
        message: "غير مصرح.",
      });
    }

    const result = await verifyDeliveryOtp(
      req.params.orderId,
      captainId,
      String(req.body.otp || ""),
    );

    return res.json({
      message: "تم التحقق من رمز التسليم.",
      ...result,
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر التحقق من رمز التسليم.",
    });
  }
}

export async function uploadPhoto(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const captainId = req.user?.sub;

    if (!captainId) {
      return res.status(401).json({
        message: "غير مصرح.",
      });
    }

    const result = await setDeliveryPhoto(
      req.params.orderId,
      captainId,
      String(req.body.photoUrl || ""),
    );

    return res.json({
      message: "تم حفظ صورة إثبات التسليم.",
      proof: result,
    });
  } catch (error) {
    console.error("uploadPhoto error:", error);
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر حفظ الصورة.",
    });
  }
}

export async function proofDetails(
  req: AuthenticatedRequest,
  res: Response,
) {
  const proof = await getDeliveryProof(req.params.orderId);

  if (!proof) {
    return res.status(404).json({
      message: "لا يوجد إثبات تسليم لهذا الطلب.",
    });
  }

  return res.json({ proof });
}
TS

# =========================================================
# 7) System Settings Controller
# =========================================================
cat > src/controllers/system-settings.controller.ts <<'TS'
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../services/system-settings.service.js";

export async function getSettings(
  req: AuthenticatedRequest,
  res: Response,
) {
  const settings = await getSystemSettings();

  return res.json({
    settings,
  });
}

export async function updateSettings(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const allowed = [
      "requireDeliveryOtp",
      "requireDeliveryPhoto",
      "deliveryOtpExpirationMinutes",
      "deliveryOtpMaxAttempts",
      "requireCaptainWorkArea",
    ];

    const data: Record<string, unknown> = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key];
      }
    }

    const settings = await updateSystemSettings(data);

    return res.json({
      message: "تم تحديث إعدادات النظام.",
      settings,
    });
  } catch (error) {
    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : "تعذر تحديث الإعدادات.",
    });
  }
}
TS

# =========================================================
# 8) Routes
# =========================================================
cat > src/routes/captain-attendance.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  checkIn,
  checkOut,
  myAttendance,
  adminAttendance,
} from "../controllers/captain-attendance.controller.js";

const router = Router();

router.post("/check-in", requireAuth, checkIn);
router.post("/check-out", requireAuth, checkOut);
router.get("/me", requireAuth, myAttendance);
router.get("/", requireAuth, requireAdmin, adminAttendance);

export default router;
TS

cat > src/routes/captain-registration.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  registerCaptain,
  listCaptainRegistrations,
  approveCaptainRegistration,
  rejectCaptainRegistration,
} from "../controllers/captain-registration.controller.js";

const router = Router();

router.post("/", registerCaptain);
router.get("/", requireAuth, requireAdmin, listCaptainRegistrations);
router.post("/:id/approve", requireAuth, requireAdmin, approveCaptainRegistration);
router.post("/:id/reject", requireAuth, requireAdmin, rejectCaptainRegistration);

export default router;
TS

cat > src/routes/captain-document.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  createDocument,
  listMyDocuments,
  listCaptainDocuments,
  reviewDocument,
} from "../controllers/captain-document.controller.js";

const router = Router();

router.post("/", requireAuth, createDocument);
router.get("/me", requireAuth, listMyDocuments);
router.get("/captain/:captainId", requireAuth, requireAdmin, listCaptainDocuments);
router.patch("/:id/review", requireAuth, requireAdmin, reviewDocument);

export default router;
TS

cat > src/routes/captain-work-area.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  addWorkArea,
  listWorkAreas,
  toggleWorkArea,
  deleteWorkArea,
} from "../controllers/captain-work-area.controller.js";

const router = Router();

router.post("/me", requireAuth, addWorkArea);
router.get("/me", requireAuth, listWorkAreas);

router.post("/:captainId", requireAuth, requireAdmin, addWorkArea);
router.get("/:captainId", requireAuth, requireAdmin, listWorkAreas);
router.patch("/:id/toggle", requireAuth, requireAdmin, toggleWorkArea);
router.delete("/:id", requireAuth, requireAdmin, deleteWorkArea);

export default router;
TS

cat > src/routes/captain-ledger.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  myLedger,
  captainLedger,
} from "../controllers/captain-ledger.controller.js";

const router = Router();

router.get("/me", requireAuth, myLedger);
router.get("/:captainId", requireAuth, requireAdmin, captainLedger);

export default router;
TS

cat > src/routes/delivery-proof.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
} from "../middleware/auth.middleware.js";
import {
  createOtp,
  verifyOtp,
  uploadPhoto,
  proofDetails,
} from "../controllers/delivery-proof.controller.js";

const router = Router();

router.post("/:orderId/otp", requireAuth, createOtp);
router.post("/:orderId/otp/verify", requireAuth, verifyOtp);
router.post("/:orderId/photo", requireAuth, uploadPhoto);
router.get("/:orderId", requireAuth, proofDetails);

export default router;
TS

cat > src/routes/system-settings.routes.ts <<'TS'
import { Router } from "express";
import {
  requireAuth,
  requireAdmin,
} from "../middleware/auth.middleware.js";
import {
  getSettings,
  updateSettings,
} from "../controllers/system-settings.controller.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, getSettings);
router.patch("/", requireAuth, requireAdmin, updateSettings);

export default router;
TS

# =========================================================
# 9) Register routes in server.ts
# =========================================================
python3 - <<'PY'
from pathlib import Path

p = Path("src/server.ts")
s = p.read_text()

imports = [
'import captainAttendanceRoutes from "./routes/captain-attendance.routes.js";',
'import captainRegistrationRoutes from "./routes/captain-registration.routes.js";',
'import captainDocumentRoutes from "./routes/captain-document.routes.js";',
'import captainWorkAreaRoutes from "./routes/captain-work-area.routes.js";',
'import captainLedgerRoutes from "./routes/captain-ledger.routes.js";',
'import deliveryProofRoutes from "./routes/delivery-proof.routes.js";',
'import systemSettingsRoutes from "./routes/system-settings.routes.js";',
]

anchor = 'import dispatchRoutes from "./routes/dispatch.routes.js";'

for imp in imports:
    if imp not in s:
        s = s.replace(anchor, anchor + "\n" + imp)

mounts = [
'app.use("/api/captain-attendance", captainAttendanceRoutes);',
'app.use("/api/captain-registration", captainRegistrationRoutes);',
'app.use("/api/captain-documents", captainDocumentRoutes);',
'app.use("/api/captain-work-areas", captainWorkAreaRoutes);',
'app.use("/api/captain-ledger", captainLedgerRoutes);',
'app.use("/api/delivery-proof", deliveryProofRoutes);',
'app.use("/api/system-settings", systemSettingsRoutes);',
]

anchor2 = 'app.use("/api/dispatch", dispatchRoutes);'

for mount in mounts:
    if mount not in s:
        s = s.replace(anchor2, anchor2 + "\n" + mount)

p.write_text(s)
PY

# =========================================================
# 10) Delivery proof before delivered
# =========================================================
python3 - <<'PY'
from pathlib import Path

p = Path("src/controllers/order.controller.ts")
s = p.read_text()

imp = 'import { assertDeliveryProof } from "../services/delivery-proof.service.js";'

if imp not in s:
    lines = s.splitlines()
    pos = 0
    while pos < len(lines) and lines[pos].startswith("import "):
        pos += 1
    lines.insert(pos, imp)
    s = "\n".join(lines) + ("\n" if s.endswith("\n") else "")

needle = 'if (nextStatus === "delivered") {'
if needle in s and 'assertDeliveryProof(order._id' not in s:
    replacement = '''if (nextStatus === "delivered") {
      if (!order.captainId) {
        return res.status(400).json({
          message: "لا يمكن تسليم طلب بدون كابتن.",
        });
      }

      try {
        await assertDeliveryProof(order._id, order.captainId);
      } catch (error) {
        return res.status(400).json({
          message:
            error instanceof Error
              ? error.message
              : "إثبات التسليم مطلوب قبل إتمام الطلب.",
        });
      }
'''
    s = s.replace(needle, replacement, 1)

p.write_text(s)
PY

# =========================================================
# 11) Dispatch work-area eligibility
# =========================================================
python3 - <<'PY'
from pathlib import Path

p = Path("src/services/dispatch.service.ts")
s = p.read_text()

imp = 'import CaptainWorkAreaModel from "../models/CaptainWorkArea.js";'

if imp not in s:
    lines = s.splitlines()
    pos = 0
    while pos < len(lines) and lines[pos].startswith("import "):
        pos += 1
    lines.insert(pos, imp)
    s = "\n".join(lines) + ("\n" if s.endswith("\n") else "")

# Add setting fallback without breaking existing captains.
needle = 'const candidates = await UserModel.find({'
if needle in s and 'CaptainWorkAreaModel' in s and 'requireCaptainWorkArea' not in s[s.find(needle)-1000:s.find(needle)]:
    s = s.replace(
        needle,
        '''const systemSettings = await (await import("./system-settings.service.js")).getSystemSettings();

    const candidates = await UserModel.find({''',
        1,
    )

# Add explicit work-area filtering after candidate load.
needle2 = 'const candidates = await UserModel.find({'
start = s.find(needle2)

if start != -1:
    marker = 'const eligibleCandidates'
    if marker not in s[start:start+12000]:
        # Find end of find(...).lean() chain.
        end = s.find('.lean();', start)
        if end != -1:
            insert_at = end + len('.lean();')
            code = '''

    let eligibleCandidates = candidates;

    if (systemSettings.requireCaptainWorkArea) {
      const candidateIds = candidates.map((candidate) => candidate._id);

      const workAreas = await CaptainWorkAreaModel.find({
        captainId: { $in: candidateIds },
        isActive: true,
      }).select("captainId governorateId areaId").lean();

      const withExplicitAreas = new Set(
        workAreas.map((row) => String(row.captainId)),
      );

      const allowedByArea = new Set(
        workAreas
          .filter((row) =>
            (!orderAddress.governorateId ||
              String(row.governorateId) === String(orderAddress.governorateId)) &&
            (!orderAddress.areaId ||
              String(row.areaId) === String(orderAddress.areaId)),
          )
          .map((row) => String(row.captainId)),
      );

      eligibleCandidates = candidates.filter((candidate) => {
        const id = String(candidate._id);

        // Existing captains without explicit work-area records
        // continue using their normal governorate/area assignment.
        if (!withExplicitAreas.has(id)) return true;

        return allowedByArea.has(id);
      });
    }
'''
            s = s[:insert_at] + code + s[insert_at:]
            s = s.replace('const eligibleCandidates = candidates;', '/* eligibleCandidates already calculated above */', 1)

            # Replace subsequent candidates loops only within function area.
            func_end = s.find('\n}', insert_at)
            segment_end = s.find('\nexport ', insert_at)
            if segment_end == -1:
                segment_end = len(s)

            segment = s[insert_at:segment_end]
            segment = segment.replace('for (const candidate of candidates)', 'for (const candidate of eligibleCandidates)')
            s = s[:insert_at] + segment + s[segment_end:]

p.write_text(s)
PY

# =========================================================
# 12) Acceptance capacity check
# =========================================================
python3 - <<'PY'
from pathlib import Path

p = Path("src/services/dispatch-manager.service.ts")
s = p.read_text()

if 'active orders' not in s:
    needle = 'const canWork = await captainCanWorkNow(captainId);'
    if needle in s:
        replacement = '''const canWork = await captainCanWorkNow(captainId);'''
        s = s.replace(needle, replacement, 1)

# Ensure capacity is checked during acceptance.
needle = 'if (!canWork) throw new Error("لا يمكنك قبول الطلب خارج الشفت.");'

if needle in s and 'maxActiveOrdersPerCaptain' not in s[s.find(needle)-3000:s.find(needle)+3000]:
    replacement = '''if (!canWork) throw new Error("لا يمكنك قبول الطلب خارج الشفت.");

const settings = await getSettings();

const activeOrdersCount = await OrderModel.countDocuments({
  captainId,
  status: { $in: ["assigned", "picked_up", "on_the_way"] },
});

if (activeOrdersCount >= settings.maxActiveOrdersPerCaptain) {
  throw new Error("وصل الكابتن إلى الحد الأقصى للطلبات النشطة.");
}'''
    s = s.replace(needle, replacement, 1)

p.write_text(s)
PY

# =========================================================
# 13) TypeScript check
# =========================================================
echo
echo "========================================"
echo "تشغيل TypeScript"
echo "========================================"

npx tsc --noEmit

echo
echo "========================================"
echo "تم دمج الأقسام 12 → 20."
echo "TypeScript PASS"
echo "========================================"

read -r -p "اضغط Enter للخروج..."
