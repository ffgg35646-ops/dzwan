import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function OperationsSettings() {
  const [settings, setSettings] = useState<any>({});

  async function load() {
    const response = await api.get(
      "/completion/settings",
    );
    setSettings(response.data.settings || {});
  }

  async function save() {
    const response = await api.patch(
      "/completion/settings",
      settings,
    );
    setSettings(response.data.settings);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-page">
      <h1>الإعدادات المركزية للتشغيل</h1>

      <div className="admin-card">

        <label>
          طريقة التسعير
          <select
            value={
              settings.pricingMode ||
              "area_to_area"
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                pricingMode: e.target.value,
              })
            }
          >
            <option value="area_to_area">
              منطقة ← منطقة
            </option>

            <option value="geofencing">
              المناطق الجغرافية
            </option>
          </select>
        </label>

        <label>
          مدة الطلب العالق بالدقائق
          <input
            type="number"
            value={
              settings.stuckOrderMinutes ?? 10
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                stuckOrderMinutes:
                  Number(e.target.value),
              })
            }
          />
        </label>

        <label>
          الوثائق الكاملة مطلوبة
          <input
            type="checkbox"
            checked={
              settings
                .requireCompleteCaptainDocuments ??
              true
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                requireCompleteCaptainDocuments:
                  e.target.checked,
              })
            }
          />
        </label>

        <label>
          OTP إجباري
          <input
            type="checkbox"
            checked={
              settings.requireDeliveryOtp ??
              true
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                requireDeliveryOtp:
                  e.target.checked,
              })
            }
          />
        </label>

        <label>
          صورة التسليم إجبارية
          <input
            type="checkbox"
            checked={
              settings.requireDeliveryPhoto ??
              false
            }
            onChange={(e) =>
              setSettings({
                ...settings,
                requireDeliveryPhoto:
                  e.target.checked,
              })
            }
          />
        </label>

        <button onClick={save}>
          💾 حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}
