import { useEffect, useState } from "react";
import {
  Palette,
  Save,
  Loader2,
  Image,
  CheckCircle2,
  AlertCircle,
  Smartphone,
} from "lucide-react";

type Branding = {
  appName: string;
  primaryColor: string;
  primaryDarkColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  secondaryTextColor: string;
  successColor: string;
  dangerColor: string;
  borderColor: string;
  logoUrl: string;
};

const DEFAULT_DATA: Branding = {
  appName: "Zajel Delivery",
  primaryColor: "#E87516",
  primaryDarkColor: "#C95F0C",
  secondaryColor: "#F28C28",
  backgroundColor: "#F5F7FA",
  textColor: "#0F172A",
  secondaryTextColor: "#64748B",
  successColor: "#F28C28",
  dangerColor: "#DC2626",
  borderColor: "#E2E8F0",
  logoUrl: "",
};

const fields: Array<
  [keyof Branding, string, string]
> = [
  ["appName", "اسم التطبيق", "text"],
  ["primaryColor", "اللون الرئيسي", "color"],
  ["primaryDarkColor", "اللون الداكن", "color"],
  ["secondaryColor", "اللون الثانوي", "color"],
  ["backgroundColor", "الخلفية", "color"],
  ["textColor", "لون النص", "color"],
  [
    "secondaryTextColor",
    "النص الثانوي",
    "color",
  ],
  ["successColor", "لون النجاح", "color"],
  ["dangerColor", "لون الخطأ", "color"],
  ["borderColor", "لون الحدود", "color"],
  ["logoUrl", "رابط اللوجو", "text"],
];

export default function AppBranding() {
  const [data, setData] =
    useState<Branding>(DEFAULT_DATA);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/app-branding",
      );

      if (!res.ok) {
        throw new Error(
          "تعذر تحميل هوية التطبيق.",
        );
      }

      const json = await res.json();

      if (json.data) {
        setData({
          ...DEFAULT_DATA,
          ...json.data,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل هوية التطبيق.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        "/api/app-branding",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!res.ok) {
        throw new Error(
          "تعذر حفظ إعدادات التطبيق.",
        );
      }

      setMessage(
        "تم حفظ إعدادات التطبيق بنجاح.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ الإعدادات.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2
          size={22}
          className="spin"
        />
        جاري تحميل هوية التطبيق...
      </div>
    );
  }

  return (
    <div
      className="admin-app branding-page"
      dir="rtl"
    >
      <main className="admin-main">
<div className="admin-content">
          <div className="dashboard">
            <section className="dashboard-intro branding-hero">
              <div>
                <span className="dashboard-label">
                  Brand Identity
                </span>

                <h1>
                  هوية التطبيق والألوان
                </h1>

                <p>
                  التحكم في الاسم والألوان والهوية
                  البصرية المستخدمة داخل التطبيق.
                </p>
              </div>

              <div className="branding-hero-icon">
                <Palette size={29} />
              </div>
            </section>

            {error && (
              <div className="admin-error">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {message && (
              <div className="admin-success">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            <div className="branding-layout">
              <section className="details-card branding-form-card">
                <div className="branding-section-heading">
                  <div className="branding-section-icon">
                    <Palette size={18} />
                  </div>

                  <div>
                    <h2>إعدادات الهوية</h2>
                    <p>
                      عدّل القيم المطلوبة ثم احفظ التغييرات.
                    </p>
                  </div>
                </div>

                <div className="branding-fields">
                  {fields.map(
                    ([key, label, type]) => (
                      <label
                        className={
                          type === "color"
                            ? "branding-field branding-color-field"
                            : "branding-field"
                        }
                        key={key}
                      >
                        <span>{label}</span>

                        <div className="branding-input-wrap">
                          {type === "color" && (
                            <input
                              type="color"
                              value={
                                data[key] ||
                                "#000000"
                              }
                              onChange={(e) =>
                                setData({
                                  ...data,
                                  [key]:
                                    e.target.value,
                                })
                              }
                            />
                          )}

                          <input
                            type={
                              type === "color"
                                ? "text"
                                : "text"
                            }
                            value={
                              data[key] ?? ""
                            }
                            onChange={(e) =>
                              setData({
                                ...data,
                                [key]:
                                  e.target.value,
                              })
                            }
                          />
                        </div>
                      </label>
                    ),
                  )}
                </div>

                <button
                  type="button"
                  className="branding-save-button"
                  onClick={() => void save()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2
                      size={18}
                      className="spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {saving
                    ? "جاري الحفظ..."
                    : "حفظ إعدادات الهوية"}
                </button>
              </section>

              <aside className="branding-preview-card">
                <div className="branding-preview-head">
                  <div>
                    <span>Preview</span>
                    <h2>معاينة الهوية</h2>
                  </div>

                  <Smartphone size={21} />
                </div>

                <div
                  className="branding-preview"
                  style={{
                    background:
                      data.backgroundColor,
                  }}
                >
                  <div
                    className="branding-preview-logo"
                    style={{
                      background:
                        data.primaryColor,
                    }}
                  >
                    {data.logoUrl ? (
                      <img
                        src={data.logoUrl}
                        alt=""
                      />
                    ) : (
                      <Image size={25} />
                    )}
                  </div>

                  <strong
                    style={{
                      color: data.textColor,
                    }}
                  >
                    {data.appName ||
                      "Zajel Delivery"}
                  </strong>

                  <span
                    style={{
                      color:
                        data.secondaryTextColor,
                    }}
                  >
                    منصة التوصيل
                  </span>

                  <div
                    className="branding-preview-button"
                    style={{
                      background:
                        data.primaryColor,
                    }}
                  >
                    زر رئيسي
                  </div>

                  <div className="branding-preview-colors">
                    <span
                      style={{
                        background:
                          data.primaryColor,
                      }}
                    />
                    <span
                      style={{
                        background:
                          data.primaryDarkColor,
                      }}
                    />
                    <span
                      style={{
                        background:
                          data.secondaryColor,
                      }}
                    />
                    <span
                      style={{
                        background:
                          data.successColor,
                      }}
                    />
                    <span
                      style={{
                        background:
                          data.dangerColor,
                      }}
                    />
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
