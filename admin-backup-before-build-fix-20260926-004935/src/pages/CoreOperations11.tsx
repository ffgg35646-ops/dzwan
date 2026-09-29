import { useEffect, useState } from "react";
import {
  Activity,
  MapPinned,
  Save,
  Settings2,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { api } from "../lib/api";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 8px 30px rgba(15, 23, 42, 0.05)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0F172A",
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: 16,
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        cursor: "pointer",
        background: checked ? "#FFF4E3" : "#fff",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 14 }}>
          {label}
        </div>
        <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
          {description}
        </div>
      </div>

      <span
        style={{
          width: 48,
          height: 28,
          borderRadius: 20,
          padding: 3,
          background: checked ? "#E87516" : "#CBD5E1",
          transition: "0.2s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "block",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            transform: checked ? "translateX(-20px)" : "translateX(0)",
            transition: "0.2s",
            boxShadow: "0 2px 5px rgba(0,0,0,.15)",
          }}
        />
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ display: "none" }}
      />
    </label>
  );
}

export default function CoreOperations11() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [coreRes, dispatchRes] = await Promise.all([
        api.get("/core11/settings"),
        api.get("/dispatch/settings"),
      ]);

      const coreSettings = coreRes.data?.data || {};
      const dispatchSettings = dispatchRes.data?.data || {};

      setSettings({
        ...coreSettings,
        maxActiveOrdersPerCaptain:
          dispatchSettings.maxActiveOrdersPerCaptain ?? 3,
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "تعذر تحميل إعدادات التشغيل"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const { maxActiveOrdersPerCaptain, ...coreSettings } =
        settings;

      const [coreRes] = await Promise.all([
        api.patch("/core11/settings", coreSettings),
        api.patch("/dispatch/settings", {
          maxActiveOrdersPerCaptain: Math.max(
            1,
            Math.min(
              100,
              Number(maxActiveOrdersPerCaptain ?? 3),
            ),
          ),
        }),
      ]);

      setSettings({
        ...(coreRes.data?.data || coreSettings),
        maxActiveOrdersPerCaptain:
          Math.max(
            1,
            Math.min(
              100,
              Number(maxActiveOrdersPerCaptain ?? 3),
            ),
          ),
      });

      setMessage("تم حفظ إعدادات التشغيل بنجاح");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "تعذر حفظ إعدادات التشغيل"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl" style={{ padding: 32 }}>
        <div style={cardStyle}>
          <Activity size={22} color="#E87516" />
          <div style={{ marginTop: 12, fontWeight: 700 }}>
            جاري تحميل إعدادات التشغيل...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: 28, maxWidth: 1250, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#E87516",
              fontSize: 12,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            <Settings2 size={16} />
            CORE OPERATIONS
          </div>

          <h1 style={{ margin: 0, fontSize: 28, color: "#0F172A" }}>
            إعدادات التشغيل 1 - 11
          </h1>

          <p style={{ margin: "8px 0 0", color: "#64748B" }}>
            التحكم المركزي في التسعير والتوزيع والشفتات واعتماد المحلات.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={save}
          style={{
            border: 0,
            borderRadius: 12,
            padding: "12px 20px",
            background: saving ? "#94A3B8" : "#E87516",
            color: "#fff",
            fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Save size={17} />
          {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      {(message || error) && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
            padding: 16,
            borderColor: error ? "#FECACA" : "#A7F3D0",
            background: error ? "#FEF2F2" : "#ECFDF5",
            color: error ? "#B91C1C" : "#047857",
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
        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#FFF0D9",
                color: "#E87516",
                display: "grid",
                placeItems: "center",
              }}
            >
              <MapPinned size={21} />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>طريقة التسعير</h2>
              <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 12 }}>
                تحديد محرك حساب تكلفة التوصيل
              </p>
            </div>
          </div>

          <select
            value={settings.pricingMode || "area_to_area"}
            onChange={(e) =>
              setSettings({
                ...settings,
                pricingMode: e.target.value,
              })
            }
            style={{ ...inputStyle, marginTop: 20 }}
          >
            <option value="area_to_area">منطقة إلى منطقة</option>
            <option value="geofencing">المناطق الجغرافية</option>
          </select>
        </section>

        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#DBEAFE",
                color: "#2563EB",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Truck size={21} />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 17 }}>التوزيع Dispatch</h2>
              <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 12 }}>
                التحكم في مهلة ومحاولات التوزيع
              </p>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "grid", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                مهلة استجابة الكابتن بالثواني
              </label>
              <input
                type="number"
                min="5"
                value={settings.dispatchTimeoutSeconds ?? 60}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dispatchTimeoutSeconds: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                أقصى عدد محاولات التوزيع
              </label>
              <input
                type="number"
                min="1"
                value={settings.maxDispatchAttempts ?? 5}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxDispatchAttempts: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 7,
                }}
              >
                الحد الأقصى للطلبات النشطة للكابتن
              </label>

              <input
                type="number"
                min="1"
                max="100"
                value={settings.maxActiveOrdersPerCaptain ?? 3}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxActiveOrdersPerCaptain: Math.max(
                      1,
                      Math.min(100, Number(e.target.value) || 1),
                    ),
                  })
                }
                style={inputStyle}
              />

              <small
                style={{
                  display: "block",
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 12,
                }}
              >
                مثال: 3 يعني لا يستطيع الكابتن استلام الطلب الرابع.
              </small>
            </div>
          </div>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "#FEF3C7",
              color: "#D97706",
              display: "grid",
              placeItems: "center",
            }}
          >
            <ShieldCheck size={21} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>التحقق التشغيلي</h2>
            <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 12 }}>
              قواعد الحماية والتحقق قبل تشغيل الطلبات
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Toggle
            checked={settings.strictShiftEnforcement ?? true}
            onChange={(value) =>
              setSettings({ ...settings, strictShiftEnforcement: value })
            }
            label="منع العمل خارج الشفت"
            description="يمنع الكابتن من العمل عندما لا يكون داخل شفته المسموح بها."
          />

          <Toggle
            checked={settings.requireEstablishmentApproval ?? true}
            onChange={(value) =>
              setSettings({
                ...settings,
                requireEstablishmentApproval: value,
              })
            }
            label="اشتراط اعتماد المحل"
            description="لا يسمح بالتشغيل للمحل قبل اعتماده من الإدارة."
          />

          <Toggle
            checked={settings.requireEstablishmentLocation ?? true}
            onChange={(value) =>
              setSettings({
                ...settings,
                requireEstablishmentLocation: value,
              })
            }
            label="اشتراط موقع المحل"
            description="يشترط وجود موقع صالح للمحل قبل التشغيل."
          />
        </div>
      </section>

      <section
        style={{
          ...cardStyle,
          marginTop: 20,
          background: "linear-gradient(135deg, #E87516, #C95F0C)",
          color: "#fff",
          border: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Zap size={22} />
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>نطاق التحكم</h2>
            <p style={{ margin: "6px 0 0", opacity: 0.85, fontSize: 13 }}>
              المحافظات · المناطق · التسعير · المحلات · الطلبات · التوزيع · الشفتات
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
