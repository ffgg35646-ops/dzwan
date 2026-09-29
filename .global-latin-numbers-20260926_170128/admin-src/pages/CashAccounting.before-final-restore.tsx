import { useEffect, useState } from "react";
import {
  Banknote,
  Calculator,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type Captain = {
  _id: string;
  fullName?: string;
  phone?: string;
};

type StatementOrder = {
  orderId?: string;
  orderNumber?: string;
  completedAt?: string | null;
  orderValue?: number;
  deliveryFee?: number;
  collectedFromCustomer?: number;
  paidToEstablishment?: number;
};

type CashData = {
  numberOfOrders?: number;
  orders?: number;
  paidToEstablishments?: number;
  collectedFromCustomers?: number;
  deliveryFees?: number;
  cashDifference?: number;
  completedOrders?: StatementOrder[];
};

function money(value: unknown) {
  const n = Number(value ?? 0);

  return new Intl.NumberFormat("ar-EG-u-nu-latn", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function dateText(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CashAccounting() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainId, setCaptainId] = useState("");
  const [from, setFrom] = useState("2020-01-01");
  const [to, setTo] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [data, setData] = useState<CashData | null>(null);
  const [loadingCaptains, setLoadingCaptains] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCaptains() {
    try {
      setLoadingCaptains(true);
      setError("");

      const response = await api.get("/captains");

      const rows = Array.isArray(
        response.data?.captains,
      )
        ? response.data.captains
        : [];

      setCaptains(rows);
    } catch (err) {
      console.error(err);
      setCaptains([]);
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل قائمة الكباتن.",
        ),
      );
    } finally {
      setLoadingCaptains(false);
    }
  }

  async function loadStatement() {
    if (!captainId) {
      setError("اختر الكابتن أولًا.");
      return;
    }

    if (from > to) {
      setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/completion/cash/${encodeURIComponent(captainId)}`,
        {
          params: {
            from,
            to,
          },
        },
      );

      setData(response.data ?? null);
    } catch (err) {
      console.error(err);
      setData(null);
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل كشف حساب الكابتن.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCaptains();
  }, []);

  return (
    <main
      dir="rtl"
      className="admin-main"
      style={{
        minHeight: "100%",
        background: "#F5F7FB",
      }}
    >
      <div
        className="admin-content"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "28px 24px 40px",
        }}
      >
        {/* Header */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0F4FC4 0%, #2563EB 58%, #3B82F6 100%)",
            borderRadius: 22,
            padding: "28px 30px",
            marginBottom: 22,
            color: "#FFFFFF",
            boxShadow: "0 12px 28px rgba(37, 99, 235, 0.16)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              top: -80,
              left: -40,
            }}
          />

          <div
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              bottom: -55,
              right: 80,
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  opacity: 0.88,
                  marginBottom: 9,
                }}
              >
                <Banknote size={17} />
                المحاسبة المالية
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  lineHeight: 1.2,
                  fontWeight: 900,
                  letterSpacing: "-0.4px",
                }}
              >
                كشف حساب الكابتن
              </h1>

              <p
                style={{
                  margin: "9px 0 0",
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "rgba(255,255,255,0.86)",
                  maxWidth: 650,
                }}
              >
                مراجعة الطلبات المكتملة والمبالغ المحصلة والمدفوعة
                وأجور التوصيل خلال الفترة المحددة.
              </p>
            </div>

            <div
              style={{
                flexShrink: 0,
                width: 62,
                height: 62,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
              }}
            >
              <Banknote size={30} />
            </div>
          </div>
        </section>

        {/* Filters */}
        <section
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5EAF2",
            borderRadius: 20,
            padding: 24,
            marginBottom: 22,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background: "#EEF4FF",
                color: "#2563EB",
              }}
            >
              <Calculator size={20} />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#172033",
                }}
              >
                تحديد كشف الحساب
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748B",
                  fontSize: 13,
                }}
              >
                اختر الكابتن والفترة الزمنية ثم اعرض التفاصيل.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(240px, 1.4fr) minmax(170px, 1fr) minmax(170px, 1fr)",
              gap: 14,
              alignItems: "end",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                الكابتن
              </span>

              <select
                value={captainId}
                onChange={(e) => {
                  setCaptainId(e.target.value);
                  setData(null);
                  setError("");
                }}
                disabled={loadingCaptains}
                style={{
                  width: "100%",
                  height: 46,
                  border: "1px solid #D7DEEA",
                  borderRadius: 12,
                  padding: "0 13px",
                  background: "#FAFBFD",
                  color: "#172033",
                  outline: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loadingCaptains ? "not-allowed" : "pointer",
                }}
              >
                <option value="">
                  {loadingCaptains
                    ? "جارٍ تحميل الكباتن..."
                    : "اختر الكابتن"}
                </option>

                {captains.map((captain) => (
                  <option
                    key={captain._id}
                    value={captain._id}
                  >
                    {captain.fullName || "بدون اسم"} —{" "}
                    {captain.phone || "بدون هاتف"}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                من
              </span>

              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setData(null);
                }}
                style={{
                  width: "100%",
                  height: 46,
                  border: "1px solid #D7DEEA",
                  borderRadius: 12,
                  padding: "0 13px",
                  background: "#FAFBFD",
                  color: "#172033",
                  outline: "none",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                إلى
              </span>

              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setData(null);
                }}
                style={{
                  width: "100%",
                  height: 46,
                  border: "1px solid #D7DEEA",
                  borderRadius: 12,
                  padding: "0 13px",
                  background: "#FAFBFD",
                  color: "#172033",
                  outline: "none",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #EEF2F7",
            }}
          >
            <button
              type="button"
              onClick={() => void loadStatement()}
              disabled={loading}
              style={{
                minHeight: 45,
                border: 0,
                borderRadius: 12,
                padding: "0 18px",
                background: loading ? "#93B4F5" : "#2563EB",
                color: "#FFFFFF",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 7px 16px rgba(37, 99, 235, 0.18)",
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="premium-spin"
                  />
                  جاري التحميل...
                </>
              ) : (
                <>
                  <Calculator size={18} />
                  عرض كشف الحساب
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCaptainId("");
                setData(null);
                setError("");
                setFrom("2020-01-01");
                setTo(
                  new Date()
                    .toISOString()
                    .slice(0, 10),
                );
                void loadCaptains();
              }}
              disabled={loading}
              style={{
                minHeight: 45,
                border: "1px solid #D7DEEA",
                borderRadius: 12,
                padding: "0 17px",
                background: "#FFFFFF",
                color: "#334155",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#FFF5F5",
              color: "#B42318",
              border: "1px solid #FECACA",
              borderRadius: 14,
              padding: "13px 15px",
              marginBottom: 18,
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5EAF2",
              borderRadius: 20,
              padding: "42px 20px",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Loader2
              size={30}
              className="premium-spin"
              style={{ color: "#2563EB" }}
            />

            <div
              style={{
                marginTop: 11,
                color: "#475569",
                fontWeight: 800,
              }}
            >
              جاري تحميل كشف الحساب...
            </div>
          </section>
        )}

        {/* Summary */}
        {!loading && data && (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              {[
                {
                  title: "عدد الطلبات",
                  value:
                    data.numberOfOrders ??
                    data.orders ??
                    data.completedOrders?.length ??
                    0,
                  icon: <Calculator size={20} />,
                  accent: "#2563EB",
                  bg: "#EEF4FF",
                },
                {
                  title: "المحصل من الزبائن",
                  value: money(data.collectedFromCustomers),
                  icon: <Banknote size={20} />,
                  accent: "#16A34A",
                  bg: "#ECFDF3",
                },
                {
                  title: "المدفوع للمحل",
                  value: money(data.paidToEstablishments),
                  icon: <Banknote size={20} />,
                  accent: "#7C3AED",
                  bg: "#F5F3FF",
                },
                {
                  title: "أجور التوصيل",
                  value: money(data.deliveryFees),
                  icon: <Calculator size={20} />,
                  accent: "#EA580C",
                  bg: "#FFF7ED",
                },
                {
                  title: "فرق الكاش",
                  value: money(data.cashDifference),
                  icon: <Banknote size={20} />,
                  accent: "#0F766E",
                  bg: "#ECFEFF",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5EAF2",
                    borderRadius: 18,
                    padding: 18,
                    boxShadow: "0 7px 20px rgba(15, 23, 42, 0.035)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#64748B",
                        fontWeight: 800,
                      }}
                    >
                      {item.title}
                    </span>

                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        background: item.bg,
                        color: item.accent,
                      }}
                    >
                      {item.icon}
                    </div>
                  </div>

                  <strong
                    style={{
                      display: "block",
                      fontSize: 25,
                      lineHeight: 1.2,
                      color: "#172033",
                      fontWeight: 900,
                    }}
                  >
                    {item.value}
                  </strong>
                </div>
              ))}
            </section>

            {/* Orders */}
            <section
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5EAF2",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  padding: "20px 22px",
                  borderBottom: "1px solid #EEF2F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#172033",
                    }}
                  >
                    تفاصيل الطلبات المكتملة
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#64748B",
                      fontSize: 13,
                    }}
                  >
                    جميع الطلبات الداخلة في كشف حساب الكابتن.
                  </p>
                </div>

                <div
                  style={{
                    padding: "7px 11px",
                    borderRadius: 10,
                    background: "#F1F5F9",
                    color: "#475569",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {data.numberOfOrders ??
                    data.orders ??
                    data.completedOrders?.length ??
                    0}{" "}
                  طلب
                </div>
              </div>

              {Array.isArray(data.completedOrders) &&
              data.completedOrders.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: 760,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        {[
                          "الطلب",
                          "وقت الإكمال",
                          "قيمة الطلب",
                          "أجرة التوصيل",
                          "المحصل",
                          "المدفوع للمحل",
                        ].map((title) => (
                          <th
                            key={title}
                            style={{
                              textAlign: "right",
                              padding: "13px 16px",
                              color: "#64748B",
                              fontSize: 12,
                              fontWeight: 900,
                              borderBottom: "1px solid #E8EDF4",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {data.completedOrders.map(
                        (order, index) => (
                          <tr key={order.orderId || `${order.orderNumber}-${index}`}>
                            <td
                              style={{
                                padding: "14px 16px",
                                borderBottom: "1px solid #F1F5F9",
                                fontWeight: 900,
                                color: "#172033",
                                whiteSpace: "nowrap",
                              }}
                            >
                              #{order.orderNumber || order.orderId || "—"}
                            </td>

                            <td
                              style={{
                                padding: "14px 16px",
                                borderBottom: "1px solid #F1F5F9",
                                color: "#64748B",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {dateText(order.completedAt)}
                            </td>

                            <td
                              style={{
                                padding: "14px 16px",
                                borderBottom: "1px solid #F1F5F9",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {money(order.orderValue)}
                            </td>

                            <td
                              style={{
                                padding: "14px 16px",
                                borderBottom: "1px solid #F1F5F9",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {money(order.deliveryFee)}
                            </td>

                            <td
                              style={{
                                padding: "14px 16px",
                                borderBottom: "1px solid #F1F5F9",
                                fontWeight: 800,
                                color: "#166534",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {money(order.collectedFromCustomer)}
                            </td>

                            <td
                              style={{
                                padding: "14px 16px",
                                borderBottom: "1px solid #F1F5F9",
                                fontWeight: 800,
                                color: "#6D28D9",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {money(order.paidToEstablishment)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: "46px 20px",
                    textAlign: "center",
                    color: "#64748B",
                  }}
                >
                  <Banknote
                    size={32}
                    style={{
                      marginBottom: 10,
                      opacity: 0.55,
                    }}
                  />

                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: "#475569",
                    }}
                  >
                    لا توجد طلبات مكتملة في هذه الفترة
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 13,
                    }}
                  >
                    جرّب توسيع الفترة الزمنية أو اختيار كابتن آخر.
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {!loading && !data && !error && (
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5EAF2",
              borderRadius: 20,
              padding: "54px 20px",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 13px",
                background: "#EEF4FF",
                color: "#2563EB",
              }}
            >
              <Banknote size={26} />
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 16,
                color: "#334155",
                fontWeight: 900,
              }}
            >
              لا يوجد كشف حساب معروض
            </h3>

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748B",
                fontSize: 13,
              }}
            >
              اختر الكابتن والفترة ثم اضغط «عرض كشف الحساب».
            </p>
          </section>
        )}
      </div>
    </main>
  );
}