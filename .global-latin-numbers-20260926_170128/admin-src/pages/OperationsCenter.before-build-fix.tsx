import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserRound,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "../lib/api";

type Captain = {
  _id: string;
  fullName?: string;
  phone?: string;
  status?: string;
};

type Emergency = {
  _id: string;
  type: string;
  description: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
  captainId?: Captain | string | null;
  orderId?: {
    _id: string;
    orderNumber?: string;
    status?: string;
    captainId?: string | null;
  } | string | null;
};

type StuckAlert = {
  _id: string;
  orderId: {
    _id: string;
    orderNumber?: string;
    status?: string;
    captainId?: string | null;
  } | string;
  status: "open" | "acknowledged" | "resolved";
  reason: string;
  detectedAt: string;
};

const card: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 22,
  padding: 20,
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.055)",
};

function getId(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null) {
    const item = value as { _id?: unknown };
    return typeof item._id === "string" ? item._id : "";
  }

  return "";
}

function orderLabel(value: unknown) {
  if (!value) return "غير معروف";

  if (typeof value === "object" && value !== null) {
    const item = value as {
      orderNumber?: unknown;
      _id?: unknown;
    };

    if (typeof item.orderNumber === "string" && item.orderNumber) {
      return `#${item.orderNumber}`;
    }

    if (typeof item._id === "string") {
      return `#${item._id.slice(-8)}`;
    }
  }

  if (typeof value === "string") {
    return `#${value.slice(-8)}`;
  }

  return "غير معروف";
}

function captainLabel(value: unknown) {
  if (typeof value === "object" && value !== null) {
    const item = value as {
      fullName?: unknown;
      phone?: unknown;
    };

    if (typeof item.fullName === "string" && item.fullName) {
      return item.fullName;
    }

    if (typeof item.phone === "string" && item.phone) {
      return item.phone;
    }
  }

  return "غير معين";
}

function emergencyLabel(type: string) {
  switch (type) {
    case "vehicle_breakdown":
      return "عطل في المركبة";
    case "customer_issue":
      return "مشكلة مع العميل";
    case "establishment_issue":
      return "مشكلة مع المطعم / المحل";
    case "accident":
      return "حادث";
    case "cannot_complete":
      return "لا يستطيع إكمال الطلب";
    case "other":
      return "سبب آخر";
    default:
      return type || "طوارئ";
  }
}

function formatDate(value?: string) {
  if (!value) return "غير معروف";

  try {
    return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function OperationsCenter() {
  const navigate = useNavigate();

  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [stuck, setStuck] = useState<StuckAlert[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [selectedCaptain, setSelectedCaptain] =
    useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const initialFilter =
    new URLSearchParams(window.location.search).get(
      "filter",
    );

  const [activeFilter, setActiveFilter] = useState<
    "all" | "emergencies" | "stuck"
  >(
    initialFilter === "stuck" ||
      initialFilter === "emergencies"
      ? initialFilter
      : "all",
  );

  const activeEmergencies = useMemo(
    () =>
      emergencies.filter(
        (item) =>
          item.status === "open" ||
          item.status === "acknowledged",
      ),
    [emergencies],
  );

  const activeStuck = useMemo(
    () =>
      stuck.filter(
        (item) =>
          item.status === "open" ||
          item.status === "acknowledged",
      ),
    [stuck],
  );

  const load = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [emergencyRes, stuckRes, captainRes] =
        await Promise.all([
          api.get("/ops/emergencies"),
          api.get("/ops/stuck"),
          api.get("/captains"),
        ]);

      setEmergencies(
        Array.isArray(emergencyRes.data?.emergencies)
          ? emergencyRes.data.emergencies
          : [],
      );

      setStuck(
        Array.isArray(stuckRes.data?.alerts)
          ? stuckRes.data.alerts
          : [],
      );

      setCaptains(
        Array.isArray(captainRes.data?.captains)
          ? captainRes.data.captains
          : [],
      );
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل مركز العمليات.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load(true);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [load]);

  async function resolveEmergency(item: Emergency) {
    if (!window.confirm("هل تريد إغلاق حالة الطوارئ؟")) {
      return;
    }

    try {
      setSaving(`resolve-${item._id}`);

      await api.patch(
        `/ops/emergencies/${item._id}/resolve`,
      );

      const orderId = getId(item.orderId);

      if (orderId) {
        try {
          await api.post(
            `/ops/orders/${orderId}/timeline`,
            {
              type: "emergency_resolved",
              title: "تم إغلاق حالة الطوارئ",
              description: item.description,
            },
          );
        } catch (timelineError) {
          console.warn(
            "Timeline error:",
            timelineError,
          );
        }
      }

      await load(true);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر إغلاق حالة الطوارئ.",
        ),
      );
    } finally {
      setSaving("");
    }
  }

  async function reassign(item: Emergency) {
    const orderId = getId(item.orderId);
    const captainId = selectedCaptain[item._id];
    const oldCaptainId = getId(item.captainId);

    if (!orderId) {
      setError("الطوارئ غير مرتبطة بطلب.");
      return;
    }

    if (!captainId) {
      setError("اختر الكابتن الجديد أولًا.");
      return;
    }

    if (captainId === oldCaptainId) {
      setError("اختر كابتنًا مختلفًا.");
      return;
    }

    try {
      setSaving(`reassign-${item._id}`);

      await api.post(
        `/orders/${orderId}/reassign-captain`,
        { captainId },
      );

      await load(true);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر إعادة إسناد الطلب.",
        ),
      );
    } finally {
      setSaving("");
    }
  }

  async function redispatch(
    orderId: string,
    sourceId: string,
    emergencyId?: string,
    stuckId?: string,
  ) {
    if (
      !window.confirm(
        "هل تريد إعادة الطلب إلى Smart Dispatch؟",
      )
    ) {
      return;
    }

    try {
      setSaving(`dispatch-${sourceId}`);

      await api.post(
        `/ops/orders/${orderId}/re-dispatch`,
      );

      if (emergencyId) {
        await api.patch(
          `/ops/emergencies/${emergencyId}/resolve`,
        );
      }

      if (stuckId) {
        await api.patch(
          `/ops/stuck/${stuckId}/resolve`,
        );
      }

      await load(true);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر إعادة الطلب إلى Dispatch.",
        ),
      );
    } finally {
      setSaving("");
    }
  }

  async function resolveStuck(item: StuckAlert) {
    if (
      !window.confirm(
        "هل تريد إغلاق تنبيه الطلب العالق؟",
      )
    ) {
      return;
    }

    try {
      setSaving(`stuck-${item._id}`);

      await api.patch(
        `/ops/stuck/${item._id}/resolve`,
      );

      await load(true);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر إغلاق التنبيه.",
        ),
      );
    } finally {
      setSaving("");
    }
  }

  if (loading) {
    return (
      <main dir="rtl" style={{ padding: 28 }}>
        <div style={card}>
          جاري تحميل مركز العمليات...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100%",
        padding: "28px 28px 38px",
        background:
          "linear-gradient(180deg,#F8FAFC 0%,#FFFFFF 48%,#F8FAFC 100%)",
      }}
    >
      <div
        style={{
          maxWidth: 1380,
          margin: "0 auto",
        }}
      >
        <section
          style={{
            ...card,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            padding: "24px 26px",
            borderRadius: 24,
            border: "1px solid #1E293B",
            background:
              "linear-gradient(135deg,#0F172A 0%,#1E293B 70%,#243B53 100%)",
            boxShadow:
              "0 18px 42px rgba(15,23,42,0.14)",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "#FBBF24",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              <ShieldAlert size={16} />
              OPERATIONS CENTER
            </div>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: 30,
                lineHeight: 1.2,
                color: "#FFFFFF",
                fontWeight: 950,
              }}
            >
              مركز العمليات
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                color: "#CBD5E1",
              }}
            >
              متابعة الطوارئ والطلبات العالقة والتدخل السريع.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            style={{
              minHeight: 46,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "#FFFFFF",
              color: "#0F172A",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
            }}
          >
            <RefreshCw size={17} />
            تحديث
          </button>
        </section>

        {error && (
          <div
            style={{
              ...card,
              marginBottom: 20,
              background: "#FEF2F2",
              borderColor: "#FECACA",
              color: "#B91C1C",
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: 15,
            marginBottom: 25,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveFilter("emergencies")}
            style={{
              ...card,
              width: "100%",
              textAlign: "right",
              cursor: "pointer",
              background:
                activeFilter === "emergencies"
                  ? "#FFF7ED"
                  : "#FFFFFF",
              border:
                activeFilter === "emergencies"
                  ? "2px solid #F59E0B"
                  : "1px solid #E2E8F0",
              boxShadow:
                activeFilter === "emergencies"
                  ? "0 8px 24px rgba(245,158,11,0.12)"
                  : "0 4px 14px rgba(15,23,42,0.05)",
            }}
          >
            <BellRing color="#DC2626" />

            <span
              style={{
                display: "block",
                marginTop: 8,
                color: "#475569",
                fontWeight: 800,
              }}
            >
              طوارئ مفتوحة
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 30,
                color: "#0F172A",
              }}
            >
              {activeEmergencies.length}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: 5,
                color: "#94A3B8",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              اضغط لعرض الطوارئ
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("stuck")}
            style={{
              ...card,
              width: "100%",
              textAlign: "right",
              cursor: "pointer",
              background:
                activeFilter === "stuck"
                  ? "#FFFBEB"
                  : "#FFFFFF",
              border:
                activeFilter === "stuck"
                  ? "2px solid #F59E0B"
                  : "1px solid #E2E8F0",
              boxShadow:
                activeFilter === "stuck"
                  ? "0 8px 24px rgba(245,158,11,0.12)"
                  : "0 4px 14px rgba(15,23,42,0.05)",
            }}
          >
            <AlertTriangle color="#D97706" />

            <span
              style={{
                display: "block",
                marginTop: 8,
                color: "#475569",
                fontWeight: 800,
              }}
            >
              طلبات عالقة
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 30,
                color: "#0F172A",
              }}
            >
              {activeStuck.length}
            </strong>

            <span
              style={{
                display: "block",
                marginTop: 5,
                color: "#94A3B8",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              اضغط لعرض الطلبات العالقة
            </span>
          </button>

          <div
            style={{
              ...card,
              width: "100%",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
            }}
          >
            <UserRound color="#2563EB" />

            <span
              style={{
                display: "block",
                marginTop: 8,
                color: "#475569",
                fontWeight: 800,
              }}
            >
              الكباتن النشطون
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 30,
                color: "#0F172A",
              }}
            >
              {
                captains.filter(
                  (captain) =>
                    captain.status === "active",
                ).length
              }
            </strong>

            <span
              style={{
                display: "block",
                marginTop: 5,
                color: "#94A3B8",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              إجمالي الكباتن النشطين
            </span>
          </div>
        </section>

        {activeFilter !== "stuck" && (
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              padding: "14px 16px",
              borderRadius: 16,
              background:
                "linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 100%)",
              border: "1px solid #FED7AA",
              boxShadow:
                "0 8px 24px rgba(249,115,22,.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  display: "grid",
                  placeItems: "center",
                  background: "#FFEDD5",
                  color: "#EA580C",
                  flexShrink: 0,
                }}
              >
                <BellRing size={21} />
              </span>

              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 950,
                    color: "#9A3412",
                  }}
                >
                  طوارئ الكباتن
                </h2>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#C2410C",
                  }}
                >
                  حالات تحتاج تدخل الإدارة
                </div>
              </div>
            </div>

            <span
              style={{
                minWidth: 44,
                height: 36,
                padding: "0 12px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#EA580C",
                color: "#fff",
                fontWeight: 950,
                fontSize: 15,
                boxShadow:
                  "0 6px 16px rgba(234,88,12,.18)",
              }}
            >
              {activeEmergencies.length}
            </span>
          </div>

          {activeEmergencies.length === 0 ? (
            <div style={card}>
              <CheckCircle2 color="#16A34A" />
              <div style={{ marginTop: 8 }}>
                لا توجد حالات طوارئ مفتوحة.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {activeEmergencies.map((item) => {
                const orderId = getId(item.orderId);
                const currentCaptain =
                  getId(item.captainId);
                const busy =
                  saving === `resolve-${item._id}` ||
                  saving === `reassign-${item._id}` ||
                  saving === `dispatch-${item._id}`;

                return (
                  <article
                    key={item._id}
                    style={{
                      ...card,
                      border:
                        "1px solid #FDBA74",
                      borderRadius: 18,
                      background:
                        "linear-gradient(180deg,#FFFFFF 0%,#FFF7ED 100%)",
                      boxShadow:
                        "0 10px 28px rgba(234,88,12,.08)",
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 10px",
                            borderRadius: 999,
                            background: "#FFF7ED",
                            color: "#C2410C",
                            border: "1px solid #FED7AA",
                            fontWeight: 900,
                            fontSize: 13,
                          }}
                        >
                          <XCircle size={18} />
                          {emergencyLabel(item.type)}
                        </div>

                        <h3
                          style={{
                            margin: "8px 0 0",
                          }}
                        >
                          الطلب {orderLabel(item.orderId)}
                        </h3>
                      </div>

                      <span
                        style={{
                          background:
                            item.status === "acknowledged"
                              ? "#FFF7ED"
                              : "#FEF2F2",
                          color:
                            item.status === "acknowledged"
                              ? "#C2410C"
                              : "#B91C1C",
                          borderRadius: 999,
                          padding: "7px 12px",
                          fontSize: 12,
                          fontWeight: 950,
                          border:
                            item.status === "acknowledged"
                              ? "1px solid #FED7AA"
                              : "1px solid #FECACA",
                        }}
                      >
                        {item.status === "acknowledged"
                          ? "قيد المعالجة"
                          : "مفتوحة"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 13,
                        color: "#475569",
                        lineHeight: 1.8,
                      }}
                    >
                      <div>
                        <strong>الكابتن:</strong>{" "}
                        {captainLabel(item.captainId)}
                      </div>

                      <div>
                        <strong>السبب:</strong>{" "}
                        {item.description}
                      </div>

                      <div>
                        <strong>الوقت:</strong>{" "}
                        {formatDate(item.createdAt)}
                      </div>
                    </div>

                    {orderId && (
                      <div
                        style={{
                          marginTop: 15,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(210px,1fr))",
                          gap: 10,
                        }}
                      >
                        <select
                          value={
                            selectedCaptain[item._id] || ""
                          }
                          disabled={busy}
                          onChange={(event) =>
                            setSelectedCaptain(
                              (current) => ({
                                ...current,
                                [item._id]:
                                  event.target.value,
                              }),
                            )
                          }
                          style={{
                            minHeight: 46,
                            border: "1px solid #FED7AA",
                            borderRadius: 13,
                            padding: "0 12px",
                            background: "#fff",
                            color: "#334155",
                            fontWeight: 700,
                          }}
                        >
                          <option value="">
                            اختر كابتنًا جديدًا
                          </option>

                          {captains
                            .filter(
                              (captain) =>
                                captain.status === "active" &&
                                captain._id !== currentCaptain,
                            )
                            .map((captain) => (
                              <option
                                key={captain._id}
                                value={captain._id}
                              >
                                {captain.fullName ||
                                  captain.phone ||
                                  "كابتن"}
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void reassign(item)
                          }
                          style={{
                            minHeight: 46,
                            border: 0,
                            borderRadius: 13,
                            background: "#EA580C",
                            color: "#fff",
                            fontWeight: 950,
                            cursor: "pointer",
                            boxShadow:
                              "0 8px 18px rgba(234,88,12,.18)",
                            padding: "0 16px",
                          }}
                        >
                          إعادة تعيين الكابتن
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void redispatch(
                              orderId,
                              item._id,
                              item._id,
                            )
                          }
                          style={{
                            minHeight: 46,
                            border: 0,
                            borderRadius: 13,
                            background: "#F97316",
                            color: "#fff",
                            fontWeight: 950,
                            boxShadow:
                              "0 8px 18px rgba(249,115,22,.18)",
                            padding: "0 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                            cursor: "pointer",
                          }}
                        >
                          <RotateCcw size={17} />
                          إعادة إلى Dispatch
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void resolveEmergency(item)
                          }
                          style={{
                            minHeight: 44,
                            border: "1px solid #CBD5E1",
                            borderRadius: 12,
                            background: "#fff",
                            color: "#334155",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle2
                            size={16}
                            style={{
                              verticalAlign: "middle",
                              marginLeft: 5,
                            }}
                          />
                          إبقاء الكابتن وإغلاق الطوارئ
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/orders/${orderId}`)
                          }
                          style={{
                            minHeight: 44,
                            border: "1px solid #CBD5E1",
                            borderRadius: 12,
                            background: "#F8FAFC",
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          فتح الطلب
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        )}
        
        {activeFilter !== "emergencies" && (
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              padding: "14px 16px",
              borderRadius: 16,
              background:
                "linear-gradient(135deg,#FFFBEB 0%,#FFFFFF 100%)",
              border: "1px solid #FDE68A",
              boxShadow:
                "0 8px 24px rgba(217,119,6,.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  display: "grid",
                  placeItems: "center",
                  background: "#FEF3C7",
                  color: "#D97706",
                  flexShrink: 0,
                }}
              >
                <Clock3 size={21} />
              </span>

              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 950,
                    color: "#92400E",
                  }}
                >
                  الطلبات العالقة
                </h2>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#B45309",
                  }}
                >
                  طلبات تجاوزت وقت المتابعة
                </div>
              </div>
            </div>

            <span
              style={{
                minWidth: 44,
                height: 36,
                padding: "0 12px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#D97706",
                color: "#fff",
                fontWeight: 950,
                fontSize: 15,
                boxShadow:
                  "0 6px 16px rgba(217,119,6,.18)",
              }}
            >
              {activeStuck.length}
            </span>
          </div>

          {activeStuck.length === 0 ? (
            <div style={card}>
              <CheckCircle2 color="#16A34A" />
              <div style={{ marginTop: 8 }}>
                لا توجد طلبات عالقة مفتوحة.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {activeStuck.map((item) => {
                const orderId = getId(item.orderId);
                const busy =
                  saving === `stuck-${item._id}` ||
                  saving === `dispatch-${item._id}`;

                return (
                  <article
                    key={item._id}
                    style={{
                      ...card,
                      border:
                        "1px solid #FCD34D",
                      borderRadius: 18,
                      background:
                        "linear-gradient(180deg,#FFFFFF 0%,#FFFBEB 100%)",
                      boxShadow:
                        "0 10px 28px rgba(217,119,6,.08)",
                      padding: 18,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: "#FFFBEB",
                        color: "#B45309",
                        border: "1px solid #FDE68A",
                        fontWeight: 950,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={18} />
                      طلب عالق
                    </div>

                    <h3
                      style={{
                        margin: "8px 0 0",
                      }}
                    >
                      {orderLabel(item.orderId)}
                    </h3>

                    <p
                      style={{
                        color: "#475569",
                        lineHeight: 1.8,
                      }}
                    >
                      {item.reason}
                    </p>

                    <div
                      style={{
                        color: "#64748B",
                        fontSize: 12,
                      }}
                    >
                      اكتُشف: {formatDate(item.detectedAt)}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      {orderId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void redispatch(
                              orderId,
                              item._id,
                              undefined,
                              item._id,
                            )
                          }
                          style={{
                            minHeight: 46,
                            border: 0,
                            borderRadius: 13,
                            background: "#F97316",
                            color: "#fff",
                            fontWeight: 950,
                            boxShadow:
                              "0 8px 18px rgba(249,115,22,.18)",
                            padding: "0 16px",
                            padding: "0 15px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <RotateCcw size={17} />
                          إعادة إلى Dispatch
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void resolveStuck(item)
                        }
                        style={{
                          minHeight: 44,
                          border: "1px solid #CBD5E1",
                          borderRadius: 12,
                          background: "#fff",
                          fontWeight: 900,
                          padding: "0 15px",
                          cursor: "pointer",
                        }}
                      >
                        إغلاق التنبيه
                      </button>

                      {orderId && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/orders/${orderId}`)
                          }
                          style={{
                            minHeight: 44,
                            border: "1px solid #CBD5E1",
                            borderRadius: 12,
                            background: "#F8FAFC",
                            fontWeight: 900,
                            padding: "0 15px",
                            cursor: "pointer",
                          }}
                        >
                          فتح الطلب
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        )}
      </div>
    </main>
  );
}
