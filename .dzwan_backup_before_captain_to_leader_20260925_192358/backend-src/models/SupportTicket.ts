import mongoose, {
  Schema,
} from "mongoose";

const SupportMessageSchema =
  new Schema(
    {
      senderId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      senderRole: {
        type: String,
        required: true,
        enum: [
          "captain",
          "shop",
          "restaurant",
          "admin",
          "super_admin",
          "governorate_leader",
          "area_leader",
        ],
      },

      body: {
        type: String,
        required: true,
        trim: true,
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: true,
    },
  );

const SupportTicketSchema =
  new Schema(
    {
      ticketNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      openedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      source: {
        type: String,
        required: true,
        enum: ["captain", "shop"],
        index: true,
      },

      type: {
        type: String,
        required: true,
        enum: ["complaint", "emergency"],
        default: "complaint",
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
      },

      orderReference: {
        type: String,
        default: "",
        trim: true,
      },

      status: {
        type: String,
        required: true,
        enum: [
          "open",
          "in_progress",
          "closed",
        ],
        default: "open",
        index: true,
      },

      messages: {
        type: [SupportMessageSchema],
        default: [],
      },

      lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true,
      },

      lastMessageSenderRole: {
        type: String,
        default: "",
        index: true,
      },

      /*
       * آخر وقت فتح فيه المستخدم تذكرة/ردود الدعم.
       * يستخدم فقط لمعرفة هل يوجد رد جديد من الأدمن.
       */
      userLastReadAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

export const SupportTicketModel =
  mongoose.models.SupportTicket ||
  mongoose.model(
    "SupportTicket",
    SupportTicketSchema,
  );
