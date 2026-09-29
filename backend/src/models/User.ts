import { Schema, model, type Document, type Types } from "mongoose";

export const USER_ROLES = [
  "super_admin",
  "admin",
  "governorate_leader",
  "area_leader",
  "captain",
  "customer",
  "shop",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = [
  "pending",
  "active",
  "rejected",
  "suspended",
  "inactive",
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export interface IUser extends Document {
  role: UserRole;
  status: AccountStatus;
  operationalEnabled: boolean;

  fullName: string;
  phone: string;
  email?: string;

  passwordHash: string;
  avatarUrl?: string | null;

  isOnline: boolean;
  lastSeenAt?: Date | null;
  lastLoginAt?: Date | null;

  approvedAt?: Date | null;
  approvedBy?: Types.ObjectId | null;

  rejectionReason?: string | null;
  suspensionReason?: string | null;

  governorateId?: Types.ObjectId | null;
  areaId?: Types.ObjectId | null;

  // Leader can supervise more than one area.
  // Captain/Shop accounts continue using areaId normally.
  areaIds?: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ACCOUNT_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },

    operationalEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    rejectionReason: {
      type: String,
      default: null,
      maxlength: 500,
    },

    suspensionReason: {
      type: String,
      default: null,
      maxlength: 500,
    },

    governorateId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
      index: true,
    },

    areaId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    // Used by area leaders for one or many assigned areas.
    areaIds: {
      type: [Schema.Types.ObjectId],
      default: [],
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ role: 1, governorateId: 1 });
UserSchema.index({ role: 1, governorateId: 1, areaId: 1 });
UserSchema.index({ role: 1, governorateId: 1, areaIds: 1 });
UserSchema.index({ createdAt: -1 });

export const UserModel = model<IUser>("User", UserSchema);
