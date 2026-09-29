
import { useEffect, useState } from "react";

export default function SupportSettings() {
  const [data, setData] = useState<any>({
    phoneNumbers: [],
    whatsapp: [],
    telegram: [],
    facebook: "",
    instagram: "",
    youtube: "",
    tiktok: "",
    message: "",
    workingHours: "",
    enabled: true,
  });

  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/support");
    const json = await response.json();
    setData(json.data ?? data);
  }

  async function save() {
    setSaving(true);

    try {
      await fetch("/api/support", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      alert("تم حفظ بيانات الدعم.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div dir="rtl">
      <h1>بيانات الدعم والتواصل</h1>

      {[
        ["facebook", "Facebook"],
        ["instagram", "Instagram"],
        ["youtube", "YouTube"],
        ["tiktok", "TikTok"],
        ["workingHours", "ساعات العمل"],
        ["message", "رسالة الدعم"],
      ].map(([key, label]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <label>{label}</label>
          <input
            value={data[key] ?? ""}
            onChange={(e) =>
              setData({
                ...data,
                [key]: e.target.value,
              })
            }
            style={{
              display: "block",
              width: "100%",
              padding: 10,
            }}
          />
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
      >
        {saving ? "جاري الحفظ..." : "حفظ"}
      </button>
    </div>
  );
}
