import { useEffect, useState } from "react";
import {
  Palette,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

type Theme = {
  id: string;
  name: string;
  description?: string;
  primaryColor: string;
  primaryDarkColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
};

const API =
  (
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000/api"
  ).replace(/\/$/, "");

export default function AppThemeSettings() {
  const [themes, setThemes] =
    useState<Theme[]>([]);

  const [active, setActive] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [choosing, setChoosing] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [
        available,
        current,
      ] = await Promise.all([
        fetch(
          `${API}/app-theme`,
          {
            credentials: "include",
          },
        ).then(async (r) => {
          if (!r.ok) {
            throw new Error(
              "تعذر تحميل الأنماط.",
            );
          }

          return r.json();
        }),

        fetch(
          `${API}/app-theme/active`,
          {
            credentials: "include",
          },
        ).then(async (r) => {
          if (!r.ok) {
            throw new Error(
              "تعذر تحميل المظهر الحالي.",
            );
          }

          return r.json();
        }),
      ]);

      setThemes(
        available?.data ?? [],
      );

      setActive(
        current?.data?.id ?? "",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل الأنماط.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function choose(id: string) {
    setChoosing(id);
    setError("");

    try {
      const response = await fetch(
        `${API}/app-theme/active`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            activeTheme: id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "تعذر تغيير المظهر.",
        );
      }

      setActive(id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تغيير المظهر.",
      );
    } finally {
      setChoosing("");
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2
          size={22}
          className="spin"
        />
        جاري تحميل الأنماط...
      </div>
    );
  }

  return (
    <div
      className="admin-app app-theme-page"
      dir="rtl"
    >
      <main className="admin-main">
<div className="admin-content">
          <div className="dashboard">
            <section className="dashboard-intro theme-hero">
              <div>
                <span className="dashboard-label">
                  Visual Settings
                </span>

                <h1>
                  مظهر تطبيق زاجل
                </h1>

                <p>
                  اختر المظهر البصري للتطبيق بدون
                  التأثير على الطلبات أو البيانات أو
                  منطق التشغيل.
                </p>
              </div>

              <div className="theme-hero-icon">
                <Palette size={29} />
              </div>
            </section>

            {error && (
              <div className="admin-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <section className="theme-toolbar">
              <div>
                <strong>
                  الأنماط المتاحة
                </strong>

                <span>
                  {themes.length} مظهر متاح
                </span>
              </div>

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="theme-refresh-button"
              >
                <RefreshCw size={16} />
                تحديث
              </button>
            </section>

            {themes.length === 0 ? (
              <section className="theme-empty">
                <Palette size={31} />
                <strong>
                  لا توجد أنماط متاحة
                </strong>
                <span>
                  لم يتم العثور على أي مظهر في النظام.
                </span>
              </section>
            ) : (
              <section className="theme-grid">
                {themes.map((theme) => {
                  const isActive =
                    active === theme.id;

                  const isChoosing =
                    choosing === theme.id;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      className={
                        isActive
                          ? "theme-card active"
                          : "theme-card"
                      }
                      onClick={() =>
                        void choose(theme.id)
                      }
                      disabled={Boolean(choosing)}
                    >
                      <div
                        className="theme-card-preview"
                        style={{
                          background:
                            theme.backgroundColor,
                        }}
                      >
                        <div
                          className="theme-preview-window"
                          style={{
                            background:
                              theme.cardColor,
                          }}
                        >
                          <div
                            className="theme-preview-top"
                            style={{
                              background:
                                theme.primaryColor,
                            }}
                          />

                          <div className="theme-preview-content">
                            <span
                              style={{
                                background:
                                  theme.secondaryColor,
                              }}
                            />

                            <span
                              style={{
                                background:
                                  theme.primaryDarkColor,
                              }}
                            />

                            <span
                              style={{
                                background:
                                  theme.secondaryColor,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="theme-card-body">
                        <div className="theme-card-title">
                          <div>
                            <strong>
                              {theme.name}
                            </strong>

                            {theme.description && (
                              <span>
                                {theme.description}
                              </span>
                            )}
                          </div>

                          {isActive && (
                            <span className="theme-active-badge">
                              <Check size={13} />
                              مفعل
                            </span>
                          )}
                        </div>

                        <div className="theme-swatches">
                          <span
                            style={{
                              background:
                                theme.primaryColor,
                            }}
                          />

                          <span
                            style={{
                              background:
                                theme.primaryDarkColor,
                            }}
                          />

                          <span
                            style={{
                              background:
                                theme.secondaryColor,
                            }}
                          />

                          <span
                            style={{
                              background:
                                theme.cardColor,
                            }}
                          />
                        </div>

                        <div className="theme-card-action">
                          {isChoosing ? (
                            <>
                              <Loader2
                                size={16}
                                className="spin"
                              />
                              جاري التطبيق...
                            </>
                          ) : isActive ? (
                            <>
                              <Check size={16} />
                              المظهر الحالي
                            </>
                          ) : (
                            "تطبيق هذا المظهر"
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
