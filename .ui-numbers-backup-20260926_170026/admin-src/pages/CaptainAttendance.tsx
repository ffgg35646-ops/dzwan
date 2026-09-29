import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  Clock3,
  RefreshCw,
  Search,
  UserRound,
  BriefcaseBusiness,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { api } from "../lib/api";

type CaptainRef =
  | string
  | {
      _id?: string;
      id?: string;
      fullName?: string;
      name?: string;
      phone?: string;
    }
  | null
  | undefined;

type ShiftRef =
  | string
  | {
      _id?: string;
      id?: string;
      name?: string;
      startTime?: string;
      endTime?: string;
      dayOfWeek?: number;
      captainId?: string | { _id?: string };
    }
  | null
  | undefined;

type Attendance = {
  _id?: string;

  captainId?: CaptainRef;
  captainName?: string;
  fullName?: string;
  phone?: string;

  shiftId?: ShiftRef;
  shiftName?: string;

  checkIn?: string;
  checkOut?: string;

  startTime?: string;
  endTime?: string;

  durationMinutes?: number;
  workDurationMinutes?: number;

  date?: string;
  createdAt?: string;
};

type Captain = {
  _id?: string;
  id?: string;
  fullName?: string;
  name?: string;
  phone?: string;
};

type Shift = {
  _id?: string;
  id?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
  captainId?: string | { _id?: string };
};

function idOf(value: unknown) {
  if (!value) return "";

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    const item = value as any;

    return String(
      item?._id ||
        item?.id ||
        "",
    );
  }

  return "";
}

function nameOfCaptain(
  value: CaptainRef,
) {
  if (!value) return "";

  if (typeof value === "string") {
    return "";
  }

  if (typeof value === "object") {
    return (
      value.fullName ||
      value.name ||
      value.phone ||
      ""
    );
  }

  return "";
}


function formatDate(
  value?: string,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "ar-IQ",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );
}

function formatTime(
  value?: string,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    !Number.isNaN(
      date.getTime(),
    )
  ) {
    return date.toLocaleTimeString(
      "ar-IQ",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );
  }

  return value;
}

function formatShiftTime(
  value?: string,
) {
  if (!value) {
    return "";
  }

  const [rawHour, rawMinute] =
    String(value).split(":");

  const hour = Number(rawHour);
  const minute = Number(
    rawMinute ?? 0,
  );

  if (!Number.isFinite(hour)) {
    return String(value);
  }

  const normalized =
    ((hour % 24) + 24) % 24;

  const hour12 =
    normalized === 0
      ? 12
      : normalized > 12
        ? normalized - 12
        : normalized;

  const suffix =
    normalized >= 12
      ? "م"
      : "ص";

  return `${hour12}:${String(
    Number.isFinite(minute)
      ? minute
      : 0,
  ).padStart(2, "0")} ${suffix}`;
}

function getShiftName(item: Attendance, shiftMap?: Map<string, any>) {
  const sh: any = item.shiftId;

  if (sh && typeof sh === "object") {
    const start = sh.startTime || "";
    const end = sh.endTime || "";

    return (
      sh.name ||
      (start && end ? `${formatShiftTime(start)} – ${formatShiftTime(end)}` : "") ||
      ""
    );
  }

  const id =
    typeof sh === "string"
      ? sh
      : sh?._id
        ? String(sh._id)
        : "";

  const mapped = id && shiftMap ? shiftMap.get(id) : null;

  if (mapped) {
    return (
      mapped.name ||
      (mapped.startTime && mapped.endTime
        ? `${formatShiftTime(mapped.startTime)} – ${formatShiftTime(mapped.endTime)}`
        : "") ||
      ""
    );
  }

  return (
    item.shiftName ||
    (item.startTime && item.endTime
      ? `${formatShiftTime(item.startTime)} – ${formatShiftTime(item.endTime)}`
      : "") ||
    ""
  );
}

function getDuration(
  item: Attendance,
) {
  const minutes =
    item.durationMinutes ??
    item.workDurationMinutes;

  if (
    minutes === undefined ||
    minutes === null ||
    Number(minutes) < 1
  ) {
    return "—";
  }

  const total = Number(minutes);
  const hours =
    Math.floor(total / 60);
  const rest = total % 60;

  if (!hours) {
    return `${rest} دقيقة`;
  }

  if (!rest) {
    return `${hours} ساعة`;
  }

  return `${hours} ساعة و${rest} دقيقة`;
}

function getDayOfWeek(
  value?: string,
) {
  if (!value) {
    return undefined;
  }

  const raw = String(value);

  let date: Date;

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      raw,
    )
  ) {
    date = new Date(
      `${raw}T12:00:00`,
    );
  } else {
    date = new Date(raw);
  }

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return undefined;
  }

  return date.getDay();
}

function extractArray(
  data: any,
  keys: string[],
) {
  for (
    const key of keys
  ) {
    if (
      Array.isArray(
        data?.[key],
      )
    ) {
      return data[key];
    }
  }

  if (
    Array.isArray(data)
  ) {
    return data;
  }

  return [];
}

export default function CaptainAttendance() {
  const [items, setItems] =
    useState<Attendance[]>([]);

  const [captains, setCaptains] =
    useState<Captain[]>([]);

  const [, setShifts] =
    useState<Shift[]>([]);

  const [search, setSearch] =
    useState("");

  const [date, setDate] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  async function load(
    silent = false,
  ) {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      let attendanceData:
        any = null;

      const attendanceEndpoints = [
        "/captain-attendance",
        "/captain-attendance/all",
        "/attendance",
      ];

      for (
        const endpoint of attendanceEndpoints
      ) {
        try {
          const response =
            await api.get(
              endpoint,
              {
                params: {
                  limit: 10000,
                },
              },
            );

          if (
            response?.data
          ) {
            attendanceData =
              response.data;
            break;
          }
        } catch {
          // جرّب المسار التالي.
        }
      }

      const attendanceList =
        extractArray(
          attendanceData,
          [
            "data",
            "items",
            "attendance",
            "records",
            "rows",
          ],
        );

      let captainList:
        Captain[] = [];

      try {
        const response =
          await api.get(
            "/captains",
            {
              params: {
                limit: 10000,
              },
            },
          );

        captainList =
          extractArray(
            response.data,
            [
              "captains",
              "data",
              "items",
            ],
          );
      } catch {
        // نكمل حتى لو لم نحتج endpoint الكباتن.
      }

      let shiftList:
        Shift[] = [];

      const shiftEndpoints = [
        "/shifts",
        "/dispatch/shifts",
        "/captain-shifts",
      ];

      for (
        const endpoint of shiftEndpoints
      ) {
        try {
          const response =
            await api.get(
              endpoint,
              {
                params: {
                  limit: 10000,
                },
              },
            );

          const list =
            extractArray(
              response.data,
              [
                "shifts",
                "data",
                "items",
              ],
            );

          if (
            list.length > 0
          ) {
            shiftList =
              list;
            break;
          }
        } catch {
          // جرّب المسار التالي.
        }
      }

      setCaptains(
        captainList,
      );

      setShifts(
        shiftList,
      );

      const captainMap =
        new Map<
          string,
          string
        >();

      for (
        const captain of captainList
      ) {
        const id =
          captain?._id ||
          captain?.id;

        const name =
          captain?.fullName ||
          captain?.name ||
          captain?.phone;

        if (
          id &&
          name
        ) {
          captainMap.set(
            String(id),
            String(name),
          );
        }
      }

      const shiftMap =
        new Map<
          string,
          string
        >();

      const shiftCaptainDayMap =
        new Map<
          string,
          string
        >();

      for (
        const shift of shiftList
      ) {
        const shiftId =
          shift?._id ||
          shift?.id;

        const shiftName =
          getShiftName(
            shift,
          );

        if (
          shiftId &&
          shiftName
        ) {
          shiftMap.set(
            String(shiftId),
            shiftName,
          );
        }

        const captainId =
          idOf(
            shift?.captainId,
          );

        if (
          captainId &&
          shift?.dayOfWeek !==
            undefined &&
          shiftName
        ) {
          shiftCaptainDayMap.set(
            `${captainId}:${Number(
              shift.dayOfWeek,
            )}`,
            shiftName,
          );
        }
      }

      const normalized =
        attendanceList.map(
          (
            raw: any,
          ) => {
            const captainId =
              idOf(
                raw?.captainId,
              );

            const shiftId =
              idOf(
                raw?.shiftId,
              );

            const directCaptainName =
              raw?.captainName ||
              raw?.fullName ||
              nameOfCaptain(
                raw?.captainId,
              );

            const captainName =
              directCaptainName ||
              (captainId
                ? captainMap.get(
                    captainId,
                  )
                : "") ||
              "كابتن";

            const dateValue =
              raw?.date ||
              raw?.checkIn ||
              raw?.createdAt;

            const day =
              getDayOfWeek(
                dateValue,
              );

            let shiftName =
              raw?.shiftName ||
              (typeof raw?.shiftId ===
              "object"
                ? getShiftName(
                    raw.shiftId,
                  )
                : "");

            if (
              !shiftName &&
              shiftId
            ) {
              shiftName =
                shiftMap.get(
                  shiftId,
                ) || "";
            }

            if (
              !shiftName &&
              captainId &&
              day !== undefined
            ) {
              shiftName =
                shiftCaptainDayMap.get(
                  `${captainId}:${day}`,
                ) || "";
            }

            if (
              !shiftName &&
              (raw?.startTime ||
                raw?.endTime)
            ) {
              shiftName =
                getShiftName({
                  startTime:
                    raw?.startTime,
                  endTime:
                    raw?.endTime,
                });
            }

            return {
              ...raw,
              captainId:
                raw?.captainId,
              captainName,
              shiftId:
                raw?.shiftId,
              shiftName:
                shiftName ||
                "—",
            } as Attendance;
          },
        );

      // الصفحة خاصة بالحضور الفعلي فقط.
      const attendanceOnly =
        normalized.filter(
          (
            item: Attendance,
          ) =>
            Boolean(
              item.checkIn ||
                item.startTime,
            ),
        );

      setItems(
        attendanceOnly,
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "تعذر تحميل سجل حضور الكباتن.",
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (
          item: Attendance,
        ) => {
          const captainName =
            String(
              item.captainName ||
                item.fullName ||
                "",
            ).toLowerCase();

          const captainPhone =
            (
              typeof item.captainId ===
                "object"
                ? item.captainId
                    ?.phone || ""
                : ""
            ).toLowerCase();

          const itemDate =
            String(
              item.date ||
                item.checkIn ||
                item.createdAt ||
                "",
            );

          const matchesSearch =
            !q ||
            captainName.includes(
              q,
            ) ||
            captainPhone.includes(
              q,
            );

          const matchesDate =
            !date ||
            itemDate.startsWith(
              date,
            );

          return (
            matchesSearch &&
            matchesDate
          );
        },
      );
    }, [
      items,
      search,
      date,
    ]);

  return (
    <div
      dir="rtl"
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing:
          "border-box",
        padding:
          "26px 24px 40px",
        background:
          "linear-gradient(180deg,#FFFDF9 0%,#F8FAFC 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1180,
          minWidth: 0,
          margin: "0 auto",
          boxSizing:
            "border-box",
        }}
      >
        {/* العنوان */}
        <section
          style={{
            position:
              "relative",
            overflow:
              "hidden",
            marginBottom: 18,
            padding:
              "22px 24px",
            borderRadius: 22,
            border:
              "1px solid #FED7AA",
            background:
              "linear-gradient(135deg,#FFF7ED,#FFFFFF 58%,#FFFBEB)",
            boxShadow:
              "0 14px 34px rgba(234,88,12,.08)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 18,
            flexWrap:
              "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#EA580C",
                fontSize: 12,
                fontWeight: 950,
                marginBottom: 6,
                letterSpacing:
                  ".4px",
              }}
            >
              OPERATIONS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 950,
                color: "#0F172A",
              }}
            >
              حضور الكباتن
            </h1>

            <p
              style={{
                margin:
                  "7px 0 0",
                color: "#64748B",
                fontSize: 13,
                lineHeight:
                  1.8,
              }}
            >
              سجل الحضور الفعلي
              للكباتن مع وقت الحضور
              والشفت والتاريخ.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void load(true)
            }
            disabled={
              refreshing
            }
            style={{
              minHeight: 46,
              padding:
                "0 17px",
              border: 0,
              borderRadius: 14,
              background:
                "linear-gradient(135deg,#EA580C,#F97316)",
              color: "#fff",
              fontWeight: 950,
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 8,
              cursor:
                refreshing
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                "0 10px 22px rgba(234,88,12,.20)",
            }}
          >
            {refreshing ? (
              <Loader2
                size={17}
                className="spin"
              />
            ) : (
              <RefreshCw
                size={17}
              />
            )}

            تحديث السجل
          </button>
        </section>

        {/* البحث والفلاتر */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0,1fr) 210px",
            gap: 12,
            padding: 14,
            marginBottom: 18,
            background:
              "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: 18,
            boxShadow:
              "0 8px 24px rgba(15,23,42,.05)",
          }}
        >
          <label
            style={{
              minWidth: 0,
              position:
                "relative",
              display: "flex",
              alignItems:
                "center",
            }}
          >
            <Search
              size={18}
              style={{
                position:
                  "absolute",
                right: 14,
                color: "#EA580C",
                pointerEvents:
                  "none",
              }}
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="اكتب اسم الكابتن والنتائج تظهر مباشرة..."
              style={{
                width: "100%",
                height: 48,
                boxSizing:
                  "border-box",
                border:
                  "1px solid #E2E8F0",
                borderRadius: 13,
                background:
                  "#F8FAFC",
                color: "#0F172A",
                padding:
                  "0 44px 0 14px",
                outline: "none",
                fontWeight: 700,
              }}
            />
          </label>

          <label
            style={{
              minWidth: 0,
              position:
                "relative",
              display: "flex",
              alignItems:
                "center",
            }}
          >
            <CalendarDays
              size={17}
              style={{
                position:
                  "absolute",
                right: 13,
                color: "#EA580C",
                pointerEvents:
                  "none",
              }}
            />

            <input
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              style={{
                width: "100%",
                height: 48,
                boxSizing:
                  "border-box",
                border:
                  "1px solid #E2E8F0",
                borderRadius: 13,
                background:
                  "#F8FAFC",
                color: "#334155",
                padding:
                  "0 40px 0 12px",
                outline: "none",
                fontWeight: 700,
              }}
            />
          </label>
        </section>

        {/* ملخص */}
        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(3,minmax(0,1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 17,
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              boxShadow:
                "0 8px 22px rgba(15,23,42,.05)",
              display:
                "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                display:
                  "grid",
                placeItems:
                  "center",
                background:
                  "#FFF7ED",
                color:
                  "#EA580C",
              }}
            >
              <Clock3
                size={20}
              />
            </span>

            <div>
              <div
                style={{
                  color:
                    "#64748B",
                  fontSize: 11,
                  fontWeight:
                    800,
                }}
              >
                كل السجلات
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 3,
                  color:
                    "#0F172A",
                  fontSize: 22,
                  fontWeight:
                    950,
                }}
              >
                {items.length}
              </strong>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 17,
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              boxShadow:
                "0 8px 22px rgba(15,23,42,.05)",
              display:
                "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                display:
                  "grid",
                placeItems:
                  "center",
                background:
                  "#EFF6FF",
                color:
                  "#2563EB",
              }}
            >
              <UserRound
                size={20}
              />
            </span>

            <div>
              <div
                style={{
                  color:
                    "#64748B",
                  fontSize: 11,
                  fontWeight:
                    800,
                }}
              >
                نتائج البحث
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 3,
                  color:
                    "#0F172A",
                  fontSize: 22,
                  fontWeight:
                    950,
                }}
              >
                {filtered.length}
              </strong>
            </div>
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 17,
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              boxShadow:
                "0 8px 22px rgba(15,23,42,.05)",
              display:
                "flex",
              alignItems:
                "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                display:
                  "grid",
                placeItems:
                  "center",
                background:
                  "#FFF7ED",
                color:
                  "#F97316",
              }}
            >
              <BriefcaseBusiness
                size={20}
              />
            </span>

            <div>
              <div
                style={{
                  color:
                    "#64748B",
                  fontSize: 11,
                  fontWeight:
                    800,
                }}
              >
                الكباتن المسجلون
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop: 3,
                  color:
                    "#0F172A",
                  fontSize: 22,
                  fontWeight:
                    950,
                }}
              >
                {captains.length}
              </strong>
            </div>
          </div>
        </section>

        {/* السجل */}
        <section
          style={{
            background:
              "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: 22,
            overflow:
              "hidden",
            boxShadow:
              "0 14px 34px rgba(15,23,42,.07)",
          }}
        >
          <div
            style={{
              minHeight: 72,
              padding:
                "16px 20px",
              background:
                "linear-gradient(135deg,#FFF7ED,#FFFFFF)",
              borderBottom:
                "1px solid #EEF2F6",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 12,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight:
                    950,
                  color:
                    "#0F172A",
                }}
              >
                سجل الحضور
              </h2>

              <p
                style={{
                  margin:
                    "4px 0 0",
                  color:
                    "#64748B",
                  fontSize: 12,
                }}
              >
                {search.trim()
                  ? `عرض النتائج المطابقة لـ "${search.trim()}"`
                  : "جميع سجلات الحضور الفعلية"}
              </p>
            </div>

            <span
              style={{
                minWidth: 42,
                height: 34,
                padding:
                  "0 10px",
                borderRadius:
                  999,
                display:
                  "inline-flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                background:
                  "#EA580C",
                color:
                  "#FFFFFF",
                fontWeight:
                  950,
                fontSize: 13,
              }}
            >
              {filtered.length}
            </span>
          </div>

          {error ? (
            <div
              style={{
                margin: 16,
                padding:
                  "12px 14px",
                borderRadius: 13,
                background:
                  "#FEF2F2",
                border:
                  "1px solid #FECACA",
                color:
                  "#B91C1C",
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 8,
                fontWeight:
                  800,
                fontSize: 13,
              }}
            >
              <AlertCircle
                size={17}
              />
              {error}
            </div>
          ) : null}

          {loading ? (
            <div
              style={{
                minHeight: 260,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexDirection:
                  "column",
                gap: 10,
                color:
                  "#64748B",
              }}
            >
              <Loader2
                size={28}
                className="spin"
                color="#EA580C"
              />

              <span>
                جاري تحميل سجل الحضور...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                minHeight: 260,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexDirection:
                  "column",
                gap: 9,
                color:
                  "#64748B",
                textAlign:
                  "center",
                padding: 30,
              }}
            >
              <Clock3
                size={32}
                color="#CBD5E1"
              />

              <strong
                style={{
                  color:
                    "#0F172A",
                }}
              >
                لا توجد نتائج
              </strong>

              <span
                style={{
                  fontSize: 12,
                }}
              >
                جرّب اسم كابتن آخر
                أو غيّر التاريخ.
              </span>
            </div>
          ) : (
            <div
              style={{
                overflowX:
                  "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 900,
                  borderCollapse:
                    "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        "#F8FAFC",
                    }}
                  >
                    {[
                      "الكابتن",
                      "التاريخ",
                      "الشفت",
                      "الحضور",
                      "الانصراف",
                      "مدة العمل",
                    ].map(
                      (title) => (
                        <th
                          key={
                            title
                          }
                          style={{
                            padding:
                              "14px 16px",
                            textAlign:
                              "right",
                            color:
                              "#64748B",
                            fontSize:
                              11,
                            fontWeight:
                              950,
                            borderBottom:
                              "1px solid #E2E8F0",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {title}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={
                          item._id ||
                          `${idOf(item.captainId)}-${item.date || item.checkIn}-${index}`
                        }
                        style={{
                          borderBottom:
                            "1px solid #F1F5F9",
                        }}
                      >
                        <td
                          style={{
                            padding:
                              "15px 16px",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 10,
                            }}
                          >
                            <span
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius:
                                  11,
                                display:
                                  "grid",
                                placeItems:
                                  "center",
                                background:
                                  "#FFF7ED",
                                color:
                                  "#EA580C",
                                flexShrink:
                                  0,
                              }}
                            >
                              <UserRound
                                size={17}
                              />
                            </span>

                            <div>
                              <strong
                                style={{
                                  color:
                                    "#0F172A",
                                  fontSize:
                                    13,
                                  fontWeight:
                                    950,
                                }}
                              >
                                {item.captainName ||
                                  item.fullName ||
                                  "كابتن"}
                              </strong>

                              {typeof item.captainId ===
                                "object" &&
                              item.captainId?.phone ? (
                                <small
                                  style={{
                                    display:
                                      "block",
                                    marginTop:
                                      3,
                                    color:
                                      "#94A3B8",
                                    fontSize:
                                      10,
                                  }}
                                >
                                  {
                                    item
                                      .captainId
                                      .phone
                                  }
                                </small>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td
                          style={{
                            padding:
                              "15px 16px",
                            color:
                              "#475569",
                            fontWeight:
                              750,
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap: 6,
                            }}
                          >
                            <CalendarDays
                              size={14}
                              color="#94A3B8"
                            />
                            {formatDate(
                              item.date ||
                                item.checkIn ||
                                item.createdAt,
                            )}
                          </span>
                        </td>

                        <td
                          style={{
                            padding:
                              "15px 16px",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap: 7,
                              padding:
                                "7px 10px",
                              borderRadius:
                                10,
                              background:
                                "#F8FAFC",
                              border:
                                "1px solid #E2E8F0",
                              color:
                                "#334155",
                              fontSize:
                                12,
                              fontWeight:
                                900,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <BriefcaseBusiness
                              size={14}
                              color="#EA580C"
                            />
                            {item.shiftName ||
                              "—"}
                          </span>
                        </td>

                        <td
                          style={{
                            padding:
                              "15px 16px",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap: 7,
                              padding:
                                "8px 11px",
                              borderRadius:
                                11,
                              background:
                                "#ECFDF5",
                              color:
                                "#15803D",
                              border:
                                "1px solid #BBF7D0",
                              fontWeight:
                                950,
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius:
                                  "50%",
                                background:
                                  "#22C55E",
                              }}
                            />

                            {formatTime(
                              item.checkIn ||
                                item.startTime,
                            )}
                          </span>
                        </td>

                        <td
                          style={{
                            padding:
                              "15px 16px",
                            color:
                              "#475569",
                            fontWeight:
                              800,
                          }}
                        >
                          {formatTime(
                            item.checkOut ||
                              item.endTime,
                          )}
                        </td>

                        <td
                          style={{
                            padding:
                              "15px 16px",
                            color:
                              "#475569",
                            fontWeight:
                              800,
                          }}
                        >
                          {getDuration(
                            item,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
