import { UserModel } from "../models/User.js";
import {
  comparePassword,
  hashPassword,
} from "../utils/password.js";

export async function authenticateUser(
  identifier: string,
  password: string,
) {
  const isEmail = identifier.includes("@");

  const query = isEmail
    ? { email: identifier.toLowerCase().trim() }
    : { phone: identifier.trim() };

  const user = await UserModel.findOne({
    ...query,
    status: "active",
  }).select("+passwordHash");

  if (!user) {
    const existingUser = await UserModel.findOne(query)
      .select("_id status")
      .lean();

    if (existingUser && existingUser.status !== "active") {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await comparePassword(
    password,
    user.passwordHash,
  );

  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
}

export async function createPasswordHash(
  password: string,
): Promise<string> {
  return hashPassword(password);
}
