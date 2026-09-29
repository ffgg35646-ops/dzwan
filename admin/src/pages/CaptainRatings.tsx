import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Star,
  Users,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type Captain = {
  _id: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  total?: number;
  average?: number;
};

type Rating = {
  _id: string;
  orderId?: string | null;
  orderNumber?: string | null;
  restaurantName?: string | null;
  establishmentName?: string | null;
  stars?: number;
  comment?: string | null;
  review?: string | null;
  createdAt?: string | null;
};

const PAGE_SIZE = 7;
const MODAL_PAGE_SIZE = 4;

function captainName(captain: Captain) {
  return (
    captain.fullName ||
    captain.name ||
    "بدون اسم"
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-IQ-u-nu-latn").format(
    Number(value || 0),
  );
}

function formatAverage(value: number) {
  return Number(value || 0).toFixed(1);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("ar-EG-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getInitial(name: string) {
  return (
    name.trim().slice(0, 1) ||
    "ك"
  );
}

function extractCaptains(data: any): Captain[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.captains)) {
    return data.captains;
  }

  if (Array.isArray(data?.data?.captains)) {
    return data.data.captains;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function extractRatings(data: any): Rating[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.ratings)) {
    return data.ratings;
  }

  if (Array.isArray(data?.data?.ratings)) {
    return data.data.ratings;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function RatingStars({
  value,
  size = 15,
}: {
  value: number;
  size?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        direction: "ltr",
      }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={
            star <= Number(value || 0)
              ? "currentColor"
              : "none"
          }
        />
      ))}
    </div>
  );
}

export default function CaptainRatings() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [selectedCaptain, setSelectedCaptain] =
    useState<Captain | null>(null);

  const [modalRatings, setModalRatings] =
    useState<Rating[]>([]);

  const [modalLoading, setModalLoading] =
    useState(false);

  const [modalError, setModalError] =
    useState("");

  const [modalPage, setModalPage] =
    useState(1);

  async function loadCaptains(
    silent = false,
  ) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get(
        "/completion/ratings/captains",
      );

      setCaptains(
        extractCaptains(response.data),
      );
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل قائمة الكباتن.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function openRatings(
    captain: Captain,
  ) {
    setSelectedCaptain(captain);
    setModalPage(1);
    setModalRatings([]);
    setModalError("");
    setModalLoading(true);

    try {
      const response = await api.get(
        `/completion/ratings/${captain._id}`,
      );

      setModalRatings(
        extractRatings(response.data),
      );
    } catch (err) {
      setModalError(
        getApiErrorMessage(
          err,
          "تعذر تحميل تقييمات الكابتن.",
        ),
      );
    } finally {
      setModalLoading(false);
    }
  }

  function closeRatings() {
    setSelectedCaptain(null);
    setModalRatings([]);
    setModalError("");
    setModalPage(1);
  }

  useEffect(() => {
    void loadCaptains();

    const timer = window.setInterval(() => {
      void loadCaptains(true);
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredCaptains = useMemo(() => {
    const q = search
      .trim()
      .toLocaleLowerCase("ar");

    if (!q) {
      return captains;
    }

    return captains.filter((captain) => {
      const name =
        captainName(captain).toLocaleLowerCase(
          "ar",
        );

      const phone =
        String(captain.phone || "")
          .toLocaleLowerCase("ar");

      const email =
        String(captain.email || "")
          .toLocaleLowerCase("ar");

      return (
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q)
      );
    });
  }, [captains, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredCaptains.length /
        PAGE_SIZE,
    ),
  );

  const visibleCaptains =
    filteredCaptains.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE,
    );

  const totalRatings = captains.reduce(
    (sum, captain) =>
      sum + Number(captain.total || 0),
    0,
  );

  const ratedCaptains = captains.filter(
    (captain) =>
      Number(captain.total || 0) > 0,
  ).length;

  const overallAverage =
    totalRatings > 0
      ? captains.reduce(
          (sum, captain) =>
            sum +
            Number(captain.average || 0) *
              Number(captain.total || 0),
          0,
        ) / totalRatings
      : 0;

  const modalTotalPages = Math.max(
    1,
    Math.ceil(
      modalRatings.length /
        MODAL_PAGE_SIZE,
    ),
  );

  const visibleModalRatings =
    modalRatings.slice(
      (modalPage - 1) * MODAL_PAGE_SIZE,
      modalPage * MODAL_PAGE_SIZE,
    );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (modalPage > modalTotalPages) {
      setModalPage(modalTotalPages);
    }
  }, [modalPage, modalTotalPages]);

  return (
    <main
      className="premium-page"
      dir="rtl"
      style={{
        minHeight: "100%",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <section
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 7,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(135deg,#eef6ff,#f7fbff)",
                  border:
                    "1px solid #dbeafe",
                  color: "#2563eb",
                  boxShadow:
                    "0 8px 20px rgba(37,99,235,.08)",
                }}
              >
                <Star
                  size={22}
                  fill="currentColor"
                />
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#64748b",
                    marginBottom: 2,
                  }}
                >
                  إدارة الجودة
                </span>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  تقييمات الكباتن
                </h1>
              </div>
            </div>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: 14,
              }}
            >
              كل الكباتن يتم تحميلهم من الخادم،
              والبحث يعمل مباشرة داخل البيانات
              المحمّلة.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadCaptains(true)}
            disabled={refreshing}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 13,
              border: "1px solid #dbe3ef",
              background: "#ffffff",
              color: "#0f172a",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              cursor: refreshing
                ? "default"
                : "pointer",
              fontWeight: 700,
              boxShadow:
                "0 6px 18px rgba(15,23,42,.05)",
            }}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spin"
                  : undefined
              }
            />
            تحديث
          </button>
        </section>

        {/* Summary */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(210px,1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[
            {
              icon: Users,
              label: "إجمالي الكباتن",
              value: formatNumber(
                captains.length,
              ),
              helper: "المحمّلون من الباك إند",
            },
            {
              icon: Star,
              label: "متوسط التقييم العام",
              value:
                formatAverage(
                  overallAverage,
                ),
              helper:
                "محسوب من إجمالي التقييمات",
            },
            {
              icon: MessageSquare,
              label: "إجمالي التقييمات",
              value: formatNumber(
                totalRatings,
              ),
              helper:
                "من الطلبات المكتملة",
            },
            {
              icon: Users,
              label: "كباتن لديهم تقييم",
              value: formatNumber(
                ratedCaptains,
              ),
              helper:
                "بقية الكباتن بدون تقييمات بعد",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                style={{
                  background: "#ffffff",
                  border:
                    "1px solid #e5eaf2",
                  borderRadius: 18,
                  padding: 17,
                  boxShadow:
                    "0 10px 28px rgba(15,23,42,.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    flex: "0 0 auto",
                    borderRadius: 13,
                    display: "grid",
                    placeItems: "center",
                    background: "#f1f5f9",
                    color: "#2563eb",
                  }}
                >
                  <Icon size={20} />
                </div>

                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {item.value}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#94a3b8",
                      marginTop: 3,
                    }}
                  >
                    {item.helper}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Search + count */}
        <section
          style={{
            background: "#ffffff",
            border:
              "1px solid #e5eaf2",
            borderRadius: 18,
            padding: 16,
            marginBottom: 18,
            boxShadow:
              "0 10px 28px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: "1 1 420px",
                maxWidth: 680,
              }}
            >
              <Search
                size={18}
                style={{
                  position: "absolute",
                  right: 15,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: "#94a3b8",
                  pointerEvents: "none",
                }}
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="ابحث باسم الكابتن أو الإيميل أو رقم الهاتف..."
                style={{
                  width: "100%",
                  height: 48,
                  border:
                    "1px solid #dbe3ef",
                  borderRadius: 14,
                  padding:
                    "0 46px 0 16px",
                  outline: "none",
                  fontSize: 14,
                  color: "#0f172a",
                  background: "#f8fafc",
                  boxSizing:
                    "border-box",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#64748b",
                background: "#f8fafc",
                border:
                  "1px solid #e5eaf2",
                borderRadius: 12,
                padding:
                  "10px 13px",
                whiteSpace: "nowrap",
              }}
            >
              {search.trim()
                ? `${formatNumber(
                    filteredCaptains.length,
                  )} نتيجة`
                : `${formatNumber(
                    captains.length,
                  )} كابتن`}
            </div>
          </div>
        </section>

        {/* States */}
        {loading ? (
          <div
            style={{
              minHeight: 260,
              display: "grid",
              placeItems: "center",
              background: "#ffffff",
              border:
                "1px solid #e5eaf2",
              borderRadius: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                color: "#64748b",
              }}
            >
              <Loader2
                size={28}
                className="spin"
              />
              <span>
                جاري تحميل الكباتن...
              </span>
            </div>
          </div>
        ) : error ? (
          <div
            style={{
              background: "#fff7f7",
              border:
                "1px solid #fecaca",
              borderRadius: 18,
              padding: 20,
              color: "#b91c1c",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : visibleCaptains.length === 0 ? (
          <div
            style={{
              minHeight: 260,
              display: "grid",
              placeItems: "center",
              background: "#ffffff",
              border:
                "1px solid #e5eaf2",
              borderRadius: 18,
              color: "#64748b",
            }}
          >
            لا توجد نتائج مطابقة للبحث.
          </div>
        ) : (
          <>
            {/* Captains */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(280px,1fr))",
                gap: 16,
              }}
            >
              {visibleCaptains.map(
                (captain) => {
                  const name =
                    captainName(
                      captain,
                    );

                  const total =
                    Number(
                      captain.total ||
                        0,
                    );

                  const average =
                    Number(
                      captain.average ||
                        0,
                    );

                  return (
                    <article
                      key={captain._id}
                      style={{
                        background:
                          "#ffffff",
                        border:
                          "1px solid #e5eaf2",
                        borderRadius: 20,
                        padding: 18,
                        boxShadow:
                          "0 12px 30px rgba(15,23,42,.05)",
                        display: "flex",
                        flexDirection:
                          "column",
                        minHeight: 260,
                      }}
                    >
                      {/* Identity */}
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            display: "grid",
                            placeItems:
                              "center",
                            flex:
                              "0 0 auto",
                            background:
                              "linear-gradient(135deg,#eff6ff,#dbeafe)",
                            border:
                              "1px solid #bfdbfe",
                            color: "#2563eb",
                            fontSize: 20,
                            fontWeight: 800,
                          }}
                        >
                          {getInitial(
                            name,
                          )}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <h2
                            style={{
                              margin:
                                0,
                              fontSize: 17,
                              fontWeight:
                                800,
                              color:
                                "#0f172a",
                              whiteSpace:
                                "nowrap",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                            }}
                            title={name}
                          >
                            {name}
                          </h2>

                          <div
                            style={{
                              marginTop: 5,
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 6,
                              color:
                                "#64748b",
                              fontSize: 12,
                            }}
                          >
                            <Phone
                              size={14}
                            />
                            <span>
                              {captain.phone ||
                                "بدون هاتف"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div
                        style={{
                          marginTop: 15,
                          padding:
                            "11px 12px",
                          borderRadius:
                            13,
                          background:
                            "#f8fafc",
                          border:
                            "1px solid #edf1f6",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 7,
                            color:
                              "#64748b",
                            fontSize: 12,
                            minWidth:
                              0,
                          }}
                        >
                          <Mail
                            size={14}
                          />
                          <span
                            style={{
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                            title={
                              captain.email ||
                              ""
                            }
                          >
                            {captain.email ||
                              "بدون إيميل"}
                          </span>
                        </div>
                      </div>

                      {/* Rating */}
                      <div
                        style={{
                          marginTop: 15,
                          display: "grid",
                          gridTemplateColumns:
                            "1fr auto",
                          gap: 12,
                          alignItems:
                            "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 8,
                            }}
                          >
                            <RatingStars
                              value={
                                average
                              }
                              size={
                                16
                              }

                            />

                            <strong
                              style={{
                                fontSize:
                                  18,
                                color:
                                  "#0f172a",
                              }}
                            >
                              {formatAverage(
                                average,
                              )}
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop: 5,
                              fontSize:
                                12,
                              color:
                                "#64748b",
                            }}
                          >
                            {formatNumber(
                              total,
                            )}{" "}
                            تقييم
                          </div>
                        </div>

                        <div
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 15,
                            display:
                              "grid",
                            placeItems:
                              "center",
                            background:
                              total > 0
                                ? "#fff7ed"
                                : "#f8fafc",
                            color:
                              total > 0
                                ? "#d97706"
                                : "#94a3b8",
                            fontWeight:
                              800,
                            fontSize: 16,
                            border:
                              "1px solid #f1f5f9",
                          }}
                        >
                          {total}
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        type="button"
                        onClick={() =>
                          void openRatings(
                            captain,
                          )
                        }
                        style={{
                          marginTop: "auto",
                          width: "100%",
                          height: 44,
                          borderRadius: 13,
                          border:
                            "1px solid #bfdbfe",
                          background:
                            "#eff6ff",
                          color:
                            "#1d4ed8",
                          fontWeight: 800,
                          cursor:
                            "pointer",
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          gap: 8,
                        }}
                      >
                        <MessageSquare
                          size={16}
                        />
                        تفاصيل التقييمات
                      </button>
                    </article>
                  );
                },
              )}
            </section>

            {/* Captains pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "center",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 22,
                  flexWrap:
                    "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current -
                            1,
                        ),
                    )
                  }
                  disabled={
                    page === 1
                  }
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    border:
                      "1px solid #dbe3ef",
                    background:
                      page === 1
                        ? "#f8fafc"
                        : "#ffffff",
                    color:
                      page === 1
                        ? "#cbd5e1"
                        : "#334155",
                    cursor:
                      page === 1
                        ? "default"
                        : "pointer",
                  }}
                >
                  <ChevronRight
                    size={18}
                  />
                </button>

                {Array.from(
                  {
                    length:
                      totalPages,
                  },
                  (_, index) =>
                    index + 1,
                ).map(
                  (
                    pageNumber,
                  ) => (
                    <button
                      key={
                        pageNumber
                      }
                      type="button"
                      onClick={() =>
                        setPage(
                          pageNumber,
                        )
                      }
                      style={{
                        minWidth:
                          38,
                        height: 38,
                        borderRadius: 11,
                        border:
                          page ===
                          pageNumber
                            ? "1px solid #2563eb"
                            : "1px solid #dbe3ef",
                        background:
                          page ===
                          pageNumber
                            ? "#2563eb"
                            : "#ffffff",
                        color:
                          page ===
                          pageNumber
                            ? "#ffffff"
                            : "#334155",
                        fontWeight: 800,
                        cursor:
                          "pointer",
                      }}
                    >
                      {
                        pageNumber
                      }
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current +
                            1,
                        ),
                    )
                  }
                  disabled={
                    page ===
                    totalPages
                  }
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    border:
                      "1px solid #dbe3ef",
                    background:
                      page ===
                      totalPages
                        ? "#f8fafc"
                        : "#ffffff",
                    color:
                      page ===
                      totalPages
                        ? "#cbd5e1"
                        : "#334155",
                    cursor:
                      page ===
                      totalPages
                        ? "default"
                        : "pointer",
                  }}
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ratings Modal */}
      {selectedCaptain && (
        <div
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeRatings();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(15,23,42,.55)",
            backdropFilter:
              "blur(5px)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(980px,100%)",
              maxHeight: "90vh",
              overflow: "auto",
              background:
                "#ffffff",
              borderRadius: 22,
              border:
                "1px solid #e2e8f0",
              boxShadow:
                "0 28px 80px rgba(15,23,42,.25)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding:
                  "18px 20px",
                borderBottom:
                  "1px solid #edf1f6",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 12,
                position:
                  "sticky",
                top: 0,
                background:
                  "#ffffff",
                zIndex: 2,
              }}
            >
              <div>
                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 11,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      display:
                        "grid",
                      placeItems:
                        "center",
                      background:
                        "#eff6ff",
                      color:
                        "#2563eb",
                      fontWeight:
                        800,
                      fontSize:
                        17,
                    }}
                  >
                    {getInitial(
                      captainName(
                        selectedCaptain,
                      ),
                    )}
                  </div>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight:
                          800,
                        color:
                          "#0f172a",
                      }}
                    >
                      تقييمات{" "}
                      {
                        selectedCaptain.fullName ||
                        selectedCaptain.name ||
                        "الكابتن"
                      }
                    </h2>

                    <div
                      style={{
                        marginTop: 4,
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap: 7,
                        color:
                          "#64748b",
                        fontSize: 12,
                      }}
                    >
                      <RatingStars
                        value={
                          Number(
                            selectedCaptain.average ||
                              0,
                          )
                        }
                        size={14}
                      />

                      <span>
                        {formatAverage(
                          Number(
                            selectedCaptain.average ||
                              0,
                          ),
                        )}{" "}
                        ·{" "}
                        {formatNumber(
                          Number(
                            selectedCaptain.total ||
                              0,
                          ),
                        )}{" "}
                        تقييم
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeRatings
                }
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border:
                    "1px solid #dbe3ef",
                  background:
                    "#ffffff",
                  color:
                    "#475569",
                  cursor:
                    "pointer",
                  display:
                    "grid",
                  placeItems:
                    "center",
                }}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{
                padding: 20,
              }}
            >
              {modalLoading ? (
                <div
                  style={{
                    minHeight: 280,
                    display:
                      "grid",
                    placeItems:
                      "center",
                    color:
                      "#64748b",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      gap: 10,
                    }}
                  >
                    <Loader2
                      size={28}
                      className="spin"
                    />
                    <span>
                      جاري تحميل التقييمات...
                    </span>
                  </div>
                </div>
              ) : modalError ? (
                <div
                  style={{
                    background:
                      "#fff7f7",
                    border:
                      "1px solid #fecaca",
                    borderRadius:
                      16,
                    padding: 18,
                    color:
                      "#b91c1c",
                    fontWeight: 700,
                  }}
                >
                  {modalError}
                </div>
              ) : modalRatings.length === 0 ? (
                <div
                  style={{
                    minHeight: 240,
                    display:
                      "grid",
                    placeItems:
                      "center",
                    textAlign:
                      "center",
                    color:
                      "#64748b",
                  }}
                >
                  لا توجد تقييمات مسجلة
                  لهذا الكابتن حتى الآن.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2,minmax(0,1fr))",
                      gap: 14,
                    }}
                  >
                    {visibleModalRatings.map(
                      (rating) => {
                        const stars =
                          Number(
                            rating.stars ||
                              0,
                          );

                        return (
                          <article
                            key={
                              rating._id
                            }
                            style={{
                              border:
                                "1px solid #e5eaf2",
                              borderRadius:
                                17,
                              padding:
                                16,
                              background:
                                "#fbfdff",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "space-between",
                                gap: 10,
                                marginBottom:
                                  12,
                              }}
                            >
                              <div
                                style={{
                                  fontSize:
                                    12,
                                  fontWeight:
                                    800,
                                  color:
                                    "#1e293b",
                                  background:
                                    "#f1f5f9",
                                  border:
                                    "1px solid #e2e8f0",
                                  borderRadius:
                                    9,
                                  padding:
                                    "5px 8px",
                                }}
                              >
                                الطلب #
                                {rating.orderNumber ||
                                  rating.orderId ||
                                  "—"}
                              </div>

                              <span
                                style={{
                                  fontSize:
                                    11,
                                  color:
                                    "#94a3b8",
                                }}
                              >
                                {formatDate(
                                  rating.createdAt,
                                )}
                              </span>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 8,
                                marginBottom:
                                  10,
                                color:
                                  "#d97706",
                              }}
                            >
                              <RatingStars
                                value={
                                  stars
                                }
                                size={
                                  16
                                }
                              />

                              <strong
                                style={{
                                  color:
                                    "#0f172a",
                                  fontSize:
                                    14,
                                }}
                              >
                                {stars}
                                /5
                              </strong>
                            </div>

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                gap: 7,
                                marginBottom:
                                  10,
                                color:
                                  "#475569",
                                fontSize:
                                  13,
                                fontWeight:
                                  700,
                              }}
                            >
                              <Users
                                size={14}
                              />

                              <span>
                                {rating.restaurantName ||
                                  rating.establishmentName ||
                                  "المطعم / المحل"}
                              </span>
                            </div>

                            <div
                              style={{
                                minHeight:
                                  54,
                                borderRadius:
                                  12,
                                background:
                                  "#ffffff",
                                border:
                                  "1px solid #edf1f6",
                                padding:
                                  "10px 11px",
                                color:
                                  "#64748b",
                                fontSize:
                                  12,
                                lineHeight:
                                  1.8,
                              }}
                            >
                              {(
                                rating.comment ||
                                rating.review ||
                                ""
                              ).trim() ||
                                "بدون تعليق"}
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>

                  {modalTotalPages > 1 && (
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "center",
                        alignItems:
                          "center",
                        gap: 7,
                        marginTop:
                          20,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setModalPage(
                            (current) =>
                              Math.max(
                                1,
                                current -
                                  1,
                              ),
                          )
                        }
                        disabled={
                          modalPage ===
                          1
                        }
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          border:
                            "1px solid #dbe3ef",
                          background:
                            "#ffffff",
                          cursor:
                            modalPage ===
                            1
                              ? "default"
                              : "pointer",
                        }}
                      >
                        <ChevronRight
                          size={
                            18
                          }
                        />
                      </button>

                      {Array.from(
                        {
                          length:
                            modalTotalPages,
                        },
                        (_, index) =>
                          index + 1,
                      ).map(
                        (
                          pageNumber,
                        ) => (
                          <button
                            key={
                              pageNumber
                            }
                            type="button"
                            onClick={() =>
                              setModalPage(
                                pageNumber,
                              )
                            }
                            style={{
                              minWidth:
                                38,
                              height:
                                38,
                              borderRadius:
                                11,
                              border:
                                modalPage ===
                                pageNumber
                                  ? "1px solid #2563eb"
                                  : "1px solid #dbe3ef",
                              background:
                                modalPage ===
                                pageNumber
                                  ? "#2563eb"
                                  : "#ffffff",
                              color:
                                modalPage ===
                                pageNumber
                                  ? "#ffffff"
                                  : "#334155",
                              fontWeight:
                                800,
                              cursor:
                                "pointer",
                            }}
                          >
                            {
                              pageNumber
                            }
                          </button>
                        ),
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setModalPage(
                            (current) =>
                              Math.min(
                                modalTotalPages,
                                current +
                                  1,
                              ),
                          )
                        }
                        disabled={
                          modalPage ===
                          modalTotalPages
                        }
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 11,
                          border:
                            "1px solid #dbe3ef",
                          background:
                            "#ffffff",
                          cursor:
                            modalPage ===
                            modalTotalPages
                              ? "default"
                              : "pointer",
                        }}
                      >
                        <ChevronLeft
                          size={
                            18
                          }
                        />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
