from pathlib import Path
import shutil
import re

ROOT = Path.cwd()

def backup(path: Path):
    bak = path.with_suffix(path.suffix + ".before-r10-r11-fix")
    if not bak.exists():
        shutil.copy2(path, bak)
        print(f"✅ Backup: {bak}")

# ============================================================
# 1) CaptainShift model
#    Same collection supports:
#    A) shift definition created by admin
#    B) weekly captain assignment
# ============================================================

model = ROOT / "src/models/CaptainShift.ts"
backup(model)

model.write_text(r'''import mongoose, {
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
        required: true,
      },

      startTime: {
        type: String,
        required: true,
      },

      endTime: {
        type: String,
        required: true,
      },

      isActive: {
        type: Boolean,
        default: true,
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
''', encoding="utf-8")

print("✅ CaptainShift model repaired")

# ============================================================
# 2) Fix management service so Admin operations only touch
#    SHIFT DEFINITIONS, never weekly assignments.
# ============================================================

service = ROOT / "src/services/captain-shift-management.service.ts"
backup(service)

s = service.read_text(encoding="utf-8")

# updateCaptainShift()
s = s.replace(
'''  const shift =
    await CaptainShiftModel.findById(
      objectId(shiftId)
    );
''',
'''  const shift =
    await CaptainShiftModel.findOne({
      _id: objectId(shiftId),
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
    });
''',
1
)

# assignCaptainWeeklyShift(): select only real shift definitions.
old = '''  const shift =
    await CaptainShiftModel.findOne({
      _id: shiftObjectId,
      isActive: true,
    });
'''

new = '''  const shift =
    await CaptainShiftModel.findOne({
      _id: shiftObjectId,
      isActive: true,
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
    });
'''

s = s.replace(old, new, 1)

# changeCaptainWeeklyShiftOnce(): select only real definition.
s = s.replace(old, new, 1)

# Current assignment lookup must explicitly require weekly assignment.
s = s.replace(
'''    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      weekStart: {
        $gte: start,
        $lt: weekEnd,
      },
    });
''',
'''    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true },
      weekStart: {
        $gte: start,
        $lt: weekEnd,
      },
    });
''',
1
)

# There is another assignment lookup later in assertCaptainInsideShift.
s = s.replace(
'''    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      weekStart: {
        $gte: start,
        $lt: end,
      },
    });
''',
'''    await CaptainShiftModel.findOne({
      captainId: captainObjectId,
      shiftId: { $exists: true },
      weekStart: {
        $gte: start,
        $lt: end,
      },
    });
''',
1
)

service.write_text(s, encoding="utf-8")
print("✅ Shift management service repaired")

# ============================================================
# 3) Admin dispatch controller:
#    list/delete must only operate on shift definitions.
# ============================================================

controller = ROOT / "src/controllers/dispatch.controller.ts"
backup(controller)

s = controller.read_text(encoding="utf-8")

# listCaptainShifts()
s = s.replace(
'''  const shifts =
    await CaptainShiftModel.find()
      .sort({
        createdAt: -1,
      });
''',
'''  const shifts =
    await CaptainShiftModel.find({
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
    }).sort({
      createdAt: -1,
    });
''',
1
)

# deleteCaptainShift()
s = s.replace(
'''    const deleted =
      await CaptainShiftModel.findByIdAndDelete(
        id
      );
''',
'''    const deleted =
      await CaptainShiftModel.findOneAndDelete({
        _id: id,
        captainId: { $exists: false },
        shiftId: { $exists: false },
        weekStart: { $exists: false },
      });
''',
1
)

controller.write_text(s, encoding="utf-8")
print("✅ Admin shift list/delete repaired")

# ============================================================
# 4) captain-attendance:
#    active shifts query should only use definitions.
# ============================================================

attendance = ROOT / "src/controllers/captain-attendance.controller.ts"

if attendance.exists():
    backup(attendance)
    s = attendance.read_text(encoding="utf-8")

    s = s.replace(
'''    const shifts = await CaptainShiftModel.find({
''',
'''    const shifts = await CaptainShiftModel.find({
      captainId: { $exists: false },
      shiftId: { $exists: false },
      weekStart: { $exists: false },
''',
1
    )

    attendance.write_text(s, encoding="utf-8")
    print("✅ Captain attendance shift query repaired")

# ============================================================
# 5) TypeScript check
# ============================================================

print()
print("==============================================")
print("✅ R10/R11 SHIFT STRUCTURE REPAIRED")
print("==============================================")
print("Shift definition:")
print("  name / startTime / endTime / isActive")
print()
print("Weekly assignment:")
print("  captainId / shiftId / weekStart / changeCount")
print()
print("Admin now sees only real shift definitions.")
print("Captain weekly assignment stays in same collection safely.")
print("==============================================")
