
import { useEffect, useState } from "react";

type Theme = {
  id: string;
  name: string;
  description?: string;

  primaryColor: string;
  primaryDarkColor: string;
  secondaryColor: string;

  backgroundColor: string;
  cardColor: string;
  textColor: string;
};

const API =
  (import.meta.env.VITE_API_URL ||
    "http://localhost:4000/api").replace(
      /\/$/,
      "",
    );

export default function AppThemeSettings() {
  const [
    themes,
    setThemes,
  ] = useState<Theme[]>([]);

  const [
    active,
    setActive,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  async function load() {
    setLoading(true);

    try {
      const [
        available,
        current,
      ] = await Promise.all([
        fetch(
          `${API}/app-theme`,
          {
            credentials: "include",
          },
        ).then((r) => r.json()),

        fetch(
          `${API}/app-theme/active`,
          {
            credentials: "include",
          },
        ).then((r) => r.json()),
      ]);

      setThemes(
        available?.data ?? [],
      );

      setActive(
        current?.data?.id ?? "",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function choose(id: string) {
    await fetch(
      `${API}/app-theme/active`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          activeTheme: id,
        }),
      },
    );

    setActive(id);
  }

  if (loading) {
    return (
      <div dir="rtl">
        جاري تحميل الأنماط...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: 24,
      }}
    >
      <h1>
        مظهر تطبيق زاجل
      </h1>

      <p
        style={{
          opacity: 0.7,
        }}
      >
        تغيير المظهر يغيّر الشكل
        المرئي فقط ولا يغيّر
        الطلبات أو البيانات أو
        منطق العمل.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill,minmax(250px,1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        {themes.map(
          (theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() =>
                choose(theme.id)
              }
              style={{
                textAlign: "right",
                padding: 18,
                borderRadius: 16,
                cursor: "pointer",

                background:
                  theme.cardColor,

                color:
                  theme.textColor,

                border:
                  active === theme.id
                    ? `3px solid ${theme.primaryColor}`
                    : `1px solid ${theme.secondaryColor}`,
              }}
            >
              <strong>
                {theme.name}
              </strong>

              <div
                style={{
                  marginTop: 8,
                  opacity: 0.72,
                }}
              >
                {theme.description}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  theme.primaryColor,
                  theme.primaryDarkColor,
                  theme.secondaryColor,
                ].map((color) => (
                  <span
                    key={color}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 50,
                      background: color,
                    }}
                  />
                ))}
              </div>
            </button>
          ),
        )}
      </div>
    </div>
  );
}
