import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "../lib/api";

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  border: "1px solid #CBD5E1",
  borderRadius: 12,
  background: "#fff",
  color: "#0F172A",
  fontSize: 14,
};

export default function SubAdmins() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/completion/sub-admins");
      setAdmins(response.data.admins || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر تحميل الأدمنات");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (
      !form.fullName.trim() ||
      !form.phone.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError("أكمل جميع بيانات الأدمن الفرعي");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setMessage("");

      await api.post("/completion/sub-admins", form);

      setForm({
        fullName: "",
        phone: "",
        email: "",
        password: "",
      });

      setMessage("تم إنشاء الأدمن الفرعي بنجاح");
      await load();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "تعذر إنشاء الأدمن الفرعي"
      );
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
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ color: "#E87516", fontWeight: 800, fontSize: 12 }}>
            ADMIN ACCESS
          </div>
          <h1 style={{ margin: "7px 0", fontSize: 28, color: "#0F172A" }}>
            الأدمنات الفرعية
          </h1>
          <p style={{ margin: 0, color: "#64748B" }}>
            إنشاء وإدارة حسابات الإدارة المساعدة.
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
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            cursor: "pointer",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(340px, .8fr) minmax(450px, 1.4fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <section
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 8px 30px rgba(15,23,42,.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
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
              <UserPlus size={22} />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>إنشاء أدمن فرعي</h2>
              <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 12 }}>
                حساب إداري جديد للوصول إلى لوحة الإدارة.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                الاسم الكامل
              </label>
              <input
                placeholder="مثال: أحمد محمد"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                الهاتف
              </label>
              <div style={{ position: "relative" }}>
                <Phone
                  size={17}
                  style={{
                    position: "absolute",
                    right: 13,
                    top: 13,
                    color: "#94A3B8",
                  }}
                />
                <input
                  placeholder="رقم الهاتف"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                البريد الإلكتروني
              </label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={17}
                  style={{
                    position: "absolute",
                    right: 13,
                    top: 13,
                    color: "#94A3B8",
                  }}
                />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 7 }}>
                كلمة المرور
              </label>

              <div style={{ position: "relative" }}>
                <KeyRound
                  size={17}
                  style={{
                    position: "absolute",
                    right: 13,
                    top: 13,
                    color: "#94A3B8",
                  }}
                />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="كلمة المرور"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  style={{ ...inputStyle, paddingRight: 40, paddingLeft: 42 }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    left: 9,
                    top: 8,
                    border: 0,
                    background: "transparent",
                    color: "#64748B",
                    cursor: "pointer",
                    padding: 5,
                  }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => void create()}
              disabled={creating}
              style={{
                marginTop: 4,
                border: 0,
                borderRadius: 12,
                padding: "13px 18px",
                background: creating ? "#94A3B8" : "#E87516",
                color: "#fff",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: creating ? "not-allowed" : "pointer",
              }}
            >
              <Plus size={18} />
              {creating ? "جاري الإنشاء..." : "إنشاء أدمن فرعي"}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Users size={21} color="#E87516" />
              <h2 style={{ margin: 0, fontSize: 18 }}>الأدمنات</h2>
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
              {admins.length} حساب
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 45, color: "#64748B" }}>
              جاري تحميل الحسابات...
            </div>
          ) : admins.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 45,
                border: "1px dashed #CBD5E1",
                borderRadius: 15,
                color: "#64748B",
              }}
            >
              لا توجد حسابات أدمن فرعية حالياً.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  style={{
                    padding: 17,
                    border: "1px solid #E2E8F0",
                    borderRadius: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 15,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: "#FFF0D9",
                        color: "#E87516",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 900,
                      }}
                    >
                      {(admin.fullName || "A").charAt(0)}
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, color: "#0F172A" }}>
                        {admin.fullName || "بدون اسم"}
                      </div>

                      <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>
                        {admin.email || admin.phone || "لا توجد بيانات اتصال"}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "7px 10px",
                      borderRadius: 20,
                      background: "#ECFDF5",
                      color: "#047857",
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {admin.status || "نشط"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 13,
              background: "#F8FAFC",
              display: "flex",
              gap: 9,
              color: "#475569",
              fontSize: 12,
            }}
          >
            <ShieldCheck size={17} color="#E87516" />
            الحسابات الفرعية تُنشأ من خلال صلاحيات الإدارة الحالية.
          </div>
        </section>
      </div>
    </div>
  );
}
