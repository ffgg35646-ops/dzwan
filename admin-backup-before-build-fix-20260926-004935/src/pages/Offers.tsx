import { useEffect, useState } from "react";
import {
  CalendarDays,
  Loader2,
  Megaphone,
  Plus,
  Tag,
} from "lucide-react";
import { getApiErrorMessage } from "../lib/api";

type Offer = {
  _id: string;
  title?: string;
  description?: string;
  audience?: string;
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

function formatDate(value?: string) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/offers/admin",
      );

      if (!response.ok) {
        throw new Error(
          "تعذر تحميل العروض.",
        );
      }

      const json = await response.json();

      setOffers(
        Array.isArray(json?.data)
          ? json.data
          : [],
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل العروض.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    const cleanTitle = title.trim();
    const cleanDescription =
      description.trim();

    if (!cleanTitle) {
      setError("أدخل عنوان العرض.");
      return;
    }

    if (!cleanDescription) {
      setError("أدخل وصف العرض.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await fetch(
        "/api/offers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: cleanTitle,
            description: cleanDescription,
            audience: "all",
            startsAt:
              new Date().toISOString(),
            endsAt: new Date(
              Date.now() +
                30 * 86400000,
            ).toISOString(),
            isActive: true,
          }),
        },
      );

      if (!response.ok) {
        let message =
          "تعذر إنشاء العرض.";

        try {
          const json =
            await response.json();

          message =
            json?.message ||
            json?.error ||
            message;
        } catch {
          // Keep fallback message.
        }

        throw new Error(message);
      }

      setTitle("");
      setDescription("");

      await load();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر إنشاء العرض.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeCount = offers.filter(
    (offer) => offer.isActive,
  ).length;

  return (
    <main className="admin-main" dir="rtl">
<div className="admin-content">
        <div className="premium-page-shell">
          <section className="premium-page-intro">
            <div>
              <span className="premium-page-kicker">
                التسويق والعروض
              </span>

              <h1>العروض</h1>

              <p>
                إنشاء وإدارة العروض الترويجية الموجهة
                لمستخدمي المنصة.
              </p>
            </div>

            <div className="premium-page-icon">
              <Megaphone size={26} />
            </div>
          </section>

          <section className="premium-stat-grid compact">
            <div className="premium-stat-card">
              <div className="premium-stat-icon">
                <Tag size={20} />
              </div>

              <span>إجمالي العروض</span>
              <strong>{offers.length}</strong>
            </div>

            <div className="premium-stat-card highlight">
              <div className="premium-stat-icon">
                <Megaphone size={20} />
              </div>

              <span>العروض المفعلة</span>
              <strong>{activeCount}</strong>
            </div>

            <div className="premium-stat-card">
              <div className="premium-stat-icon">
                <CalendarDays size={20} />
              </div>

              <span>مدة العرض الافتراضية</span>
              <strong>30 يوم</strong>
            </div>
          </section>

          {error && (
            <div className="premium-error">
              {error}
            </div>
          )}

          <section className="premium-form-card">
            <div className="premium-section-heading">
              <div className="premium-section-icon">
                <Plus size={19} />
              </div>

              <div>
                <h2>إضافة عرض جديد</h2>
                <p>
                  العرض الجديد سيكون متاحًا لجميع الجمهور
                  لمدة 30 يومًا.
                </p>
              </div>
            </div>

            <div className="premium-form-grid">
              <div className="premium-field">
                <label htmlFor="offer-title">
                  عنوان العرض
                </label>

                <input
                  id="offer-title"
                  className="premium-input"
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="مثال: خصم التوصيل اليوم"
                  disabled={creating}
                />
              </div>

              <div className="premium-field">
                <label htmlFor="offer-description">
                  وصف العرض
                </label>

                <input
                  id="offer-description"
                  className="premium-input"
                  value={description}
                  onChange={(e) =>
                    setDescription(
                      e.target.value,
                    )
                  }
                  placeholder="اكتب تفاصيل العرض"
                  disabled={creating}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void create();
                    }
                  }}
                />
              </div>
            </div>

            <div className="premium-form-footer">
              <span>
                يبدأ العرض فور إنشائه وينتهي بعد 30 يومًا.
              </span>

              <button
                type="button"
                className="premium-primary-button"
                disabled={
                  creating ||
                  !title.trim() ||
                  !description.trim()
                }
                onClick={() =>
                  void create()
                }
              >
                {creating ? (
                  <>
                    <Loader2
                      size={18}
                      className="premium-spin"
                    />
                    جارٍ إنشاء العرض...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    إضافة العرض
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="premium-panel">
            <div className="premium-panel-header">
              <div>
                <h2>العروض الحالية</h2>
                <p>
                  جميع العروض التي تم إنشاؤها من لوحة الإدارة.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="premium-state-card inline">
                <Loader2
                  size={27}
                  className="premium-spin"
                />
                <span>
                  جارٍ تحميل العروض...
                </span>
              </div>
            ) : offers.length === 0 ? (
              <div className="premium-state-card muted">
                <Tag size={30} />
                <h3>لا توجد عروض</h3>
                <p>
                  لم يتم إنشاء أي عروض حتى الآن.
                </p>
              </div>
            ) : (
              <div className="premium-offers-grid">
                {offers.map((offer) => (
                  <article
                    className="premium-offer-card"
                    key={offer._id}
                  >
                    <div className="premium-offer-top">
                      <div className="premium-offer-icon">
                        <Tag size={19} />
                      </div>

                      <span
                        className={`premium-status-pill ${
                          offer.isActive
                            ? "success"
                            : "neutral"
                        }`}
                      >
                        {offer.isActive
                          ? "مفعل"
                          : "غير مفعل"}
                      </span>
                    </div>

                    <h3>
                      {offer.title ||
                        "عرض بدون عنوان"}
                    </h3>

                    <p>
                      {offer.description ||
                        "لا يوجد وصف لهذا العرض."}
                    </p>

                    <div className="premium-offer-meta">
                      <div>
                        <span>الجمهور</span>
                        <strong>
                          {offer.audience ===
                          "all"
                            ? "الجميع"
                            : offer.audience ||
                              "غير محدد"}
                        </strong>
                      </div>

                      <div>
                        <span>البداية</span>
                        <strong>
                          {formatDate(
                            offer.startsAt,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>النهاية</span>
                        <strong>
                          {formatDate(
                            offer.endsAt,
                          )}
                        </strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
