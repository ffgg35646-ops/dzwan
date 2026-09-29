import mongoose, {
  Schema,
  model,
} from "mongoose";

const captainShiftSchema =
  new Schema(
    {
      // ------------------------------------------------------
      // Shift definition (Admin)
      // ------------------------------------------------------
      name: {
        type: String,
        trim: true,
        required: function (this: any) {
        return !this.shiftId;
      },
      },

      startTime: {
        type: String,
        required: function (this: any) {
        return !this.shiftId;
      },
      },

      endTime: {
        type: String,
        required: function (this: any) {
        return !this.shiftId;
      },
      },

      isActive: {
        type: Boolean,
        default: true,
      },

    isOpen: {
      type: Boolean,
      default: false,
    },


      // Kept optional for compatibility with the
      // existing day-based implementation.
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6,
        required: false,
      },

      // ------------------------------------------------------
      // Weekly captain assignment
      // ------------------------------------------------------
      captainId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: false,
        index: true,
      },

      shiftId: {
        type: Schema.Types.ObjectId,
        ref: "CaptainShift",
        required: false,
        index: true,
      },

      weekStart: {
        type: Date,
        required: false,
        index: true,
      },

      changedAt: {
        type: Date,
        required: false,
      },

      changeCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
    },
  );

captainShiftSchema.index({
  captainId: 1,
  weekStart: 1,
});

captainShiftSchema.index({
  isActive: 1,
});

export const CaptainShiftModel =
  mongoose.models.CaptainShift ||
  model("CaptainShift", captainShiftSchema);
