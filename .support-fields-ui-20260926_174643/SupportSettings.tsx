import { useEffect, useState } from "react";
import {
  MessageCircle,
  Phone,
  Plus,
  Save,
  Settings2,
  Trash2,
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

function ArrayField({
  title,
  icon,
  values,
  setValues,
  placeholder,
}: {
  title: string;
  icon: React.ReactNode;
  values: string[];
  setValues: (values: string[]) => void;
  placeholder: string;
}) {
  function add() {
    setValues([...values, ""]);
  }

  function update(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    setValues(next);
  }

  function remove(index: number) {
    setValues(
      values.filter(
        (_, itemIndex) =>
          itemIndex !== index,
      ),
    );
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          {icon}
          <strong>{title}</strong>
        </div>

        <button
          type="button"
          onClick={add}
          style={{
            border: "1px solid #F5D08A",
            background: "#FFF4E3",
            color: "#E87516",
            borderRadius: 10,
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <Plus size={15} />
          إضافة
        </button>
      </div>

      {values.length === 0 ? (
        <div
          style={{
            color: "#94A3B8",
            fontSize: 12,
          }}
        >
          لا توجد بيانات مضافة.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 9,
          }}
        >
          {values.map((value, index) => (
            <div
              key={`${index}-${value}`}
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <input
                value={value}
                placeholder={placeholder}
                onChange={(e) =>
                  update(
                    index,
                    e.target.value,
                  )
                }
                style={inputStyle}
              />

              <button
                type="button"
                onClick={() =>
                  remove(index)
                }
                style={{
                  width: 44,
                  border:
                    "1px solid #FECACA",
                  background: "#FEF2F2",
                  color: "#DC2626",
                  borderRadius: 11,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function SupportSettings() {
  const [phoneNumbers, setPhoneNumbers] =
    useState<string[]>([]);
  const [whatsapp, setWhatsapp] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/support");

      setPhoneNumbers(
        Array.isArray(
          response.data?.data?.phoneNumbers,
        )
          ? response.data.data.phoneNumbers
          : [],
      );

      setWhatsapp(
        Array.isArray(
          response.data?.data?.whatsapp,
        )
          ? response.data.data.whatsapp
          : [],
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "تعذر تحميل بيانات الدعم.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response =
        await api.patch("/support", {
          phoneNumbers,
          whatsapp,
        });

      setPhoneNumbers(
        response.data?.data?.phoneNumbers ||
          phoneNumbers,
      );

      setWhatsapp(
        response.data?.data?.whatsapp ||
          whatsapp,
      );

      setMessage(
        "تم حفظ أرقام الهاتف والواتساب بنجاح.",
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "تعذر حفظ بيانات الدعم.",
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
      <div
        dir="rtl"
        style={{ padding: 28 }}
      >
        <div
          style={{
            background: "#fff",
            border:
              "1px solid #E2E8F0",
            borderRadius: 18,
            padding: 25,
          }}
        >
          جاري تحميل بيانات الدعم...
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: 28,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#E87516",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <Settings2 size={16} />
            SUPPORT CENTER
          </div>

          <h1
            style={{
              margin: "7px 0",
              fontSize: 28,
              color: "#0F172A",
            }}
          >
            بيانات الدعم
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748B",
            }}
          >
            إدارة أرقام الهاتف والواتساب
            التي تظهر للكابتن والمطعم أو المحل.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={{
            border: 0,
            borderRadius: 12,
            padding:
              "12px 20px",
            background: saving
              ? "#94A3B8"
              : "#E87516",
            color: "#fff",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: saving
              ? "not-allowed"
              : "pointer",
          }}
        >
          <Save size={17} />
          {saving
            ? "جاري الحفظ..."
            : "حفظ"}
        </button>
      </div>

      {(message || error) && (
        <div
          style={{
            marginBottom: 20,
            padding: 15,
            borderRadius: 14,
            background: error
              ? "#FEF2F2"
              : "#ECFDF5",
            border:
              "1px solid " +
              (error
                ? "#FECACA"
                : "#A7F3D0"),
            color: error
              ? "#B91C1C"
              : "#047857",
          }}
        >
          {error || message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 18,
        }}
      >
        <ArrayField
          title="أرقام الهاتف"
          icon={
            <Phone
              size={18}
              color="#E87516"
            />
          }
          values={phoneNumbers}
          setValues={setPhoneNumbers}
          placeholder="مثال: 07701234567"
        />

        <ArrayField
          title="WhatsApp"
          icon={
            <MessageCircle
              size={18}
              color="#16A34A"
            />
          }
          values={whatsapp}
          setValues={setWhatsapp}
          placeholder="رقم واتساب"
        />
      </div>
    </div>
  );
}
