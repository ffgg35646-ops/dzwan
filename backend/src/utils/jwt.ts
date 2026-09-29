import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

const ACCESS_TOKEN_EXPIRES_IN = process.env.NODE_ENV === "production" ? "15m" : "3650d";
const REFRESH_TOKEN_EXPIRES_IN = process.env.NODE_ENV === "production" ? "30d" : "3650d";

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export function signAccessToken(
  payload: AccessTokenPayload,
): string {
  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  };

  return jwt.sign(payload, env.jwtSecret, options);
}

export function signRefreshToken(
  payload: AccessTokenPayload,
): string {
  const options: SignOptions = {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  };

  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(
  token: string,
): AccessTokenPayload {
  const decoded: unknown = jwt.verify(token, env.jwtSecret);

  if (
    typeof decoded !== "object" ||
    decoded === null
  ) {
    throw new Error("INVALID_TOKEN_PAYLOAD");
  }

  const payload = decoded as Record<string, unknown>;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("INVALID_TOKEN_PAYLOAD");
  }

  return {
    sub: payload.sub,
    role: payload.role,
  };
}
