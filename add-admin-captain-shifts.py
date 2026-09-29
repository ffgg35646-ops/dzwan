from pathlib import Path
import re
import shutil

ROOT = Path.cwd()
ADMIN = ROOT / "admin/src"

# ------------------------------------------------------------
# Detect router file
# ------------------------------------------------------------

router_candidates = [
    ADMIN / "App.tsx",
    ADMIN / "App.jsx",
    ADMIN / "main.tsx",
    ADMIN / "routes.tsx",
    ADMIN / "router.tsx",
]

router = next((p for p in router_candidates if p.exists()), None)

if router:
    print(f"✅ Router detected: {router}")
else:
    print("⚠️ لم يتم العثور على ملف Router تلقائيًا.")

# ------------------------------------------------------------
# Create CaptainShifts page
# ------------------------------------------------------------

pages = ADMIN / "pages"
pages.mkdir(parents=True, exist_ok=True)

page = pages / "CaptainShifts.tsx"

if page.exists():
    backup = page.with_suffix(".tsx.before-r10")
    if not backup.exists():
        shutil.copy2(page, backup)

page.write_text(r'''import { useEffect, useState } from "react";

type Shift = {
  _id: string;
  name?: string;
  captainId?: string | null;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const API =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:4000/api";

const DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function CaptainShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  async function loadShifts() {
    setLoading(true);

    try {
      const response = await fetch(
        `${API}/captain-shifts`,
        {
          credentials: "include",
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "تعذر تحميل الشفتات."
        );
      }

      const list =
        json?.data ||
        json?.shifts ||
        [];

      setShifts(
        Array.isArray(list)
          ? list
          : []
      );
    } catch (error: any) {
      alert(
        error?.message ||
          "تعذر تحميل الشفتات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadShifts();
  }, []);

  async function createShift() {
    if (!name.trim()) {
      alert("اكتب اسم الشفت.");
      return;
    }

    if (!startTime || !endTime) {
      alert("حدد وقت البداية والنهاية.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API}/captain-shifts`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            dayOfWeek,
            startTime,
            endTime,
            isActive: true,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "تعذر إنشاء الشفت."
        );
      }

      setName("");
      setStartTime("08:00");
      setEndTime("16:00");

      await loadShifts();
    } catch (error: any) {
      alert(
        error?.message ||
          "تعذر إنشاء الشفت."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleShift(
    shift: Shift
  ) {
    const next = !shift.isActive;

    try {
      const response = await fetch(
        `${API}/captain-shifts/${shift._id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name:
              shift.name ||
              "شفت الكابتن",
            dayOfWeek:
              shift.dayOfWeek ?? 0,
            startTime:
              shift.startTime,
            endTime:
              shift.endTime,
            isActive: next,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "تعذر تحديث الشفت."
        );
      }

      await loadShifts();
    } catch (error: any) {
      alert(
        error?.message ||
          "تعذر تحديث الشفت."
      );
    }
  }

  async function deleteShift(
    shift: Shift
  ) {
    const ok = window.confirm(
      `هل تريد حذف شفت "${
        shift.name || "بدون اسم"
      }"؟`
    );

    if (!ok) return;

    try {
      const response = await fetch(
        `${API}/captain-shifts/${shift._id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "تعذر حذف الشفت."
        );
      }

      await loadShifts();
    } catch (error: any) {
      alert(
        error?.message ||
          "تعذر حذف الشفت."
      );
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            marginBottom: 8,
          }}
        >
          شفتات الكباتن
        </h1>

        <p
          style={{
            margin: 0,
            opacity: 0.7,
          }}
        >
          إنشاء وإدارة أوقات العمل المتاحة
          للكباتن.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          padding: 20,
          border: "1px solid #ddd",
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <input
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          placeholder="اسم الشفت"
        />

        <select
          value={dayOfWeek}
          onChange={(e) =>
            setDayOfWeek(
              Number(e.target.value)
            )
          }
        >
          {DAYS.map((day, index) => (
            <option
              key={index}
              value={index}
            >
              {day}
            </option>
          ))}
        </select>

        <input
          type="time"
          value={startTime}
          onChange={(e) =>
            setStartTime(e.target.value)
          }
        />

        <input
          type="time"
          value={endTime}
          onChange={(e) =>
            setEndTime(e.target.value)
          }
        />

        <button
          type="button"
          onClick={createShift}
          disabled={saving}
        >
          {saving
            ? "جاري الحفظ..."
            : "إنشاء الشفت"}
        </button>
      </div>

      {loading ? (
        <div>جاري تحميل الشفتات...</div>
      ) : shifts.length === 0 ? (
        <div
          style={{
            padding: 30,
            border: "1px solid #ddd",
            borderRadius: 16,
          }}
        >
          لا توجد شفتات حاليًا.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {shifts.map((shift) => (
            <div
              key={shift._id}
              style={{
                padding: 18,
                border:
                  "1px solid #ddd",
                borderRadius: 16,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>
                  {shift.name ||
                    "شفت بدون اسم"}
                </strong>

                <div
                  style={{
                    marginTop: 6,
                  }}
                >
                  {DAYS[
                    shift.dayOfWeek ?? 0
                  ]}{" "}
                  —{" "}
                  {shift.startTime} →{" "}
                  {shift.endTime}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    opacity: 0.7,
                  }}
                >
                  {shift.isActive
                    ? "نشط"
                    : "معطل"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleShift(
                      shift
                    )
                  }
                >
                  {shift.isActive
                    ? "تعطيل"
                    : "تفعيل"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteShift(
                      shift
                    )
                  }
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
''', encoding="utf-8")

print(f"✅ Created {page}")

# ------------------------------------------------------------
# Try automatic route injection
# ------------------------------------------------------------

if router:
    s = router.read_text(encoding="utf-8")

    if "CaptainShifts" not in s:
        import_line = (
            'import CaptainShifts from "./pages/CaptainShifts";\n'
        )

        # Put import after first import block.
        first_import_end = s.find("\n", s.find("import "))
        if first_import_end != -1:
            s = (
                s[:first_import_end + 1]
                + import_line
                + s[first_import_end + 1:]
            )

        route_patterns = [
            r'(<Route[^>]*path=["\'][^"\']*pricing[^"\']*["\'][^>]*\/?>)',
            r'(<Route[^>]*path=["\'][^"\']*settings[^"\']*["\'][^>]*\/?>)',
        ]

        route_added = False

        for pattern in route_patterns:
            m = re.search(
                pattern,
                s,
                flags=re.I
            )

            if m:
                route_line = (
                    '      <Route '
                    'path="/captain-shifts" '
                    'element={<CaptainShifts />} />\n'
                )

                s = (
                    s[:m.start()]
                    + route_line
                    + s[m.start():]
                )

                route_added = True
                break

        if route_added:
            backup = router.with_suffix(
                router.suffix + ".before-r10-shifts"
            )

            if not backup.exists():
                shutil.copy2(
                    router,
                    backup
                )

            router.write_text(
                s,
                encoding="utf-8"
            )

            print(
                f"✅ Added /captain-shifts route to {router}"
            )
        else:
            print(
                "⚠️ لم أستطع إضافة Route تلقائيًا."
            )
            print(
                "الصفحة CaptainShifts.tsx جاهزة."
            )
    else:
        print(
            "ℹ️ CaptainShifts route/page already referenced."
        )

print()
print("==============================================")
print("✅ ADMIN SHIFT MANAGEMENT ADDED")
print("==============================================")
print("Page: admin/src/pages/CaptainShifts.tsx")
print("Route target: /captain-shifts")
print()
print("الموجود:")
print("✅ إنشاء شفت")
print("✅ اختيار اليوم")
print("✅ وقت البداية والنهاية")
print("✅ تفعيل / تعطيل")
print("✅ حذف")
print()
print("⚠️ منطق اختيار الكابتن الأسبوعي ومنع تغييره")
print("   موجود بالفعل في الـBackend ولم يتم تغييره.")
print("==============================================")
