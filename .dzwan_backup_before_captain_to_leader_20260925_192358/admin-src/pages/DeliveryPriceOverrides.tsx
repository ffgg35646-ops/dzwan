import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleDollarSign,
  Globe2,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Target,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type Scope =
  | "global"
  | "governorate"
  | "area"
  | "establishment"
  | "establishment_group";

interface OverrideItem {
  _id: string;
  scope: Scope;
  price: number;
  priority: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const scopeLabels: Record<Scope, string> = {
  global: "عام",
  governorate: "محافظة",
  area: "منطقة",
  establishment: "محل / مطعم",
  establishment_group: "مجموعة محلات / مطاعم",
};

export default function DeliveryPriceOverrides() {
  const [items, setItems] = useState<OverrideItem[]>([]);
  const [price, setPrice] = useState("");
  const [scope, setScope] = useState<Scope>("global");
  const [priority, setPriority] = useState("0");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeCount = useMemo(
    () => items.filter((item) => item.isActive !== false).length,
    [items],
  );

  const inactiveCount = items.length - activeCount;

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/delivery-price-overrides");
      setItems(
        Array.isArray(response.data?.data)
          ? response.data.data
          : [],
      );
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل قواعد أسعار التوصيل.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setError("");
    setMessage("");

    const numericPrice = Number(price);
    const numericPriority = Number(priority);

    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError("أدخل سعر توصيل صحيحًا.");
      return;
    }

    if (
      !priority.trim() ||
      !Number.isInteger(numericPriority) ||
      numericPriority < 0
    ) {
      setError("الأولوية يجب أن تكون رقمًا صحيحًا موجبًا أو صفرًا.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/delivery-price-overrides", {
        scope,
        price: numericPrice,
        priority: numericPriority,
        isActive: true,
      });

      setPrice("");
      setPriority("0");
      setMessage("تمت إضافة قاعدة سعر التوصيل بنجاح.");
      await load();
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر إضافة قاعدة سعر التوصيل.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="premium-page" dir="rtl">
      <div className="premium-page-shell">
        <section className="premium-page-intro">
          <div>
            <span className="premium-page-kicker">
              التسعير والتوصيل
            </span>
            <h1>أسعار التوصيل المخصصة</h1>
            <p>
              إدارة قواعد أسعار التوصيل حسب النطاق والأولوية.
            </p>
          </div>

          <div className="premium-page-icon">
            <CircleDollarSign size={27} />
          </div>
        </section>

        <section className="premium-stat-grid compact">
          <div className="premium-stat-card">
            <div className="premium-stat-icon">
              <Settings2 size={20} />
            </div>
            <span>إجمالي القواعد</span>
            <strong>{items.length}</strong>
          </div>

          <div className="premium-stat-card">
            <div className="premium-stat-icon success">
              <Check size={20} />
            </div>
            <span>القواعد النشطة</span>
            <strong>{activeCount}</strong>
          </div>

          <div className="premium-stat-card">
            <div className="premium-stat-icon danger">
              <X size={20} />
            </div>
            <span>غير النشطة</span>
            <strong>{inactiveCount}</strong>
          </div>
        </section>

        {(message || error) && (
          <div className={error ? "premium-error" : "premium-success"}>
            {error || message}
          </div>
        )}

        <section className="premium-panel">
          <div className="premium-section-heading">
            <div>
              <span>قاعدة جديدة</span>
              <h2>إضافة سعر توصيل مخصص</h2>
              <p>
                حدد النطاق والسعر والأولوية التي سيستخدمها النظام.
              </p>
            </div>

            <div className="premium-heading-icon">
              <Plus size={20} />
            </div>
          </div>

          <div className="premium-form-grid">
            <label className="premium-field">
              <span>النطاق</span>
              <select
                value={scope}
                disabled={busy}
                onChange={(event) =>
                  setScope(event.target.value as Scope)
                }
              >
                {Object.entries(scopeLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="premium-field">
              <span>سعر التوصيل</span>
              <div className="premium-input-with-icon">
                <CircleDollarSign size={17} />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={price}
                  disabled={busy}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  placeholder="مثال: 5000"
                />
              </div>
            </label>

            <label className="premium-field">
              <span>الأولوية</span>
              <input
                type="number"
                min="0"
                step="1"
                value={priority}
                disabled={busy}
                onChange={(event) =>
                  setPriority(event.target.value)
                }
                placeholder="0"
              />
            </label>
          </div>

          <div className="premium-form-actions">
            <button
              type="button"
              className="premium-button primary"
              disabled={busy}
              onClick={() => void create()}
            >
              {busy ? (
                <Loader2 size={17} className="premium-spin" />
              ) : (
                <Plus size={17} />
              )}
              {busy ? "جارٍ الحفظ..." : "إضافة القاعدة"}
            </button>

            <button
              type="button"
              className="premium-button ghost"
              disabled={loading || busy}
              onClick={() => void load()}
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>
        </section>

        <section className="premium-panel">
          <div className="premium-section-heading">
            <div>
              <span>القواعد الحالية</span>
              <h2>قواعد أسعار التوصيل</h2>
              <p>القواعد المحفوظة حاليًا في الخادم.</p>
            </div>
          </div>

          {loading ? (
            <div className="premium-state-card">
              <Loader2 size={28} className="premium-spin" />
              <span>جارٍ تحميل قواعد الأسعار...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="premium-state-card muted">
              <CircleDollarSign size={30} />
              <h3>لا توجد قواعد حاليًا</h3>
              <p>أضف أول قاعدة سعر توصيل من النموذج أعلاه.</p>
            </div>
          ) : (
            <div className="premium-rule-list">
              {items.map((item) => {
                const active = item.isActive !== false;

                return (
                  <article
                    className="premium-price-rule"
                    key={item._id}
                  >
                    <div className="premium-price-rule-main">
                      <div className="premium-rule-icon">
                        {item.scope === "global" ? (
                          <Globe2 size={19} />
                        ) : (
                          <Target size={19} />
                        )}
                      </div>

                      <div>
                        <strong>
                          {scopeLabels[item.scope] || item.scope}
                        </strong>
                        <span>
                          أولوية {item.priority}
                        </span>
                      </div>
                    </div>

                    <div className="premium-price-value">
                      <span>السعر</span>
                      <strong>
                        {Number(item.price || 0).toLocaleString(
                          "ar-IQ",
                        )}
                      </strong>
                    </div>

                    <span
                      className={`premium-status-pill ${
                        active ? "success" : "neutral"
                      }`}
                    >
                      {active ? "نشطة" : "غير نشطة"}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
