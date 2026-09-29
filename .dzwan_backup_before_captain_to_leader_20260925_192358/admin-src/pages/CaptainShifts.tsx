import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Shift = {
  _id: string;
  name?: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function formatTime(value: string) {
  const match = String(value || "").match(
    /^(\d{1,2}):(\d{2})/
  );

  if (!match) {
    return value || "--:--";
  }

  let hour = Number(match[1]);
  const minute = match[2];

  const suffix = hour >= 12 ? "م" : "ص";

  hour %= 12;

  if (hour === 0) {
    hour = 12;
  }

  return `${hour}:${minute} ${suffix}`;
}

function BaghdadClock() {
  const [now, setNow] = useState(() =>
    new Date()
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return new Intl.DateTimeFormat(
    "ar-IQ",
    {
      timeZone: "Asia/Baghdad",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }
  ).format(now);
}

export default function CaptainShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<Shift | null>(null);
  const [deleting, setDeleting] =
    useState(false);

  const [notice, setNotice] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  const activeCount = useMemo(
    () =>
      shifts.filter(
        (shift) => shift.isActive
      ).length,
    [shifts],
  );

  function showNotice(
    message: string,
    type: "success" | "error" = "error",
  ) {
    setNotice({
      message,
      type,
    });

    window.setTimeout(() => {
      setNotice(null);
    }, 2600);
  }

  async function loadShifts() {
    try {
      setLoading(true);

      const response = await api.get(
        "/captain-shifts/admin"
      );

      const list =
        response?.data?.data || [];

      setShifts(
        Array.isArray(list)
          ? list
          : [],
      );
    } catch (error: any) {
      showNotice(
        error?.response?.data?.message ||
          "تعذر تحميل شفتات الكباتن.",
        "error",
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
      showNotice(
        "اكتب اسم الشفت.",
        "error",
      );
      return;
    }

    if (!startTime || !endTime) {
      showNotice(
        "حدد بداية ونهاية الشفت.",
        "error",
      );
      return;
    }

    setSaving(true);

    try {
      await api.post(
        "/captain-shifts",
        {
          name: name.trim(),
          dayOfWeek,
          startTime,
          endTime,
          isActive: true,
        },
      );

      setName("");
      setStartTime("08:00");
      setEndTime("16:00");

      await loadShifts();

      showNotice(
        "تم إنشاء الشفت بنجاح.",
        "success",
      );
    } catch (error: any) {
      showNotice(
        error?.response?.data?.message ||
          "تعذر إنشاء الشفت.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteShift(
    shift: Shift
  ) {
    setDeleteTarget(shift);
  }

  async function confirmDeleteShift() {
    if (!deleteTarget || deleting) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete(
        `/captain-shifts/${deleteTarget._id}`
      );

      setDeleteTarget(null);

      await loadShifts();
    } catch (error: any) {
      showNotice(
        error?.response?.data?.message ||
          "تعذر حذف الشفت.",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function toggleShift(
    shift: Shift
  ) {
    try {
      await api.patch(
        `/captain-shifts/${shift._id}`,
        {
          name:
            shift.name ||
            "شفت الكابتن",
          dayOfWeek:
            shift.dayOfWeek ?? 0,
          startTime:
            shift.startTime,
          endTime:
            shift.endTime,
          isActive:
            !shift.isActive,
        },
      );

      await loadShifts();
    } catch (error: any) {
      showNotice(
        error?.response?.data?.message ||
          "تعذر تحديث حالة الشفت.",
        "error",
      );
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: 24,
        maxWidth: 1050,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
            }}
          >
            شفتات الكباتن
          </h1>

          <div
            style={{
              marginTop: 7,
              color: "#64748b",
            }}
          >
            توقيت التشغيل يعتمد على توقيت العراق
            {" "}
            — بغداد:{" "}
            <strong>
              <BaghdadClock />
            </strong>
          </div>
        </div>

        <div
          style={{
            padding: "10px 15px",
            borderRadius: 12,
            background: "#f1f5f9",
            fontWeight: 800,
          }}
        >
          الشفتات المفعلة: {activeCount}
        </div>
      </div>

      <section
        style={{
          padding: 20,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #e2e8f0",
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 19,
          }}
        >
          إنشاء شفت جديد
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="اسم الشفت"
            style={inputStyle}
          />

          <select
            value={dayOfWeek}
            onChange={(event) =>
              setDayOfWeek(
                Number(event.target.value),
              )
            }
            style={inputStyle}
          >
            {DAYS.map((day, index) => (
              <option
                key={day}
                value={index}
              >
                {day}
              </option>
            ))}
          </select>

          <input
            type="time"
            value={startTime}
            onChange={(event) =>
              setStartTime(
                event.target.value,
              )
            }
            style={inputStyle}
          />

          <input
            type="time"
            value={endTime}
            onChange={(event) =>
              setEndTime(
                event.target.value,
              )
            }
            style={inputStyle}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            void createShift();
          }}
          disabled={saving}
          style={primaryButtonStyle}
        >
          {saving
            ? "جاري الحفظ..."
            : "إنشاء الشفت"}
        </button>
      </section>

      <section
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {loading ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
            }}
          >
            جاري تحميل الشفتات...
          </div>
        ) : shifts.length === 0 ? (
          <div
            style={{
              padding: 30,
              textAlign: "center",
              borderRadius: 18,
              border: "1px dashed #cbd5e1",
              color: "#64748b",
            }}
          >
            لا توجد شفتات حتى الآن.
          </div>
        ) : (
          shifts.map((shift) => (
            <div
              key={shift._id}
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 16,
                padding: 18,
                borderRadius: 18,
                background: "#fff",
                border:
                  "1px solid #e2e8f0",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  {shift.name ||
                    "شفت بدون اسم"}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    color: "#475569",
                    fontWeight: 700,
                  }}
                >
                  {DAYS[
                    Number(
                      shift.dayOfWeek ?? 0,
                    )
                  ] || "غير محدد"}

                  {" • "}

                  {formatTime(
                    shift.startTime,
                  )}

                  {" → "}

                  {formatTime(
                    shift.endTime,
                  )}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    fontSize: 13,
                    fontWeight: 800,
                    color: shift.isActive
                      ? "#15803d"
                      : "#b91c1c",
                  }}
                >
                  {shift.isActive
                    ? "مفعل — يظهر للكابتن"
                    : "غير مفعل — لا يظهر للكابتن"}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    void toggleShift(
                      shift,
                    );
                  }}
                  style={{
                    ...toggleButtonStyle,
                    background:
                      shift.isActive
                        ? "#fee2e2"
                        : "#dcfce7",
                    color:
                      shift.isActive
                        ? "#b91c1c"
                        : "#166534",
                  }}
                >
                  {shift.isActive
                    ? "تعطيل"
                    : "تفعيل"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void deleteShift(
                      shift,
                    );
                  }}
                  style={{
                    ...toggleButtonStyle,
                    background: "#dc2626",
                    color: "#ffffff",
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {notice ? (
        <div
          dir="rtl"
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 10000,
            minWidth: 290,
            maxWidth: 420,
            padding: "13px 16px",
            borderRadius: 14,
            background:
              notice.type === "success"
                ? "#fff8ef"
                : "#fff7f7",
            border:
              notice.type === "success"
                ? "1px solid #f4d5b2"
                : "1px solid #f1caca",
            boxShadow:
              "0 14px 38px rgba(45,30,18,0.14)",
            display: "flex",
            alignItems: "center",
            gap: 11,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                notice.type === "success"
                  ? "#f28c28"
                  : "#dc2626",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 900,
            }}
          >
            {notice.type === "success"
              ? "✓"
              : "!"}
          </div>

          <div
            style={{
              color: "#3b2a18",
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.6,
            }}
          >
            {notice.message}
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(20, 14, 8, 0.34)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleting
            ) {
              setDeleteTarget(null);
            }
          }}
        >
          <div
            dir="rtl"
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#ffffff",
              borderRadius: 18,
              padding: 20,
              boxSizing: "border-box",
              boxShadow:
                "0 20px 55px rgba(45, 30, 18, 0.18)",
              border: "1px solid #eee3d7",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                left: 0,
                height: 4,
                background:
                  "linear-gradient(90deg, #f6b56f, #e87516)",
              }}
            />

            <div
              style={{
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#30261f",
                  }}
                >
                  حذف الشفت
                </div>

                <div
                  style={{
                    marginTop: 5,
                    fontSize: 13,
                    color: "#8a7868",
                  }}
                >
                  تأكيد حذف الشفت من النظام
                </div>
              </div>

              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                }}
                style={{
                  width: 34,
                  height: 34,
                  border: "1px solid #eadfd3",
                  borderRadius: 10,
                  background: "#fffaf5",
                  color: "#8a7868",
                  cursor: deleting
                    ? "default"
                    : "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: 18,
                padding: "13px 14px",
                borderRadius: 12,
                background: "#fff8ef",
                border: "1px solid #f4e0c8",
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#e87516",
                }}
              >
                {deleteTarget.name ||
                  "شفت بدون اسم"}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#806d5b",
                }}
              >
                سيتم حذف هذا الشفت نهائيًا.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 9,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 11,
                  border: "1px solid #e4d8cc",
                  background: "#ffffff",
                  color: "#665549",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: deleting
                    ? "default"
                    : "pointer",
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  void confirmDeleteShift();
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  border: 0,
                  borderRadius: 11,
                  background:
                    "linear-gradient(135deg, #f6b56f, #e87516)",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: deleting
                    ? "default"
                    : "pointer",
                  boxShadow:
                    "0 6px 16px rgba(232,117,22,.18)",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting
                  ? "جاري الحذف..."
                  : "حذف الشفت"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
  padding: "9px 11px",
  borderRadius: 11,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  background: "#fff",
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 16,
  minHeight: 46,
  padding: "0 20px",
  border: 0,
  borderRadius: 12,
  cursor: "pointer",
  background: "#111827",
  color: "#fff",
  fontSize: 15,
  fontWeight: 900,
};

const toggleButtonStyle: React.CSSProperties = {
  minWidth: 92,
  minHeight: 42,
  padding: "0 15px",
  border: 0,
  borderRadius: 11,
  cursor: "pointer",
  fontWeight: 900,
};
