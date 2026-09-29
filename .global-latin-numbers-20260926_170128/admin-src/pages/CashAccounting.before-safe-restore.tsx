import { useEffect, useState } from "react";
import {
  Banknote,
  Calculator,
  Loader2,
  RefreshCw,
  WalletCards,
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
    <main className="admin-main" dir="rtl">
      <div className="admin-content">
        <div className="premium-page-shell">

          <section className="premium-page-intro">
            <div>
              <span className="premium-page-kicker">
                المحاسبة والتسويات
              </span>

              <h1>كشف حساب الكاش</h1>

              <p>
                مراجعة المبالغ المحصلة والمدفوعة وأجور التوصيل
                لكل كابتن.
              </p>
            </div>

            <div className="premium-page-icon">
              <Banknote size={26} />
            </div>
          </section>

          <section className="premium-form-card">
            <div className="premium-section-heading">
              <div className="premium-section-icon">
                <Calculator size={19} />
              </div>

              <div>
                <h2>بيانات كشف الحساب</h2>
                <p>
                  اختر الكابتن وحدد الفترة المطلوبة لعرض كشف الحساب.
                </p>
              </div>
            </div>

            <div className="premium-form-row">

              <div className="premium-field">
                <label htmlFor="cash-captain">
                  الكابتن
                </label>

                <select
                  id="cash-captain"
                  className="premium-input"
                  value={captainId}
                  onChange={(e) => {
                    setCaptainId(e.target.value);
                    setData(null);
                    setError("");
                  }}
                  disabled={loadingCaptains}
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
              </div>

              <div className="premium-field">
                <label htmlFor="cash-from">
                  من
                </label>

                <input
                  id="cash-from"
                  className="premium-input"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setData(null);
                  }}
                />
              </div>

              <div className="premium-field">
                <label htmlFor="cash-to">
                  إلى
                </label>

                <input
                  id="cash-to"
                  className="premium-input"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setData(null);
                  }}
                />
              </div>

              <button
                type="button"
                className="premium-primary-button"
                onClick={() => void loadStatement()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2
                      size={18}
                      className="premium-spin"
                    />
                    جارٍ التحميل...
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
                className="premium-secondary-button"
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
              >
                <RefreshCw size={17} />
                تحديث
              </button>
            </div>
          </section>

          {error && (
            <div className="premium-error">
              {error}
            </div>
          )}

          {loading && (
            <section className="premium-state-card">
              <Loader2
                size={28}
                className="premium-spin"
              />

              <span>
                جارٍ تحميل كشف الحساب...
              </span>
            </section>
          )}

          {!loading && data && (
            <>
              <section className="premium-stat-grid">

                <div className="premium-stat-card">
                  <div className="premium-stat-icon">
                    <WalletCards size={20} />
                  </div>

                  <span>عدد الطلبات</span>

                  <strong>
                    {data.numberOfOrders ??
                      data.orders ??
                      data.completedOrders?.length ??
                      0}
                  </strong>
                </div>

                <div className="premium-stat-card">
                  <div className="premium-stat-icon">
                    <Banknote size={20} />
                  </div>

                  <span>المحصل من الزبائن</span>

                  <strong>
                    {money(
                      data.collectedFromCustomers,
                    )}
                  </strong>
                </div>

                <div className="premium-stat-card">
                  <div className="premium-stat-icon">
                    <WalletCards size={20} />
                  </div>

                  <span>المدفوع للمحل</span>

                  <strong>
                    {money(
                      data.paidToEstablishments,
                    )}
                  </strong>
                </div>

                <div className="premium-stat-card">
                  <div className="premium-stat-icon">
                    <Calculator size={20} />
                  </div>

                  <span>أجور التوصيل</span>

                  <strong>
                    {money(data.deliveryFees)}
                  </strong>
                </div>

                <div className="premium-stat-card highlight">
                  <div className="premium-stat-icon">
                    <Banknote size={20} />
                  </div>

                  <span>فرق الكاش</span>

                  <strong>
                    {money(data.cashDifference)}
                  </strong>
                </div>

              </section>

              <section
                className="premium-form-card"
                style={{ marginTop: 20 }}
              >
                <div className="premium-section-heading">
                  <div className="premium-section-icon">
                    <Calculator size={19} />
                  </div>

                  <div>
                    <h2>تفاصيل الطلبات المكتملة</h2>
                    <p>
                      الطلبات التي دخلت في كشف حساب الكابتن.
                    </p>
                  </div>
                </div>

                {Array.isArray(
                  data.completedOrders,
                ) &&
                data.completedOrders.length > 0 ? (
                  <div
                    style={{
                      overflowX: "auto",
                      marginTop: 18,
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
                                padding: "13px 12px",
                                borderBottom:
                                  "1px solid #E2E8F0",
                                color: "#475569",
                                fontSize: 12,
                                fontWeight: 800,
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
                            <tr
                              key={
                                order.orderId ||
                                `${order.orderNumber}-${index}`
                              }
                            >
                              <td
                                style={{
                                  padding: "13px 12px",
                                  borderBottom:
                                    "1px solid #F1F5F9",
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                #
                                {order.orderNumber ||
                                  order.orderId ||
                                  "—"}
                              </td>

                              <td
                                style={{
                                  padding: "13px 12px",
                                  borderBottom:
                                    "1px solid #F1F5F9",
                                  color: "#64748B",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {dateText(
                                  order.completedAt,
                                )}
                              </td>

                              <td
                                style={{
                                  padding: "13px 12px",
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
                                  padding: "13px 12px",
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
                                  padding: "13px 12px",
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
                                  padding: "13px 12px",
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
                  <section
                    className="premium-state-card muted"
                    style={{ marginTop: 16 }}
                  >
                    <WalletCards size={30} />

                    <h3>
                      لا توجد طلبات مكتملة في هذه الفترة
                    </h3>

                    <p>
                      جرّب توسيع الفترة الزمنية أو اختيار كابتن آخر.
                    </p>
                  </section>
                )}
              </section>
            </>
          )}

          {!loading && !data && !error && (
            <section className="premium-state-card muted">
              <WalletCards size={30} />

              <h3>
                لا يوجد كشف حساب معروض
              </h3>

              <p>
                اختر الكابتن والفترة ثم اضغط «عرض كشف الحساب».
              </p>
            </section>
          )}

        </div>
      </div>
    </main>
  );
}
