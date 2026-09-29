
import { useEffect, useState } from "react";

export default function AppBranding() {
  const [data, setData] = useState<any>({
    appName: "Zajel Delivery",
    primaryColor: "#F59E0B",
    primaryDarkColor: "#E88A00",
    secondaryColor: "#FBBF24",
    backgroundColor: "#FFFFFF",
    textColor: "#1F2937",
    secondaryTextColor: "#6B7280",
    successColor: "#F59E0B",
    dangerColor: "#EF4444",
    borderColor: "#E5E7EB",
    logoUrl: "",
  });

  async function load() {
    const res = await fetch(
      "/api/app-branding",
    );

    const json = await res.json();

    if (json.data) {
      setData(json.data);
    }
  }

  async function save() {
    await fetch(
      "/api/app-branding",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    alert("تم حفظ إعدادات التطبيق.");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div dir="rtl">
      <h1>هوية التطبيق والألوان</h1>

      {[
        ["appName", "اسم التطبيق"],
        ["primaryColor", "اللون الرئيسي"],
        ["primaryDarkColor", "اللون الرئيسي الداكن"],
        ["secondaryColor", "اللون الثانوي"],
        ["backgroundColor", "الخلفية"],
        ["textColor", "النص"],
        ["secondaryTextColor", "النص الثانوي"],
        ["successColor", "النجاح"],
        ["dangerColor", "الخطأ"],
        ["borderColor", "الحدود"],
        ["logoUrl", "رابط اللوجو"],
      ].map(([key, label]) => (
        <div key={key}>
          <label>{label}</label>

          <input
            value={data[key] ?? ""}
            onChange={(e) =>
              setData({
                ...data,
                [key]: e.target.value,
              })
            }
          />
        </div>
      ))}

      <button onClick={save}>
        حفظ
      </button>
    </div>
  );
}
