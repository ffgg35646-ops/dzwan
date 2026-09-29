import { Schema, model, type Document, type Types } from "mongoose";

export interface IAuditLog extends Document {
  actorId?: Types.ObjectId | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  description?: string | null;
  createdAt: Date;
}

const schema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      default: null,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    before: {
      type: Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
      maxlength: 3000,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

schema.index({ createdAt: -1 });

export const AuditLogModel =
  model<IAuditLog>("AuditLog", schema);
