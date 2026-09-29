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
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#F8FAFC",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 18,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <Banknote size={28} />
            <h1
              style={{
                margin: 0,
                fontSize: 26,
              }}
            >
              كشف حساب الكباتن
            </h1>
          </div>

          <p
            style={{
              margin: 0,
              color: "#64748B",
            }}
          >
            اختر الكابتن والفترة لعرض كشف الحساب.
          </p>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 18,
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
              alignItems: "end",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span>الكابتن</span>

              <select
                value={captainId}
                onChange={(e) => {
                  setCaptainId(e.target.value);
                  setData(null);
                  setError("");
                }}
                disabled={loadingCaptains}
                style={{
                  height: 44,
                  border: "1px solid #CBD5E1",
                  borderRadius: 10,
                  padding: "0 12px",
                  background: "#FFFFFF",
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
              <span>من</span>

              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setData(null);
                }}
                style={{
                  height: 44,
                  border: "1px solid #CBD5E1",
                  borderRadius: 10,
                  padding: "0 12px",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span>إلى</span>

              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setData(null);
                }}
                style={{
                  height: 44,
                  border: "1px solid #CBD5E1",
                  borderRadius: 10,
                  padding: "0 12px",
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => void loadStatement()}
              disabled={loading}
              style={{
                height: 44,
                border: 0,
                borderRadius: 10,
                background: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 800,
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
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
              style={{
                height: 44,
                border: "1px solid #CBD5E1",
                borderRadius: 10,
                background: "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              color: "#B91C1C",
              border: "1px solid #FECACA",
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 18,
              padding: 40,
              textAlign: "center",
            }}
          >
            <Loader2
              size={30}
              className="premium-spin"
            />
            <div style={{ marginTop: 10 }}>
              جاري تحميل كشف الحساب...
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {[
                [
                  "عدد الطلبات",
                  data.numberOfOrders ??
                    data.orders ??
                    data.completedOrders?.length ??
                    0,
                ],
                [
                  "المحصل من الزبائن",
                  money(
                    data.collectedFromCustomers,
                  ),
                ],
                [
                  "المدفوع للمحل",
                  money(
                    data.paidToEstablishments,
                  ),
                ],
                [
                  "أجور التوصيل",
                  money(data.deliveryFees),
                ],
                [
                  "فرق الكاش",
                  money(data.cashDifference),
                ],
              ].map(([title, value]) => (
                <div
                  key={String(title)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 16,
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      color: "#64748B",
                      fontSize: 13,
                      marginBottom: 8,
                    }}
                  >
                    {title}
                  </div>

                  <strong
                    style={{
                      fontSize: 24,
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 18,
                padding: 20,
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                تفاصيل الطلبات المكتملة
              </h2>

              {Array.isArray(
                data.completedOrders,
              ) &&
              data.completedOrders.length > 0 ? (
                <div
                  style={{
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
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
                              padding: 12,
                              borderBottom:
                                "1px solid #E2E8F0",
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
                          <tr
                            key={
                              order.orderId ||
                              `${order.orderNumber}-${index}`
                            }
                          >
                            <td
                              style={{
                                padding: 12,
                                borderBottom:
                                  "1px solid #F1F5F9",
                                fontWeight: 800,
                              }}
                            >
                              #
                              {order.orderNumber ||
                                order.orderId ||
                                "—"}
                            </td>

                            <td
                              style={{
                                padding: 12,
                                borderBottom:
                                  "1px solid #F1F5F9",
                              }}
                            >
                              {dateText(
                                order.completedAt,
                              )}
                            </td>

                            <td
                              style={{
                                padding: 12,
                                borderBottom:
                                  "1px solid #F1F5F9",
                              }}
                            >
                              {money(
                                order.orderValue,
                              )}
                            </td>

                            <td
                              style={{
                                padding: 12,
                                borderBottom:
                                  "1px solid #F1F5F9",
                              }}
                            >
                              {money(
                                order.deliveryFee,
                              )}
                            </td>

                            <td
                              style={{
                                padding: 12,
                                borderBottom:
                                  "1px solid #F1F5F9",
                              }}
                            >
                              {money(
                                order.collectedFromCustomer,
                              )}
                            </td>

                            <td
                              style={{
                                padding: 12,
                                borderBottom:
                                  "1px solid #F1F5F9",
                              }}
                            >
                              {money(
                                order.paidToEstablishment,
                              )}
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
                    padding: 30,
                    textAlign: "center",
                    color: "#64748B",
                  }}
                >
                  لا توجد طلبات مكتملة في هذه الفترة.
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !data && !error && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 18,
              padding: 50,
              textAlign: "center",
              color: "#64748B",
            }}
          >
            اختر الكابتن ثم اضغط «عرض كشف الحساب».
          </div>
        )}
      </div>
    </main>
  );
}
