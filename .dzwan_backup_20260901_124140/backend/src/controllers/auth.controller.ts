import type { Request, Response } from "express";
import { authenticateUser } from "../services/auth.service.js";
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

export async function login(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, phone, password } = req.body ?? {};

    const identifier =
      typeof email === "string" && email.trim()
        ? email.trim()
        : typeof phone === "string"
          ? phone.trim()
          : "";

    if (!identifier || typeof password !== "string" || !password) {
      res.status(400).json({
        success: false,
        message: "Email or phone and password are required.",
      });
      return;
    }

    const user = await authenticateUser(identifier, password);

    const payload = {
      sub: user._id.toString(),
      role: user.role,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie(ACCESS_COOKIE, accessToken, {
      ...baseCookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...baseCookieOptions,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email ?? null,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        res.status(401).json({
          success: false,
          message: "Invalid credentials.",
        });
        return;
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
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
    const token = req.cookies?.[ACCESS_COOKIE];

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

    if (!user || user.status !== "active") {
      res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email ?? null,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl ?? null,
      },
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
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(REFRESH_COOKIE, newRefreshToken, {
      ...baseCookieOptions,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email ?? null,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl ?? null,
      },
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
