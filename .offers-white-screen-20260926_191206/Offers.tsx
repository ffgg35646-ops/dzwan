import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Megaphone,
  Search,
  Tag,
  Users,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type Establishment = {
  _id: string;
  name: string;
  type: "restaurant" | "shop";
  status?: string;
};

type Offer = {
  _id: string;
  title?: string;
  code?: string;
  description?: string;
  audience?: string;
  establishmentId?: string | { _id: string } | null;
  establishmentIds?: string[];
  deliveryPrice?: number | null;
  requiredCompletedOrders?: number | null;
  usageMode?: "unlimited" | "once_per_establishment";
  startsAt?: string;
  endsAt?: string;
  isActive?: boolean;
};

function formatDate(value?: string) {
  if (!value) return "غير محدد";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "غير محدد";
  }

  return date.toLocaleString("ar-IQ-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(value: number | null | undefined) {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString("en-US")
    : "0";
}


export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [establishments, setEstablishments] =
    useState<Establishment[]>([]);

  const [days, setDays] = useState("10");
  const [deliveryPrice, setDeliveryPrice] =
    useState("");

  const [scope, setScope] =
    useState<"all" | "selected">("all");

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [hasOrderCondition, setHasOrderCondition] =
    useState(false);

  const [requiredOrders, setRequiredOrders] =
    useState("");

  const [usageMode, setUsageMode] =
    useState<
      "unlimited" | "once_per_establishment"
    >("unlimited");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdCode, setCreatedCode] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const [
        offersResponse,
        establishmentsResponse,
      ] = await Promise.all([
        api.get("/offers/admin"),
        api.get("/establishments"),
      ]);

      const offerList =
        Array.isArray(offersResponse.data?.data)
          ? offersResponse.data.data
          : [];

      const establishmentList =
        Array.isArray(
          establishmentsResponse.data?.establishments,
        )
          ? establishmentsResponse.data.establishments
          : Array.isArray(
                establishmentsResponse.data?.data,
              )
            ? establishmentsResponse.data.data
            : [];

      setOffers(offerList);
      setEstablishments(
        establishmentList.filter(
          (item: Establishment) =>
            item.type === "restaurant",
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

  function toggleRestaurant(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const filteredEstablishments =
    useMemo(() => {
      const value = search
        .trim()
        .toLowerCase();

      if (!value) {
        return establishments;
      }

      return establishments.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(value),
      );
    }, [establishments, search]);

  const allFilteredSelected =
    filteredEstablishments.length > 0 &&
    filteredEstablishments.every((item) =>
      selectedIds.includes(item._id),
    );

  function toggleAllFiltered() {
    if (allFilteredSelected) {
      const idsToRemove =
        new Set(
          filteredEstablishments.map(
            (item) => item._id,
          ),
        );

      setSelectedIds((current) =>
        current.filter(
          (id) => !idsToRemove.has(id),
        ),
      );

      return;
    }

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...filteredEstablishments.map(
          (item) => item._id,
        ),
      ]),
    ]);
  }

  async function create() {
    setError("");
    setMessage("");
    setCreatedCode("");

    const cleanDays = Number(days);
    const cleanPrice = Number(deliveryPrice);
    const cleanRequiredOrders =
      Number(requiredOrders);

    if (
      !Number.isInteger(cleanDays) ||
      cleanDays <= 0
    ) {
      setError("أدخل مدة صحيحة للعرض بالأيام.");
      return;
    }

    if (
      !Number.isFinite(cleanPrice) ||
      cleanPrice < 0
    ) {
      setError(
        "أدخل سعر التوصيل بعد الخصم بشكل صحيح.",
      );
      return;
    }

    if (
      scope === "selected" &&
      selectedIds.length === 0
    ) {
      setError(
        "اختر مطعمًا واحدًا على الأقل.",
      );
      return;
    }

    if (
      hasOrderCondition &&
      (
        !Number.isInteger(
          cleanRequiredOrders,
        ) ||
        cleanRequiredOrders < 0
      )
    ) {
      setError(
        "أدخل عدد الطلبات المكتملة بشكل صحيح.",
      );
      return;
    }

    try {
      setCreating(true);

      const startsAt = new Date();

      const endsAt = new Date(
        startsAt.getTime() +
          cleanDays * 86400000,
      );

      const payload = {
        title: "كود خصم",
        description:
          "خصم على سعر التوصيل.",
        audience:
          scope === "all"
            ? "all"
            : "establishments",
        establishmentId:
          scope === "selected" &&
          selectedIds.length === 1
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
          hasOrderCondition
            ? cleanRequiredOrders
            : null,
        usageMode,
        startsAt:
          startsAt.toISOString(),
        endsAt:
          endsAt.toISOString(),
        isActive: true,
      };

      const response =
        await api.post(
          "/offers",
          payload,
        );

      const newOffer =
        response.data?.data;

      setCreatedCode(
        newOffer?.code || "",
      );

      setMessage(
        newOffer?.code
          ? `تم إنشاء الكود ${newOffer.code} بنجاح.`
          : "تم إنشاء العرض بنجاح.",
      );

      setDays("10");
      setDeliveryPrice("");
      setScope("all");
      setSelectedIds([]);
      setSearch("");
      setHasOrderCondition(false);
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

  useEffect(() => {
    void load();
  }, []);

  const activeCount =
    offers.filter(
      (offer) => offer.isActive,
    ).length;

  return (
    <main
      className="admin-main"
      dir="rtl"
    >
      <div className="admin-content">
        <div className="premium-page-shell">

          <section className="premium-page-intro">
            <div>
              <span className="premium-page-kicker">
                التسويق والعروض
              </span>

              <h1>العروض</h1>

              <p>
                إنشاء أكواد خصم للتحكم في سعر
                التوصيل للمطاعم.
              </p>
            </div>

            <div className="premium-page-icon">
              <Megaphone size={26} />
            </div>
          </section>

          <section className="premium-stat-grid compact">
            <div className="premium-stat-card">
              <div className="premium-stat-icon">
                <Tag size={20} />
              </div>

              <span>إجمالي العروض</span>
              <strong>
                {offers.length}
              </strong>
            </div>

            <div className="premium-stat-card highlight">
              <div className="premium-stat-icon">
                <Megaphone size={20} />
              </div>

              <span>العروض المفعلة</span>
              <strong>
                {activeCount}
              </strong>
            </div>

            <div className="premium-stat-card">
              <div className="premium-stat-icon">
                <Users size={20} />
              </div>

              <span>المطاعم المتاحة</span>
              <strong>
                {establishments.length}
              </strong>
            </div>
          </section>

          {error && (
            <div className="premium-error">
              {error}
            </div>
          )}

          {message && (
            <div
              className="premium-success"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Check size={18} />
              <span>{message}</span>

              {createdCode && (
                <strong
                  style={{
                    direction: "ltr",
                    background: "#fff",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border:
                      "1px solid #A7F3D0",
                    letterSpacing: 1,
                  }}
                >
                  {createdCode}
                </strong>
              )}
            </div>
          )}

          <section className="premium-form-card">
            <div className="premium-section-heading">
              <div className="premium-section-icon">
                <Tag size={19} />
              </div>

              <div>
                <h2>إنشاء كود عرض</h2>
                <p>
                  الكود يتم إنشاؤه تلقائيًا ويؤثر
                  على سعر التوصيل فقط.
                </p>
              </div>
            </div>

            <div
              className="premium-form-grid"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <div className="premium-field">
                <label>
                  مدة العرض بالأيام
                </label>

                <input
                  className="premium-input"
                  type="number"
                  min={1}
                  value={days}
                  onChange={(e) =>
                    setDays(e.target.value)
                  }
                  disabled={creating}
                  placeholder="10"
                />

                <small>
                  يبدأ العرض فور إنشائه.
                </small>
              </div>

              <div className="premium-field">
                <label>
                  سعر التوصيل بعد العرض
                </label>

                <input
                  className="premium-input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryPrice}
                  onChange={(e) =>
                    setDeliveryPrice(
                      e.target.value,
                    )
                  }
                  disabled={creating}
                  placeholder="مثال: 2000"
                />

                <small>
                  مثال: التسعير الأساسي 3000
                  يصبح 2000 دينار.
                </small>
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gap: 14,
              }}
            >
              <div className="premium-field">
                <label>
                  نطاق العرض
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setScope("all")
                    }
                    disabled={creating}
                    style={{
                      border:
                        scope === "all"
                          ? "2px solid #E87516"
                          : "1px solid #E2E8F0",
                      background:
                        scope === "all"
                          ? "#FFF7ED"
                          : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      textAlign: "right",
                      cursor: "pointer",
                    }}
                  >
                    <strong>
                      جميع المطاعم
                    </strong>

                    <div
                      style={{
                        color: "#64748B",
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      الكود يعمل مع كل المطاعم.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setScope("selected")
                    }
                    disabled={creating}
                    style={{
                      border:
                        scope === "selected"
                          ? "2px solid #E87516"
                          : "1px solid #E2E8F0",
                      background:
                        scope === "selected"
                          ? "#FFF7ED"
                          : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      textAlign: "right",
                      cursor: "pointer",
                    }}
                  >
                    <strong>
                      مطاعم محددة
                    </strong>

                    <div
                      style={{
                        color: "#64748B",
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      اختر المطاعم التي تستخدم الكود.
                    </div>
                  </button>
                </div>
              </div>

              {scope === "selected" && (
                <div
                  style={{
                    border:
                      "1px solid #E2E8F0",
                    borderRadius: 16,
                    padding: 16,
                    background: "#F8FAFC",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        flex: 1,
                      }}
                    >
                      <Search
                        size={17}
                        style={{
                          position: "absolute",
                          top: "50%",
                          right: 12,
                          transform:
                            "translateY(-50%)",
                          color: "#94A3B8",
                        }}
                      />

                      <input
                        className="premium-input"
                        style={{
                          paddingRight: 38,
                        }}
                        value={search}
                        onChange={(e) =>
                          setSearch(
                            e.target.value,
                          )
                        }
                        placeholder="ابحث باسم المطعم..."
                        disabled={creating}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={
                        toggleAllFiltered
                      }
                      disabled={
                        creating ||
                        filteredEstablishments.length ===
                          0
                      }
                      style={{
                        border:
                          "1px solid #CBD5E1",
                        background: "#fff",
                        borderRadius: 10,
                        padding:
                          "10px 13px",
                        cursor: "pointer",
                        fontWeight: 800,
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {allFilteredSelected
                        ? "إلغاء تحديد النتائج"
                        : "تحديد الكل"}
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                      color: "#64748B",
                      fontSize: 13,
                    }}
                  >
                    <span>
                      المطاعم المحددة:{" "}
                      <strong>
                        {selectedIds.length}
                      </strong>
                    </span>

                    <span>
                      النتائج:{" "}
                      <strong>
                        {
                          filteredEstablishments.length
                        }
                      </strong>
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 8,
                      maxHeight: 320,
                      overflowY: "auto",
                    }}
                  >
                    {filteredEstablishments.map(
                      (restaurant) => {
                        const selected =
                          selectedIds.includes(
                            restaurant._id,
                          );

                        return (
                          <button
                            type="button"
                            key={
                              restaurant._id
                            }
                            onClick={() =>
                              toggleRestaurant(
                                restaurant._id,
                              )
                            }
                            disabled={creating}
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 12,
                              width: "100%",
                              border:
                                selected
                                  ? "1px solid #E87516"
                                  : "1px solid #E2E8F0",
                              background:
                                selected
                                  ? "#FFF7ED"
                                  : "#fff",
                              borderRadius: 12,
                              padding: 11,
                              cursor:
                                "pointer",
                              textAlign:
                                "right",
                            }}
                          >
                            <span
                              style={{
                                width: 23,
                                height: 23,
                                borderRadius: 7,
                                border:
                                  selected
                                    ? "1px solid #E87516"
                                    : "1px solid #CBD5E1",
                                background:
                                  selected
                                    ? "#E87516"
                                    : "#fff",
                                display:
                                  "grid",
                                placeItems:
                                  "center",
                                flexShrink: 0,
                              }}
                            >
                              {selected && (
                                <Check
                                  size={15}
                                  color="#fff"
                                />
                              )}
                            </span>

                            <span
                              style={{
                                flex: 1,
                                fontWeight: 800,
                                color:
                                  "#0F172A",
                              }}
                            >
                              {
                                restaurant.name
                              }
                            </span>

                            <span
                              style={{
                                fontSize: 11,
                                color:
                                  restaurant.status ===
                                  "active"
                                    ? "#15803D"
                                    : "#64748B",
                              }}
                            >
                              {
                                restaurant.status ===
                                "active"
                                  ? "نشط"
                                  : "غير نشط"
                              }
                            </span>
                          </button>
                        );
                      },
                    )}

                    {filteredEstablishments.length ===
                      0 && (
                      <div
                        style={{
                          padding: 25,
                          textAlign: "center",
                          color:
                            "#94A3B8",
                        }}
                      >
                        لا توجد مطاعم مطابقة للبحث.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="premium-field">
                <label>
                  شرط عدد الطلبات المكتملة
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setHasOrderCondition(
                      (value) => !value,
                    )
                  }
                  disabled={creating}
                  style={{
                    width: "100%",
                    border:
                      hasOrderCondition
                        ? "2px solid #E87516"
                        : "1px solid #E2E8F0",
                    background:
                      hasOrderCondition
                        ? "#FFF7ED"
                        : "#fff",
                    borderRadius: 12,
                    padding:
                      "12px 14px",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 10,
                    cursor: "pointer",
                    textAlign: "right",
                  }}
                >
                  <span
                    style={{
                      width: 21,
                      height: 21,
                      borderRadius: 6,
                      border:
                        hasOrderCondition
                          ? "1px solid #E87516"
                          : "1px solid #CBD5E1",
                      background:
                        hasOrderCondition
                          ? "#E87516"
                          : "#fff",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {hasOrderCondition && (
                      <Check
                        size={14}
                        color="#fff"
                      />
                    )}
                  </span>

                  <span>
                    تفعيل شرط عدد الطلبات
                  </span>
                </button>

                {hasOrderCondition && (
                  <input
                    className="premium-input"
                    type="number"
                    min={0}
                    step={1}
                    value={requiredOrders}
                    onChange={(e) =>
                      setRequiredOrders(
                        e.target.value,
                      )
                    }
                    disabled={creating}
                    placeholder="مثال: 10"
                    style={{
                      marginTop: 10,
                    }}
                  />
                )}

                <small>
                  الشرط اختياري. يمكن إنشاء العرض
                  بدون أي شرط.
                </small>
              </div>

              <div className="premium-field">
                <label>
                  طريقة استخدام الكود
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setUsageMode(
                        "unlimited",
                      )
                    }
                    disabled={creating}
                    style={{
                      border:
                        usageMode ===
                        "unlimited"
                          ? "2px solid #E87516"
                          : "1px solid #E2E8F0",
                      background:
                        usageMode ===
                        "unlimited"
                          ? "#FFF7ED"
                          : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      textAlign:
                        "right",
                      cursor:
                        "pointer",
                    }}
                  >
                    <strong>
                      بدون حد
                    </strong>

                    <div
                      style={{
                        color:
                          "#64748B",
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      يسمح باستخدام الكود
                      في الطلبات المتعددة.
                    </div>
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
                      border:
                        usageMode ===
                        "once_per_establishment"
                          ? "2px solid #E87516"
                          : "1px solid #E2E8F0",
                      background:
                        usageMode ===
                        "once_per_establishment"
                          ? "#FFF7ED"
                          : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      textAlign:
                        "right",
                      cursor:
                        "pointer",
                    }}
                  >
                    <strong>
                      مرة واحدة لكل مطعم
                    </strong>

                    <div
                      style={{
                        color:
                          "#64748B",
                        fontSize: 12,
                        marginTop: 5,
                      }}
                    >
                      بعد استخدامه مرة لا يمكن
                      للمطعم استخدامه مرة أخرى.
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div
              className="premium-form-footer"
              style={{
                marginTop: 22,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Clock3 size={16} />
                يبدأ العرض فورًا وينتهي بعد{" "}
                {days || "0"} يوم.
              </span>

              <button
                type="button"
                className="premium-primary-button"
                disabled={
                  creating ||
                  !deliveryPrice
                }
                onClick={() =>
                  void create()
                }
              >
                {creating ? (
                  <>
                    <Loader2
                      size={18}
                      className="premium-spin"
                    />
                    جارٍ إنشاء الكود...
                  </>
                ) : (
                  <>
                    <Tag size={18} />
                    إنشاء كود العرض
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="premium-panel">
            <div className="premium-panel-header">
              <div>
                <h2>العروض الحالية</h2>
                <p>
                  الأكواد التي تم إنشاؤها من لوحة الإدارة.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="premium-state-card inline">
                <Loader2
                  size={27}
                  className="premium-spin"
                />
                <span>
                  جارٍ تحميل العروض...
                </span>
              </div>
            ) : offers.length === 0 ? (
              <div className="premium-state-card muted">
                <Tag size={30} />
                <h3>لا توجد عروض</h3>
                <p>
                  لم يتم إنشاء أي كود عرض حتى الآن.
                </p>
              </div>
            ) : (
              <div className="premium-offers-grid">
                {offers.map((offer) => {
                  const selectedCount =
                    Array.isArray(
                      offer.establishmentIds,
                    )
                      ? offer.establishmentIds
                          .length
                      : offer.establishmentId
                        ? 1
                        : 0;

                  return (
                    <article
                      className="premium-offer-card"
                      key={offer._id}
                    >
                      <div className="premium-offer-top">
                        <div className="premium-offer-icon">
                          <Tag size={19} />
                        </div>

                        <span
                          className={`premium-status-pill ${
                            offer.isActive
                              ? "success"
                              : "neutral"
                          }`}
                        >
                          {offer.isActive
                            ? "مفعل"
                            : "غير مفعل"}
                        </span>
                      </div>

                      <h3
                        style={{
                          direction: "ltr",
                          textAlign:
                            "right",
                          letterSpacing: 1,
                        }}
                      >
                        {offer.code ||
                          "بدون كود"}
                      </h3>

                      <p>
                        كود خصم على سعر التوصيل.
                      </p>

                      <div className="premium-offer-meta">
                        <div>
                          <span>
                            السعر بعد العرض
                          </span>

                          <strong>
                            {formatNumber(
                              offer.deliveryPrice,
                            )}{" "}
                            دينار
                          </strong>
                        </div>

                        <div>
                          <span>
                            النطاق
                          </span>

                          <strong>
                            {offer.audience ===
                            "all"
                              ? "جميع المطاعم"
                              : `${selectedCount} مطعم`}
                          </strong>
                        </div>

                        <div>
                          <span>
                            الاستخدام
                          </span>

                          <strong>
                            {offer.usageMode ===
                            "once_per_establishment"
                              ? "مرة لكل مطعم"
                              : "بدون حد"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            شرط الطلبات
                          </span>

                          <strong>
                            {offer.requiredCompletedOrders !==
                            null &&
                            offer.requiredCompletedOrders !==
                              undefined
                              ? `${formatNumber(
                                  offer.requiredCompletedOrders,
                                )} طلبات مكتملة`
                              : "بدون شرط"}
                          </strong>
                        </div>

                        <div>
                          <span>
                            البداية
                          </span>

                          <strong>
                            {formatDate(
                              offer.startsAt,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            النهاية
                          </span>

                          <strong>
                            {formatDate(
                              offer.endsAt,
                            )}
                          </strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section
            style={{
              background:
                "#FFF7ED",
              border:
                "1px solid #FED7AA",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              color: "#9A3412",
            }}
          >
            <CalendarDays
              size={19}
              style={{
                flexShrink: 0,
                marginTop: 2,
              }}
            />

            <div>
              <strong>
                ملاحظة مهمة
              </strong>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  lineHeight:
                    1.7,
                }}
              >
                الكود له تاريخ بداية ونهاية.
                بعد انتهاء العرض لن يكون صالحًا
                للاستخدام حتى لو كان الكود مكتوبًا
                بشكل صحيح.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setError("");
                setCreatedCode("");
              }}
              style={{
                marginRight: "auto",
                border: 0,
                background:
                  "transparent",
                cursor: "pointer",
                color: "#9A3412",
              }}
              aria-label="إغلاق"
            >
              <X size={17} />
            </button>
          </section>

        </div>
      </div>
    </main>
  );
}
