import type { Request, Response } from "express";
import crypto from "node:crypto";
import { Types } from "mongoose";
import PasswordResetVerificationModel from "../models/PasswordResetVerification.js";
import { UserModel } from "../models/User.js";
import CaptainRegistrationModel from "../models/CaptainRegistration.js";
import { LocationModel } from "../models/Location.js";
import EstablishmentRegistrationModel from "../models/EstablishmentRegistration.js";
import {
  createOtp,
  hashOtp,
  sendPasswordResetOtp,
} from "../services/email.service.js";
import { createPasswordHash } from "../services/auth.service.js";
import { authenticateUser } from "../services/auth.service.js";
import { logSecurity } from "../services/ops-31-47.service.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "../utils/jwt.js";

const ACCESS_COOKIE = "dzwan_access";
const REFRESH_COOKIE = "dzwan_refresh";

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};


async function buildAuthUserResponse(user: any) {
  let fullName = user.fullName;
  let phone = user.phone;
  let email = user.email ?? null;
  let governorateId = user.governorateId ?? null;
  let areaId = user.areaId ?? null;

  if (user.role === "captain") {
    const registration =
      await CaptainRegistrationModel.findOne({
        phone: user.phone,
        status: "approved",
      })
        .sort({ createdAt: -1 })
        .select(
          "fullName phone email gmail governorateId areaId",
        )
        .lean();

    if (registration) {
      fullName = registration.fullName || fullName;
      phone = registration.phone || phone;

      email =
        user.email ||
        registration.email ||
        registration.gmail ||
        null;

      governorateId =
        registration.governorateId ||
        governorateId ||
        null;

      areaId =
        registration.areaId ||
        areaId ||
        null;
    }
  }

  const locationIds = [governorateId, areaId]
    .filter(Boolean)
    .map((id) => String(id))
    .filter((id) => Types.ObjectId.isValid(id));

  const locations = locationIds.length
    ? await LocationModel.find({
        _id: { $in: locationIds },
      })
        .select("_id name")
        .lean()
    : [];

  const locationMap = new Map(
    locations.map((item: any) => [
      String(item._id),
      String(item.name || ""),
    ]),
  );

  return {
    id: user._id.toString(),
    fullName,
    name: fullName,
    email,
    phone,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl ?? null,
    governorateId: governorateId
      ? String(governorateId)
      : null,
    areaId: areaId ? String(areaId) : null,
    governorateName: governorateId
      ? locationMap.get(String(governorateId)) || null
      : null,
    areaName: areaId
      ? locationMap.get(String(areaId)) || null
      : null,
  };
}

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  const { email, phone, password } = req.body ?? {};

  const identifier =
    typeof email === "string" && email.trim()
      ? email.trim()
      : typeof phone === "string"
        ? phone.trim()
        : "";

  try {

    if (!identifier || typeof password !== "string" || !password) {
      res.status(400).json({
        success: false,
        message: "Email or phone and password are required.",
      });
      return;
    }

    const user = await authenticateUser(identifier, password);

    await logSecurity({
      userId: user._id,
      type: "login.success",
      severity: "info",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
      path: req.path,
      method: req.method,
      message: "تم تسجيل الدخول بنجاح.",
      metadata: {
        identifier,
        role: user.role,
      },
    });

    const payload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie(ACCESS_COOKIE, accessToken, {
      ...baseCookieOptions,
      maxAge: process.env.NODE_ENV === "production" ? 15 * 60 * 1000 : 3650 * 24 * 60 * 60 * 1000,
    });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...baseCookieOptions,
      sameSite: "strict",
      maxAge: process.env.NODE_ENV === "production" ? 30 * 24 * 60 * 60 * 1000 : 3650 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      accessToken,
      user: await buildAuthUserResponse(user),
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        await logSecurity({
          type: "login.failed",
          severity: "warning",
          ip: req.ip,
          userAgent: req.get("user-agent") ?? null,
          path: req.path,
          method: req.method,
          message: "محاولة تسجيل دخول فاشلة.",
          metadata: {
            identifier,
          },
        });

        res.status(401).json({
          success: false,
          message: "Invalid credentials.",
        });
        return;
      }

      if (error.message === "ACCOUNT_SUSPENDED") {
        res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message: "تم إيقاف حسابك\nيمكنك التواصل مع الدعم",
        });
        return;
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        await logSecurity({
          type: "login.blocked",
          severity: "warning",
          ip: req.ip,
          userAgent: req.get("user-agent") ?? null,
          path: req.path,
          method: req.method,
          message: "محاولة دخول إلى حساب غير نشط.",
          metadata: {
            identifier,
          },
        });

        res.status(403).json({
          success: false,
          message: "Account is not active.",
        });
        return;
      }
    }

    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
}

export async function me(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const authHeader = req.get("authorization");

    const bearerToken =
      typeof authHeader === "string" &&
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    const token =
      bearerToken || req.cookies?.[ACCESS_COOKIE];

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const payload = verifyToken(token);

    const { UserModel } = await import("../models/User.js");

    const user = await UserModel.findById(payload.sub).select(
      "fullName email phone role status avatarUrl",
    );

    if (user?.status === "suspended") {
      res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "تم إيقاف حسابك\nيمكنك التواصل مع الدعم",
      });
      return;
    }

    if (!user || user.status !== "active") {
      res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: await buildAuthUserResponse(user),
    });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired session.",
    });
  }
}


export async function refresh(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token required.",
      });
      return;
    }

    const payload = verifyToken(refreshToken);

    const { UserModel } =
      await import("../models/User.js");

    const user = await UserModel.findById(payload.sub).select(
      "_id fullName email phone role status avatarUrl",
    );

    if (user?.status === "suspended") {
      res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "تم إيقاف حسابك\nيمكنك التواصل مع الدعم",
      });
      return;
    }

    if (!user || user.status !== "active") {
      res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
      return;
    }

    const tokenPayload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    res.cookie(ACCESS_COOKIE, accessToken, {
      ...baseCookieOptions,
      maxAge: process.env.NODE_ENV === "production" ? 15 * 60 * 1000 : 3650 * 24 * 60 * 60 * 1000,
    });

    res.cookie(REFRESH_COOKIE, newRefreshToken, {
      ...baseCookieOptions,
      sameSite: "strict",
      maxAge: process.env.NODE_ENV === "production" ? 30 * 24 * 60 * 60 * 1000 : 3650 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user: await buildAuthUserResponse(user),
    });
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token.",
    });
  }
}

export async function logout(
  _req: Request,
  res: Response,
): Promise<void> {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions,
    sameSite: "strict",
  });

  res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
}


export async function requestPasswordReset(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      res.status(400).json({
        success: false,
        message: "البريد الإلكتروني غير صحيح.",
      });
      return;
    }

    let user = await UserModel.findOne({
      email,
      status: "active",
    }).select("_id email role phone");

    // Captain accounts may keep Gmail only on their approved
    // registration record, while User.email can be empty.
    if (!user) {
      const captainRegistration =
        await CaptainRegistrationModel.findOne({
          gmail: email,
          status: "approved",
        }).sort({ createdAt: -1 });

      if (captainRegistration) {
        user = await UserModel.findOne({
          role: "captain",
          phone: captainRegistration.phone,
          status: "active",
        }).select("_id email role phone");
      }
    }

    // Approved establishment owners store Gmail in User.email,
    // but this fallback also supports older approved records.
    if (!user) {
      const establishmentRegistration =
        await EstablishmentRegistrationModel.findOne({
          gmail: email,
          status: "approved",
        }).sort({ createdAt: -1 });

      if (establishmentRegistration) {
        user = await UserModel.findOne({
          role: "shop",
          phone: establishmentRegistration.ownerPhone,
          status: "active",
        }).select("_id email role phone");
      }
    }

    if (!user) {
      res.status(404).json({
        success: false,
        message: "لا يوجد حساب نشط مرتبط بهذا البريد الإلكتروني.",
      });
      return;
    }

    const otp = createOtp();

    await PasswordResetVerificationModel.deleteMany({
      userId: user._id,
      verifiedAt: null,
    });

    const verification =
      await PasswordResetVerificationModel.create({
        email,
        userId: user._id,
        otpHash: hashOtp(otp),
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        verifiedAt: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      });

    try {
      await sendPasswordResetOtp(email, otp);
    } catch (error) {
      await PasswordResetVerificationModel.findByIdAndDelete(
        verification._id,
      );
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "تم إرسال كود إعادة تعيين كلمة المرور إلى Gmail.",
      verificationId: verification._id,
    });
  } catch (error) {
    console.error("requestPasswordReset error:", error);

    res.status(500).json({
      success: false,
      message: "تعذر إرسال كود إعادة تعيين كلمة المرور.",
    });
  }
}

export async function verifyPasswordResetOtp(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const verificationId = String(
      req.body?.verificationId || "",
    ).trim();

    const otp = String(req.body?.otp || "").trim();

    if (!Types.ObjectId.isValid(verificationId) || !otp) {
      res.status(400).json({
        success: false,
        message: "معرّف التحقق والكود مطلوبان.",
      });
      return;
    }

    const verification =
      await PasswordResetVerificationModel.findById(
        verificationId,
      );

    if (!verification) {
      res.status(404).json({
        success: false,
        message: "طلب التحقق غير موجود أو انتهت صلاحيته.",
      });
      return;
    }

    if (
      verification.expiresAt.getTime() < Date.now()
    ) {
      res.status(400).json({
        success: false,
        message: "انتهت صلاحية كود التحقق.",
      });
      return;
    }

    if (verification.verifiedAt) {
      res.status(400).json({
        success: false,
        message: "تم التحقق من هذا الكود بالفعل.",
      });
      return;
    }

    if (verification.attempts >= 5) {
      res.status(429).json({
        success: false,
        message: "تم تجاوز عدد محاولات التحقق المسموح بها.",
      });
      return;
    }

    verification.attempts += 1;

    if (hashOtp(otp) !== verification.otpHash) {
      await verification.save();

      res.status(400).json({
        success: false,
        message: "كود التحقق غير صحيح.",
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    verification.verifiedAt = new Date();
    verification.resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    verification.resetTokenExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    await verification.save();

    res.status(200).json({
      success: true,
      message: "تم تأكيد الكود. يمكنك الآن تعيين كلمة مرور جديدة.",
      resetToken,
    });
  } catch (error) {
    console.error("verifyPasswordResetOtp error:", error);

    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء التحقق من الكود.",
    });
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const verificationId = String(
      req.body?.verificationId || "",
    ).trim();

    const resetToken = String(
      req.body?.resetToken || "",
    ).trim();

    const newPassword = String(
      req.body?.newPassword || "",
    );

    if (
      !Types.ObjectId.isValid(verificationId) ||
      !resetToken ||
      !newPassword
    ) {
      res.status(400).json({
        success: false,
        message: "بيانات إعادة تعيين كلمة المرور ناقصة.",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.",
      });
      return;
    }

    const verification =
      await PasswordResetVerificationModel.findById(
        verificationId,
      );

    if (
      !verification ||
      !verification.verifiedAt ||
      !verification.resetTokenHash ||
      !verification.resetTokenExpiresAt
    ) {
      res.status(400).json({
        success: false,
        message: "جلسة إعادة التعيين غير صالحة.",
      });
      return;
    }

    if (
      verification.resetTokenExpiresAt.getTime() <
      Date.now()
    ) {
      res.status(400).json({
        success: false,
        message: "انتهت صلاحية جلسة إعادة التعيين.",
      });
      return;
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    if (tokenHash !== verification.resetTokenHash) {
      res.status(400).json({
        success: false,
        message: "رمز إعادة التعيين غير صالح.",
      });
      return;
    }

    const user = await UserModel.findById(
      verification.userId,
    ).select("+passwordHash");

    if (user?.status === "suspended") {
      res.status(403).json({
        success: false,
        code: "ACCOUNT_SUSPENDED",
        message: "تم إيقاف حسابك\nيمكنك التواصل مع الدعم",
      });
      return;
    }

    if (!user || user.status !== "active") {
      res.status(404).json({
        success: false,
        message: "الحساب غير موجود أو غير نشط.",
      });
      return;
    }

    user.passwordHash = await createPasswordHash(
      newPassword,
    );

    await user.save();

    await PasswordResetVerificationModel.findByIdAndDelete(
      verification._id,
    );

    res.status(200).json({
      success: true,
      message: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.",
    });
  } catch (error) {
    console.error("resetPassword error:", error);

    res.status(500).json({
      success: false,
      message: "تعذر تغيير كلمة المرور.",
    });
  }
}
