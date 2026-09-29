import mongoose, { Schema, type Document } from "mongoose";

export interface ICaptainAttendance extends Document {
  captainId: mongoose.Types.ObjectId;
  shiftId?: mongoose.Types.ObjectId | null;
  date: Date;
  clockInAt?: Date | null;
  clockOutAt?: Date | null;
  durationMinutes: number;
  status: "present" | "closed" | "absent";
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICaptainAttendance>(
  {
    captainId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "CaptainShift",
      default: null,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    clockInAt: {
      type: Date,
      default: null,
    },
    clockOutAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["present", "closed", "absent"],
      default: "present",
    },
  },
  { timestamps: true }
);

export default mongoose.models.CaptainAttendance ||
  mongoose.model<ICaptainAttendance>(
    "CaptainAttendance",
    schema
  );
