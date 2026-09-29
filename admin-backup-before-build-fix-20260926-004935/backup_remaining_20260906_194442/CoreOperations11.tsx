import {
  useEffect,
  useState,
} from "react";

import { api } from "../lib/api";

export default function CoreOperations11() {
  const [settings, setSettings] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function load() {
    try {
      setLoading(true);

      const res =
        await api.get(
          "/core11/settings"
        );

      setSettings(
        res.data?.data || {}
      );
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
        "تعذر تحميل الإعدادات"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const res =
        await api.patch(
          "/core11/settings",
          settings
        );

      setSettings(
        res.data?.data ||
        settings
      );

      setMessage(
        "تم حفظ إعدادات التشغيل بنجاح"
      );
    } catch (error: any) {
      setMessage(
        error?.response?.data?.message ||
        "تعذر حفظ الإعدادات"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        جاري تحميل إعدادات التشغيل...
      </div>
    );
  }

  return (
    <div
      className="page"
      dir="rtl"
    >
      <div className="page-header">
        <div>
          <h1>
            إعدادات التشغيل 1 - 11
          </h1>

          <p>
            التحكم المركزي بالمحافظات
            والمناطق والتسعير والطلبات
            والتوزيع والشفتات.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={save}
        >
          {saving
            ? "جاري الحفظ..."
            : "حفظ الإعدادات"}
        </button>
      </div>

      {message && (
        <div className="alert">
          {message}
        </div>
      )}

      <section className="card">
        <h2>طريقة التسعير</h2>

        <select
          value={
            settings?.pricingMode ||
            "area_to_area"
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              pricingMode:
                e.target.value,
            })
          }
        >
          <option value="area_to_area">
            من منطقة إلى منطقة
          </option>

          <option value="geofencing">
            المناطق الجغرافية
          </option>
        </select>
      </section>

      <section className="card">
        <h2>الـ Dispatch</h2>

        <label>
          مهلة استجابة الكابتن بالثواني
        </label>

        <input
          type="number"
          min="5"
          value={
            settings?.dispatchTimeoutSeconds ??
            60
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              dispatchTimeoutSeconds:
                Number(e.target.value),
            })
          }
        />

        <label>
          أقصى عدد محاولات التوزيع
        </label>

        <input
          type="number"
          min="1"
          value={
            settings?.maxDispatchAttempts ??
            5
          }
          onChange={(e) =>
            setSettings({
              ...settings,
              maxDispatchAttempts:
                Number(e.target.value),
            })
          }
        />
      </section>

      <section className="card">
        <h2>التحقق التشغيلي</h2>

        <label>
          <input
            type="checkbox"
            checked={
              settings?.strictShiftEnforcement ??
              true
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                strictShiftEnforcement:
                  e.target.checked,
              })
            }
          />
          منع العمل خارج الشفت
        </label>

        <label>
          <input
            type="checkbox"
            checked={
              settings?.requireEstablishmentApproval ??
              true
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                requireEstablishmentApproval:
                  e.target.checked,
              })
            }
          />
          اشتراط اعتماد المحل
        </label>

        <label>
          <input
            type="checkbox"
            checked={
              settings?.requireEstablishmentLocation ??
              true
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                requireEstablishmentLocation:
                  e.target.checked,
              })
            }
          />
          اشتراط موقع المحل
        </label>
      </section>

      <section className="card">
        <h2>الأقسام</h2>

        <div>
          لوحة الإدارة · المحافظات · المناطق
          · التسعير · المحلات · الطلبات
          · التوزيع · الشفتات · منع العمل
        </div>
      </section>
    </div>
  );
}
