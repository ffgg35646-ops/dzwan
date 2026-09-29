import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Image,
  KeyRound,
  Save,
  Settings2,
} from "lucide-react";
import { api } from "../lib/api";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 30px rgba(15, 23, 42, .05)",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  background: "#fff",
  color: "#0F172A",
  fontSize: 14,
};

function Toggle({
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        border: "1px solid #E2E8F0",
        borderRadius: 15,
        cursor: "pointer",
        background: checked ? "#FFF4E3" : "#fff",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          background: checked ? "#FFF0D9" : "#F1F5F9",
          color: checked ? "#E87516" : "#64748B",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 14 }}>
          {title}
        </div>
        <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
          {description}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "#E87516" }}
      />
    </label>
  );
}

export default function OperationsSettings() {
  const [settings, setSettings] = useState<any>({});
  const [dispatchSettings, setDispatchSettings] = useState<any>({});
  const [maintenanceSettings, setMaintenanceSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [
        completionResponse,
        dispatchResponse,
        maintenanceResponse,
      ] = await Promise.all([
        api.get("/completion/settings"),
        api.get("/dispatch/settings"),
        api.get("/ops/maintenance"),
      ]);

      setSettings(completionResponse.data.settings || {});
      setDispatchSettings(dispatchResponse.data.data || {});
      setMaintenanceSettings(
        maintenanceResponse.data.settings || {},
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "تعذر تحميل الإعدادات"
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const [
        completionResponse,
        dispatchResponse,
        maintenanceResponse,
      ] = await Promise.all([
        api.patch(
          "/completion/settings",
          settings
        ),
        api.patch(
          "/dispatch/settings",
          {
            maxActiveOrdersPerCaptain:
              Number(
                dispatchSettings.maxActiveOrdersPerCaptain ?? 3
              ),
          }
        ),
        api.patch(
          "/ops/maintenance",
          {
            enabled: Boolean(
              maintenanceSettings.enabled
            ),
            title:
              maintenanceSettings.title ||
              "الصيانة",
            message:
              maintenanceSettings.message ||
              "الخدمة متوقفة مؤقتًا للصيانة.",
          }
        ),
      ]);

      setSettings(completionResponse.data.settings || settings);
      setDispatchSettings(
        dispatchResponse.data.data || dispatchSettings
      );
      setMaintenanceSettings(
        maintenanceResponse.data.settings ||
          maintenanceSettings
      );

      setMessage(
        "تم حفظ الإعدادات المركزية والتوزيع ووضع الصيانة بنجاح"
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "تعذر حفظ الإعدادات"
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
      <div dir="rtl" style={{ padding: 32 }}>
        <div style={card}>
          <Settings2 size={22} color="#E87516" />
          <div style={{ marginTop: 10, fontWeight: 700 }}>
            جاري تحميل الإعدادات...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: 28, maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ color: "#E87516", fontSize: 12, fontWeight: 800 }}>
            OPERATIONS CONTROL
          </div>
          <h1 style={{ margin: "6px 0", color: "#0F172A", fontSize: 28 }}>
            الإعدادات المركزية للتشغيل
          </h1>
          <p style={{ margin: 0, color: "#64748B" }}>
            قواعد إكمال الطلب والتحقق من الكابتن وإثبات التسليم.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{
            border: 0,
            borderRadius: 12,
            padding: "12px 20px",
            background: saving ? "#94A3B8" : "#E87516",
            color: "#fff",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          <Save size={17} />
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      {(message || error) && (
        <div
          style={{
            ...card,
            marginBottom: 20,
            padding: 16,
            color: error ? "#B91C1C" : "#047857",
            background: error ? "#FEF2F2" : "#ECFDF5",
            borderColor: error ? "#FECACA" : "#A7F3D0",
          }}
        >
          {error || message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}
      >
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: 17 }}>محرك التسعير</h2>
          <p style={{ color: "#64748B", fontSize: 12 }}>
            تحديد طريقة احتساب تكلفة التوصيل.
          </p>

          <select
            value={settings.pricingMode || "area_to_area"}
            onChange={(e) =>
              setSettings({
                ...settings,
                pricingMode: e.target.value,
              })
            }
            style={{ ...input, marginTop: 12 }}
          >
            <option value="area_to_area">منطقة ← منطقة</option>
            <option value="geofencing">المناطق الجغرافية</option>
          </select>
        </section>

        <section style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock3 size={20} color="#2563EB" />
            <h2 style={{ margin: 0, fontSize: 17 }}>الطلبات العالقة</h2>
          </div>

          <p style={{ color: "#64748B", fontSize: 12 }}>
            المدة التي بعدها يعتبر الطلب عالقاً تشغيلياً.
          </p>

          <input
            type="number"
            min="1"
            value={settings.stuckOrderMinutes ?? 10}
            onChange={(e) =>
              setSettings({
                ...settings,
                stuckOrderMinutes: Number(e.target.value),
              })
            }
            style={{ ...input, marginTop: 12 }}
          />
        </section>
      </div>

      <section style={{ ...card, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Settings2 size={21} color="#2563EB" />
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>
              سعة الكابتن
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748B",
                fontSize: 12,
              }}
            >
              الحد الأقصى العام للطلبات المفتوحة لكل كابتن.
              ينطبق هذا الرقم على جميع الكباتن.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <label
            style={{
              display: "block",
              fontWeight: 800,
              color: "#0F172A",
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            الحد الأقصى للطلبات المفتوحة للكابتن
          </label>

          <input
            type="number"
            min="1"
            max="100"
            value={dispatchSettings.maxActiveOrdersPerCaptain ?? 3}
            onChange={(e) =>
              setDispatchSettings({
                ...dispatchSettings,
                maxActiveOrdersPerCaptain: Number(e.target.value),
              })
            }
            style={input}
          />

          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              background: "#EFF6FF",
              color: "#1D4ED8",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            مثال: عند وضع الرقم 3، لا يتم توزيع طلب رابع على
            الكابتن طالما لديه 3 طلبات مفتوحة.
          </div>
        </div>
      </section>

      <section style={{ ...card, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <CheckCircle2 size={21} color="#E87516" />
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>متطلبات إكمال الطلب</h2>
            <p style={{ margin: "5px 0 0", color: "#64748B", fontSize: 12 }}>
              قواعد إثبات التسليم قبل إغلاق الطلب.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Toggle
            checked={settings.requireCompleteCaptainDocuments ?? true}
            onChange={(v) =>
              setSettings({
                ...settings,
                requireCompleteCaptainDocuments: v,
              })
            }
            title="الوثائق الكاملة مطلوبة"
            description="لا يسمح للكابتن بإكمال التشغيل قبل استيفاء الوثائق."
            icon={<FileCheck2 size={19} />}
          />

          <Toggle
            checked={settings.requireDeliveryOtp ?? true}
            onChange={(v) =>
              setSettings({
                ...settings,
                requireDeliveryOtp: v,
              })
            }
            title="OTP إجباري"
            description="يتطلب إثبات التسليم باستخدام رمز OTP."
            icon={<KeyRound size={19} />}
          />

          <Toggle
            checked={settings.requireDeliveryPhoto ?? false}
            onChange={(v) =>
              setSettings({
                ...settings,
                requireDeliveryPhoto: v,
              })
            }
            title="صورة التسليم إجبارية"
            description="يتطلب رفع صورة كجزء من إثبات التسليم."
            icon={<Image size={19} />}
          />
        </div>
      </section>

      <div
        style={{
          marginTop: 20,
          padding: 18,
          borderRadius: 16,
          background: "#FFFBEB",
          border: "1px solid #FDE68A",
          display: "flex",
          gap: 12,
          color: "#92400E",
        }}
      >
        <AlertTriangle size={20} />
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          تغيير هذه القواعد يؤثر مباشرة على آلية إكمال الطلبات وإثبات التسليم.
        </div>
      </div>
    </div>
  );
}
