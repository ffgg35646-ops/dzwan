import { useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { dzwanConfirm } from "../lib/message";

type Restaurant = {
  _id: string;
  name: string;
  type?: string;
  status?: string;
};

type Offer = {
  _id: string;
  code?: string;
  audience?: string;
  establishmentId?: string | null;
  establishmentIds?: string[];
  deliveryPrice?: number | null;
  requiredCompletedOrders?: number | null;
  usageMode?: "unlimited" | "once_per_establishment";
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [days, setDays] = useState("10");
  const [deliveryPrice, setDeliveryPrice] = useState("");
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasCondition, setHasCondition] = useState(false);
  const [requiredOrders, setRequiredOrders] = useState("");
  const [usageMode, setUsageMode] =
    useState<"unlimited" | "once_per_establishment">("unlimited");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [offersRes, restaurantsRes] = await Promise.all([
        api.get("/offers/admin"),
        api.get("/establishments"),
      ]);

      const offerData = Array.isArray(offersRes.data?.data)
        ? offersRes.data.data
        : [];

      const establishmentData = Array.isArray(
        restaurantsRes.data?.establishments,
      )
        ? restaurantsRes.data.establishments
        : Array.isArray(restaurantsRes.data?.data)
          ? restaurantsRes.data.data
          : [];

      setOffers(offerData);
      setRestaurants(
        establishmentData.filter(
          (item: Restaurant) => item.type === "restaurant",
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل بيانات العروض.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return restaurants;

    return restaurants.filter((restaurant) =>
      restaurant.name.toLowerCase().includes(q),
    );
  }, [restaurants, search]);

  const allSelected =
    filteredRestaurants.length > 0 &&
    filteredRestaurants.every((restaurant) =>
      selectedIds.includes(restaurant._id),
    );

  function toggleRestaurant(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    if (allSelected) {
      const visibleIds = new Set(
        filteredRestaurants.map((restaurant) => restaurant._id),
      );

      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.has(id)),
      );

      return;
    }

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...filteredRestaurants.map((restaurant) => restaurant._id),
      ]),
    ]);
  }

  async function stopOffer(id: string) {
    try {
      setError("");
      setMessage("");
      setActionId(id);

      await api.patch(`/offers/${id}`, {
        isActive: false,
      });

      setMessage("تم إيقاف العرض بنجاح.");
      await load();
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر إيقاف العرض.",
        ),
      );
    } finally {
      setActionId("");
    }
  }

  async function deleteOffer(id: string, code?: string) {
    const confirmed = await dzwanConfirm(
      `هل أنت متأكد من حذف العرض ${code || ""}؟\nلا يمكن التراجع عن الحذف.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      setActionId(id);

      await api.delete(`/offers/${id}`);

      setMessage("تم حذف العرض بنجاح.");
      await load();
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف العرض.",
        ),
      );
    } finally {
      setActionId("");
    }
  }

  async function createOffer() {
    setError("");
    setMessage("");

    const cleanDays = Number(days);
    const cleanPrice = Number(deliveryPrice);
    const cleanRequired = Number(requiredOrders);

    if (!Number.isInteger(cleanDays) || cleanDays <= 0) {
      setError("أدخل مدة صحيحة بالأيام.");
      return;
    }

    if (!Number.isFinite(cleanPrice) || cleanPrice < 0) {
      setError("أدخل سعر التوصيل بعد العرض بشكل صحيح.");
      return;
    }

    if (scope === "selected" && selectedIds.length === 0) {
      setError("اختر مطعمًا واحدًا على الأقل.");
      return;
    }

    if (
      hasCondition &&
      (!Number.isInteger(cleanRequired) || cleanRequired < 0)
    ) {
      setError("أدخل عدد الطلبات المكتملة بشكل صحيح.");
      return;
    }

    try {
      setCreating(true);

      const startsAt = new Date();
      const endsAt = new Date(
        startsAt.getTime() + cleanDays * 86400000,
      );

      const response = await api.post("/offers", {
        title: "كود خصم",
        description: "خصم على سعر التوصيل.",
        audience:
          scope === "all"
            ? "all"
            : "establishments",
        establishmentId:
          scope === "selected" && selectedIds.length === 1
            ? selectedIds[0]
            : null,
        establishmentIds:
          scope === "selected"
            ? selectedIds
            : [],
        type: "fixed",
        value: 0,
        deliveryPrice: cleanPrice,
        minOrderAmount: 0,
        maxDiscount: null,
        usageLimit: null,
        usageCount: 0,
        requiredCompletedOrders:
          hasCondition
            ? cleanRequired
            : null,
        usageMode,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        isActive: true,
      });

      const code = response.data?.data?.code;

      setMessage(
        code
          ? `تم إنشاء الكود ${code} بنجاح.`
          : "تم إنشاء العرض بنجاح.",
      );

      setDays("10");
      setDeliveryPrice("");
      setScope("all");
      setSearch("");
      setSelectedIds([]);
      setHasCondition(false);
      setRequiredOrders("");
      setUsageMode("unlimited");

      await load();
    } catch (err) {
      console.error(err);
      setError(
        getApiErrorMessage(
          err,
          "تعذر إنشاء كود العرض.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "relative",
        zIndex: 100000,
        pointerEvents: "auto",
        width: "100%",
        minHeight: "100%",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 24,
            marginBottom: 18,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            العروض
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
            }}
          >
            إنشاء أكواد عروض تتحكم في سعر التوصيل للمطاعم.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 24,
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              margin: "0 0 18px",
              color: "#0f172a",
            }}
          >
            إنشاء كود عرض
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(240px,1fr))",
              gap: 14,
            }}
          >
            <label style={{ display: "grid", gap: 7 }}>
              <span>مدة العرض بالأيام</span>

              <input
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                disabled={creating}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 7 }}>
              <span>سعر التوصيل بعد العرض</span>

              <input
                type="number"
                min={0}
                value={deliveryPrice}
                onChange={(e) =>
                  setDeliveryPrice(e.target.value)
                }
                disabled={creating}
                placeholder="مثال: 2000"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 10 }}>
              نطاق العرض
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(240px,1fr))",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setScope("all")}
                disabled={creating}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  background:
                    scope === "all"
                      ? "#fff7ed"
                      : "#fff",
                  border:
                    scope === "all"
                      ? "2px solid #e87516"
                      : "1px solid #cbd5e1",
                  textAlign: "right",
                }}
              >
                جميع المطاعم
              </button>

              <button
                type="button"
                onClick={() =>
                  setScope("selected")
                }
                disabled={creating}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  background:
                    scope === "selected"
                      ? "#fff7ed"
                      : "#fff",
                  border:
                    scope === "selected"
                      ? "2px solid #e87516"
                      : "1px solid #cbd5e1",
                  textAlign: "right",
                }}
              >
                مطاعم محددة
              </button>
            </div>
          </div>

          {scope === "selected" && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  disabled={creating}
                  placeholder="ابحث باسم المطعم..."
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                  }}
                />

                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={
                    creating ||
                    filteredRestaurants.length === 0
                  }
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {allSelected
                    ? "إلغاء الكل"
                    : "تحديد الكل"}
                </button>
              </div>

              <div
                style={{
                  marginBottom: 10,
                  color: "#64748b",
                }}
              >
                المطاعم المحددة: {selectedIds.length}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                {filteredRestaurants.map(
                  (restaurant) => {
                    const selected =
                      selectedIds.includes(
                        restaurant._id,
                      );

                    return (
                      <button
                        type="button"
                        key={restaurant._id}
                        onClick={() =>
                          toggleRestaurant(
                            restaurant._id,
                          )
                        }
                        disabled={creating}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          textAlign: "right",
                          cursor: "pointer",
                          background: selected
                            ? "#fff7ed"
                            : "#fff",
                          border: selected
                            ? "2px solid #e87516"
                            : "1px solid #e2e8f0",
                        }}
                      >
                        {restaurant.name}
                      </button>
                    );
                  },
                )}

                {filteredRestaurants.length === 0 && (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    لا توجد مطاعم مطابقة.
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              onClick={() =>
                setHasCondition((value) => !value)
              }
              disabled={creating}
              style={{
                width: "100%",
                padding: 13,
                borderRadius: 12,
                border: "1px solid #cbd5e1",
                background: hasCondition
                  ? "#fff7ed"
                  : "#fff",
                textAlign: "right",
                cursor: "pointer",
              }}
            >
              {hasCondition ? "✓" : "□"} تفعيل شرط عدد الطلبات المكتملة
            </button>

            {hasCondition && (
              <input
                type="number"
                min={0}
                value={requiredOrders}
                onChange={(e) =>
                  setRequiredOrders(e.target.value)
                }
                disabled={creating}
                placeholder="مثال: 10"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 10 }}>
              طريقة استخدام الكود
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(240px,1fr))",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setUsageMode("unlimited")
                }
                disabled={creating}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  background:
                    usageMode === "unlimited"
                      ? "#fff7ed"
                      : "#fff",
                  border:
                    usageMode === "unlimited"
                      ? "2px solid #e87516"
                      : "1px solid #cbd5e1",
                }}
              >
                بدون حد
              </button>

              <button
                type="button"
                onClick={() =>
                  setUsageMode(
                    "once_per_establishment",
                  )
                }
                disabled={creating}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  cursor: "pointer",
                  background:
                    usageMode ===
                    "once_per_establishment"
                      ? "#fff7ed"
                      : "#fff",
                  border:
                    usageMode ===
                    "once_per_establishment"
                      ? "2px solid #e87516"
                      : "1px solid #cbd5e1",
                }}
              >
                مرة واحدة لكل مطعم
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void createOffer()}
            disabled={creating || !deliveryPrice}
            style={{
              width: "100%",
              marginTop: 20,
              padding: 15,
              border: 0,
              borderRadius: 13,
              background: "#e87516",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {creating
              ? "جارٍ إنشاء الكود..."
              : "إنشاء كود العرض"}
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                }}
              >
                العروض الحالية
              </h2>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                }}
              >
                الأكواد الموجودة حاليًا.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              style={{
                padding: "9px 13px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              تحديث
            </button>
          </div>

          {loading ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              جارٍ تحميل العروض...
            </div>
          ) : offers.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              لا توجد عروض حاليًا.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(260px,1fr))",
                gap: 12,
                marginTop: 18,
              }}
            >
              {offers.map((offer) => (
                <div
                  key={offer._id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      direction: "ltr",
                      textAlign: "right",
                      fontSize: 18,
                      fontWeight: 900,
                      letterSpacing: 1,
                    }}
                  >
                    {offer.code || "بدون كود"}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    السعر بعد العرض:{" "}
                    <strong>
                      {Number(
                        offer.deliveryPrice ?? 0,
                      ).toLocaleString("en-US")}{" "}
                      دينار
                    </strong>
                  </div>

                  <div style={{ marginTop: 7 }}>
                    النطاق:{" "}
                    <strong>
                      {offer.audience === "all"
                        ? "جميع المطاعم"
                        : `${
                            Array.isArray(
                              offer.establishmentIds,
                            )
                              ? offer
                                  .establishmentIds
                                  .length
                              : offer.establishmentId
                                ? 1
                                : 0
                          } مطعم`}
                    </strong>
                  </div>

                  <div style={{ marginTop: 7 }}>
                    الاستخدام:{" "}
                    <strong>
                      {offer.usageMode ===
                      "once_per_establishment"
                        ? "مرة واحدة لكل مطعم"
                        : "بدون حد"}
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                    }}
                  >
                    الشرط:{" "}
                    <strong>
                      {offer.requiredCompletedOrders ==
                      null
                        ? "بدون شرط"
                        : `${offer.requiredCompletedOrders} طلب مكتمل`}
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: offer.isActive
                        ? "#15803d"
                        : "#64748b",
                      fontWeight: 800,
                    }}
                  >
                    {offer.isActive
                      ? "مفعل"
                      : "غير مفعل"}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(120px,1fr))",
                      gap: 8,
                      marginTop: 14,
                    }}
                  >
                    {offer.isActive && (
                      <button
                        type="button"
                        disabled={actionId === offer._id}
                        onClick={() =>
                          void stopOffer(offer._id)
                        }
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border:
                            "1px solid #f59e0b",
                          background:
                            "#fffbeb",
                          color: "#92400e",
                          fontWeight: 800,
                          cursor:
                            actionId === offer._id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {actionId === offer._id
                          ? "جارٍ التنفيذ..."
                          : "إيقاف العرض"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={actionId === offer._id}
                      onClick={() =>
                        void deleteOffer(
                          offer._id,
                          offer.code,
                        )
                      }
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        border:
                          "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#b91c1c",
                        fontWeight: 800,
                        cursor:
                          actionId === offer._id
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {actionId === offer._id
                        ? "جارٍ التنفيذ..."
                        : "حذف العرض"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
