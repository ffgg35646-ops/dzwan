import { useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Gift,
  Plus,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import { api } from "../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 14,
  color: "#0F172A",
  background: "#fff",
};

export default function Rewards() {
  const [items, setItems] = useState<any[]>([]);
  const [captains, setCaptains] = useState<any[]>([]);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedCaptainIds, setSelectedCaptainIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState("10");
  const [rewardValue, setRewardValue] = useState("10000");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [res, captainsRes] = await Promise.all([
        api.get("/rewards"),
        api.get("/captains"),
      ]);

      setItems(res.data?.data ?? []);
      setCaptains(captainsRes.data?.captains ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل المكافآت");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!name.trim()) {
      setError("اكتب اسم المكافأة أولاً");
      return;
    }

    if (Number(threshold) < 1 || Number(rewardValue) < 0) {
      setError("تحقق من قيمة الحد وقيمة المكافأة");
      return;
    }

    if (
      recipientMode === "selected" &&
      selectedCaptainIds.length === 0
    ) {
      setError("اختر كابتنًا واحدًا على الأقل");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      await api.post("/rewards", {
        name: name.trim(),
        target: "captain",
        conditionType: "orders_count",
        threshold: Number(threshold),
        rewardValue: Number(rewardValue),
        recipientMode,
        captainIds:
          recipientMode === "selected"
            ? selectedCaptainIds
            : [],
        isActive: true,
      });

      setName("");
      setThreshold("10");
      setRewardValue("10000");
      setRecipientMode("all");
      setSelectedCaptainIds([]);
      setMessage("تمت إضافة المكافأة بنجاح");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر إنشاء المكافأة");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div dir="rtl" style={{ padding: 28, maxWidth: 1250, margin: "0 auto" }}>
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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: "#E87516",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            <Trophy size={16} />
            CAPTAIN REWARDS
          </div>

          <h1 style={{ margin: "7px 0", color: "#0F172A", fontSize: 28 }}>
            المكافآت
          </h1>

          <p style={{ margin: 0, color: "#64748B" }}>
            إنشاء برامج مكافآت للكباتن بناءً على عدد الطلبات.
          </p>
        </div>

        <button
          onClick={() => void load()}
          disabled={loading}
          style={{
            border: "1px solid #CBD5E1",
            background: "#fff",
            color: "#0F172A",
            borderRadius: 12,
            padding: "11px 16px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: 20,
            padding: 15,
            borderRadius: 14,
            background: error ? "#FEF2F2" : "#ECFDF5",
            border: `1px solid ${error ? "#FECACA" : "#A7F3D0"}`,
            color: error ? "#B91C1C" : "#047857",
          }}
        >
          {error || message}
        </div>
      )}

      <section
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 30px rgba(15,23,42,.05)",
          marginBottom: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              background: "#FFF0D9",
              color: "#E87516",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Gift size={22} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>إنشاء مكافأة جديدة</h2>
            <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 12 }}>
              المكافأة تستهدف الكابتن وتُحتسب حسب عدد الطلبات.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 18,
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 700 }}>
              المستفيدون
            </label>

            <select
              value={recipientMode}
              onChange={(e) => {
                const value = e.target.value as "all" | "selected";
                setRecipientMode(value);
                if (value === "all") {
                  setSelectedCaptainIds([]);
                }
              }}
              style={inputStyle}
            >
              <option value="all">جميع الكباتن</option>
              <option value="selected">كباتن محددون</option>
            </select>
          </div>

          {recipientMode === "selected" ? (
            <div>
              <label style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 700 }}>
                اختيار الكباتن
              </label>

              <select
                multiple
                value={selectedCaptainIds}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions)
                    .map((option) => option.value);

                  setSelectedCaptainIds(values);
                }}
                style={{
                  ...inputStyle,
                  minHeight: 110,
                }}
              >
                {captains.map((captain) => (
                  <option
                    key={captain._id}
                    value={captain._id}
                  >
                    {captain.fullName || captain.phone || captain._id}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 700 }}>
              اسم المكافأة
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مكافأة 50 طلب"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 700 }}>
              عدد الطلبات
            </label>
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontSize: 13, fontWeight: 700 }}>
              قيمة المكافأة
            </label>
            <input
              type="number"
              min="0"
              value={rewardValue}
              onChange={(e) => setRewardValue(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => void create()}
            disabled={creating}
            style={{
              border: 0,
              borderRadius: 12,
              padding: "12px 18px",
              background: creating ? "#94A3B8" : "#E87516",
              color: "#fff",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 7,
              cursor: creating ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={17} />
            {creating ? "جاري الإضافة..." : "إضافة"}
          </button>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 8px 30px rgba(15,23,42,.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award size={21} color="#E87516" />
            <h2 style={{ margin: 0, fontSize: 18 }}>برامج المكافآت</h2>
          </div>

          <span
            style={{
              padding: "6px 10px",
              borderRadius: 20,
              background: "#F1F5F9",
              color: "#475569",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {items.length} مكافأة
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 35, textAlign: "center", color: "#64748B" }}>
            جاري تحميل المكافآت...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: 45,
              textAlign: "center",
              border: "1px dashed #CBD5E1",
              borderRadius: 15,
              color: "#64748B",
            }}
          >
            <Target size={30} style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 800 }}>لا توجد مكافآت حالياً</div>
            <div style={{ fontSize: 12, marginTop: 5 }}>
              أنشئ أول برنامج مكافآت من النموذج أعلاه.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => (
              <div
                key={item._id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  gap: 16,
                  alignItems: "center",
                  padding: 16,
                  border: "1px solid #E2E8F0",
                  borderRadius: 15,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: "#0F172A" }}>
                    {item.name || "مكافأة بدون اسم"}
                  </div>
                  <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                    للكابتن · عدد الطلبات
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>الحد</div>
                  <strong>{item.threshold ?? 0} طلب</strong>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>المكافأة</div>
                  <strong>{Number(item.rewardValue ?? 0).toLocaleString("ar-IQ")}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 10px",
                      borderRadius: 20,
                      background: item.isActive ? "#ECFDF5" : "#F1F5F9",
                      color: item.isActive ? "#047857" : "#64748B",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    {item.isActive ? "نشطة" : "متوقفة"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
