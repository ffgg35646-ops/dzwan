import { useEffect, useState } from "react";
import { Tag, Loader2 } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type Offer = {
  _id: string;
  code?: string;
  deliveryPrice?: number | null;
  isActive?: boolean;
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/offers/admin");

        if (!mounted) return;

        const data = response.data?.data;
        setOffers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;

        console.error("Offers load error:", err);
        setError(
          getApiErrorMessage(
            err,
            "تعذر تحميل بيانات العروض."
          )
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="admin-main" dir="rtl">
      <div className="admin-content">
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 18,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "#FFF7ED",
                  color: "#E87516",
                }}
              >
                <Tag size={23} />
              </div>

              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                  }}
                >
                  العروض
                </h1>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#64748B",
                  }}
                >
                  إدارة أكواد العروض.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#FEF2F2",
                color: "#B91C1C",
                border: "1px solid #FECACA",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              background: "#fff",
              border: "1px solid #E2E8F0",
              borderRadius: 18,
              padding: 24,
            }}
          >
            {loading ? (
              <div
                style={{
                  minHeight: 180,
                  display: "grid",
                  placeItems: "center",
                  color: "#64748B",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Loader2 className="premium-spin" size={22} />
                  جارٍ تحميل العروض...
                </div>
              </div>
            ) : offers.length === 0 ? (
              <div
                style={{
                  minHeight: 180,
                  display: "grid",
                  placeItems: "center",
                  color: "#64748B",
                }}
              >
                لا توجد عروض حاليًا.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {offers.map((offer) => (
                  <div
                    key={offer._id}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        direction: "ltr",
                        textAlign: "right",
                        letterSpacing: 1,
                        marginBottom: 10,
                      }}
                    >
                      {offer.code || "بدون كود"}
                    </div>

                    <div>
                      السعر بعد العرض:{" "}
                      <strong>
                        {Number(
                          offer.deliveryPrice ?? 0
                        ).toLocaleString("en-US")}{" "}
                        دينار
                      </strong>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: offer.isActive
                          ? "#15803D"
                          : "#64748B",
                        fontWeight: 800,
                      }}
                    >
                      {offer.isActive ? "مفعل" : "غير مفعل"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
