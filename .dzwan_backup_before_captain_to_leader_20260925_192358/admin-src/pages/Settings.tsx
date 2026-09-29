import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";

type LoginAttempts = 5 | 10;

type SettingsData = {
  environment: string;
  api: {
    status: string;
    version: string;
  };
  database: {
    status: string;
  };
  security: {
    authentication: string;
    loginRateLimit: boolean;
    loginMaxFailedAttempts: LoginAttempts;
    helmet: boolean;
    malformedJsonProtection: boolean;
    json404Protection: boolean;
  };
};

function unwrap(data: any): SettingsData {
  return data?.data ?? data;
}

function readAttempts(data: any): LoginAttempts {
  return data?.settings?.loginMaxFailedAttempts === 10 ? 10 : 5;
}

export default function Settings() {
  const [settings, setSettings] =
    useState<SettingsData | null>(null);

  const [loginMaxFailedAttempts, setLoginMaxFailedAttempts] =
    useState<LoginAttempts>(5);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError("");
      setSaved(false);

      const [settingsResponse, systemResponse] =
        await Promise.all([
          api.get("/settings"),
          api.get("/system-settings"),
        ]);

      const nextSettings = unwrap(settingsResponse.data);
      const attempts = readAttempts(systemResponse.data);

      nextSettings.security.loginRateLimit = true;
      nextSettings.security.loginMaxFailedAttempts = attempts;

      setSettings(nextSettings);
      setLoginMaxFailedAttempts(attempts);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }

  async function saveLoginAttempts() {
    try {
      setSaving(true);
      setError("");
      setSaved(false);

      await api.patch("/system-settings", {
        loginMaxFailedAttempts,
      });

      setSettings((current) =>
        current
          ? {
              ...current,
              security: {
                ...current.security,
                loginRateLimit: true,
                loginMaxFailedAttempts,
              },
            }
          : current,
      );

      setSaved(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={22} />
        جاري تحميل الإعدادات...
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="page-state">
        <div className="system-settings-error">
          <AlertCircle size={22} />
          <div>
            <strong>تعذر تحميل الإعدادات</strong>
            <p>{error || "حدث خطأ غير متوقع."}</p>
          </div>
        </div>

        <button type="button" onClick={load}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const systemOnline =
    settings.api.status === "online" &&
    settings.database.status === "online";

  return (
    <div className="page system-settings-page" dir="rtl">
      <HomeBackButton />

      <div className="system-settings-header">
        <div className="system-settings-heading">
          <div className="system-settings-heading-icon">
            <ShieldCheck size={28} />
          </div>

          <div>
            <Link
              to="/dashboard"
              className="back-link system-settings-back"
            >
              <ArrowRight size={18} />
              العودة إلى لوحة التحكم
            </Link>

            <h1>إعدادات النظام</h1>

            <p>
              إدارة إعدادات الحماية ومراجعة حالة خدمات المنصة.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={saving}
          className="secondary-button system-settings-refresh"
        >
          <RefreshCw size={17} />
          تحديث البيانات
        </button>
      </div>

      <section className="system-settings-overview">
        <div className="system-settings-overview-main">
          <div className="system-settings-overview-icon">
            <Server size={23} />
          </div>

          <div>
            <span>الحالة العامة</span>
            <strong>
              {systemOnline ? "النظام يعمل بشكل طبيعي" : "يوجد تنبيه"}
            </strong>
          </div>
        </div>

        <div
          className={`system-settings-status-pill ${
            systemOnline ? "online" : "offline"
          }`}
        >
          <span className="system-settings-status-dot" />
          {systemOnline ? "متصل" : "تحقق من الخدمات"}
        </div>
      </section>

      <section className="system-settings-stats">
        <div className="system-settings-stat-card">
          <div className="system-settings-stat-icon api">
            <Server size={20} />
          </div>

          <div className="system-settings-stat-content">
            <span>حالة API</span>
            <strong>
              {settings.api.status === "online"
                ? "متصل"
                : settings.api.status}
            </strong>
            <small>الإصدار {settings.api.version}</small>
          </div>
        </div>

        <div className="system-settings-stat-card">
          <div className="system-settings-stat-icon database">
            <Database size={20} />
          </div>

          <div className="system-settings-stat-content">
            <span>قاعدة البيانات</span>
            <strong>
              {settings.database.status === "online"
                ? "متصلة"
                : settings.database.status}
            </strong>
            <small>MongoDB</small>
          </div>
        </div>

        <div className="system-settings-stat-card">
          <div className="system-settings-stat-icon security">
            <LockKeyhole size={20} />
          </div>

          <div className="system-settings-stat-content">
            <span>المصادقة</span>
            <strong>{settings.security.authentication}</strong>
            <small>حماية الوصول إلى الحسابات</small>
          </div>
        </div>
      </section>

      <section className="system-settings-card">
        <div className="system-settings-card-header">
          <div>
            <div className="system-settings-section-icon">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h2>حماية الحسابات</h2>
              <p>
                إعدادات حماية تسجيل الدخول والطلبات غير الصالحة.
              </p>
            </div>
          </div>
        </div>

        <div className="system-settings-security-list">
          <div className="system-settings-security-row">
            <div className="system-settings-row-title">
              <div className="system-settings-row-icon">
                <LockKeyhole size={18} />
              </div>

              <div>
                <strong>تحديد محاولات تسجيل الدخول</strong>
                <small>
                  حماية الحساب بعد تكرار محاولات الدخول الخاطئة.
                </small>
              </div>
            </div>

            <span className="system-settings-enabled-badge">
              <CheckCircle2 size={16} />
              مفعّل
            </span>
          </div>

          <div className="system-settings-login-control">
            <div className="system-settings-control-text">
              <div className="system-settings-control-icon">
                <Gauge size={20} />
              </div>

              <div>
                <strong>أقصى عدد للمحاولات الخاطئة</strong>
                <span>
                  اختر الحد المسموح قبل إيقاف المحاولات مؤقتًا.
                </span>
              </div>
            </div>

            <div className="system-settings-choice-wrap">
              <div className="system-settings-choice-group">
                {[5, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={saving}
                    className={`system-settings-choice ${
                      loginMaxFailedAttempts === value
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setLoginMaxFailedAttempts(
                        value as LoginAttempts,
                      );
                      setSaved(false);
                    }}
                  >
                    <strong>{value}</strong>
                    <span>محاولات</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={saveLoginAttempts}
                disabled={saving}
                className="system-settings-save-button"
              >
                {saving ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <Save size={17} />
                )}

                {saving ? "جاري الحفظ..." : "حفظ الإعداد"}
              </button>
            </div>
          </div>

          <div className="system-settings-security-row compact">
            <div className="system-settings-row-title">
              <div className="system-settings-row-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>Helmet</strong>
                <small>حماية HTTP الأساسية للتطبيق.</small>
              </div>
            </div>

            <span className="system-settings-enabled-badge">
              <CheckCircle2 size={16} />
              {settings.security.helmet ? "مفعّل" : "غير مفعّل"}
            </span>
          </div>

          <div className="system-settings-security-row compact">
            <div className="system-settings-row-title">
              <div className="system-settings-row-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>حماية JSON غير الصالح</strong>
                <small>منع الطلبات ذات البيانات غير الصحيحة.</small>
              </div>
            </div>

            <span
              className={
                settings.security.malformedJsonProtection
                  ? "system-settings-enabled-badge"
                  : "system-settings-disabled-badge"
              }
            >
              {settings.security.malformedJsonProtection
                ? "مفعّلة"
                : "غير مفعّلة"}
            </span>
          </div>

          <div className="system-settings-security-row compact">
            <div className="system-settings-row-title">
              <div className="system-settings-row-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>المسارات غير الموجودة</strong>
                <small>إرجاع استجابة JSON للمسارات غير الصحيحة.</small>
              </div>
            </div>

            <span
              className={
                settings.security.json404Protection
                  ? "system-settings-enabled-badge"
                  : "system-settings-disabled-badge"
              }
            >
              {settings.security.json404Protection
                ? "مفعّلة"
                : "غير مفعّلة"}
            </span>
          </div>
        </div>

        {saved ? (
          <div className="system-settings-success">
            <CheckCircle2 size={18} />
            تم حفظ إعداد محاولات تسجيل الدخول بنجاح.
          </div>
        ) : null}
      </section>

      <section className="system-settings-info">
        <div className="system-settings-info-icon">
          <CheckCircle2 size={19} />
        </div>

        <div>
          <strong>ملاحظة</strong>
          <p>
            هذه الصفحة تعرض إعدادات النظام المتاحة للأدمن فقط،
            ولا تعرض كلمات المرور أو مفاتيح البيئة أو أي أسرار.
          </p>
        </div>
      </section>
    </div>
  );
}
