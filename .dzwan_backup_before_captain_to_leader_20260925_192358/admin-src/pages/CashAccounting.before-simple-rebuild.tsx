import { useState } from "react";
import {
  Banknote,
  Calculator,
  Loader2,
  Search,
  WalletCards,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type CashData = {
  paidToEstablishments?: number;
  collectedFromCustomers?: number;
  deliveryFees?: number;
  cashDifference?: number;
};

function formatMoney(value: unknown) {
  const number = Number(value ?? 0);

  return new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

export default function CashAccounting() {
  const [captainId, setCaptainId] = useState("");
  const [data, setData] = useState<CashData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const id = captainId.trim();

    if (!id) {
      setError("أدخل معرف الكابتن أولًا.");
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/completion/cash/${encodeURIComponent(id)}`,
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
                <Search size={19} />
              </div>

              <div>
                <h2>البحث عن كابتن</h2>
                <p>أدخل معرف الكابتن لعرض كشف الحساب.</p>
              </div>
            </div>

            <div className="premium-form-row">
              <div className="premium-field">
                <label htmlFor="captain-id">
                  معرف الكابتن
                </label>

                <input
                  id="captain-id"
                  className="premium-input"
                  value={captainId}
                  onChange={(e) => setCaptainId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void load();
                    }
                  }}
                  placeholder="أدخل معرف الكابتن"
                />
              </div>

              <button
                type="button"
                className="premium-primary-button"
                onClick={() => void load()}
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
            </div>
          </section>

          {error && (
            <div className="premium-error">
              {error}
            </div>
          )}

          {loading ? (
            <section className="premium-state-card">
              <Loader2
                size={28}
                className="premium-spin"
              />
              <span>جارٍ تحميل كشف الحساب...</span>
            </section>
          ) : data ? (
            <section className="premium-stat-grid">
              <div className="premium-stat-card">
                <div className="premium-stat-icon">
                  <WalletCards size={20} />
                </div>

                <span>الطلبات المدفوعة للمحلات</span>
                <strong>
                  {formatMoney(data.paidToEstablishments)}
                </strong>
              </div>

              <div className="premium-stat-card">
                <div className="premium-stat-icon">
                  <Banknote size={20} />
                </div>

                <span>المحصل من الزبائن</span>
                <strong>
                  {formatMoney(data.collectedFromCustomers)}
                </strong>
              </div>

              <div className="premium-stat-card">
                <div className="premium-stat-icon">
                  <Calculator size={20} />
                </div>

                <span>أجور التوصيل</span>
                <strong>
                  {formatMoney(data.deliveryFees)}
                </strong>
              </div>

              <div className="premium-stat-card highlight">
                <div className="premium-stat-icon">
                  <Banknote size={20} />
                </div>

                <span>فرق الكاش</span>
                <strong>
                  {formatMoney(data.cashDifference)}
                </strong>
              </div>
            </section>
          ) : (
            <section className="premium-state-card muted">
              <WalletCards size={30} />
              <h3>لا يوجد كشف حساب معروض</h3>
              <p>
                أدخل معرف الكابتن لعرض تفاصيل الكاش.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
