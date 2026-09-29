import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  Check,
  CheckSquare,
  ChevronDown,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type Captain = {
  _id: string;
  fullName?: string;
  phone?: string;
};

type StatementOrder = {
  orderId?: string;
  orderNumber?: string;
  completedAt?: string | null;
  orderValue?: number;
  deliveryFee?: number;
  collectedFromCustomer?: number;
  paidToEstablishment?: number;
};

type CashData = {
  numberOfOrders?: number;
  orders?: number;
  paidToEstablishments?: number;
  collectedFromCustomers?: number;
  deliveryFees?: number;
  cashDifference?: number;
  completedOrders?: StatementOrder[];
};

type ConfirmState = {
  ids: string[];
  title: string;
  text: string;
};

function money(value: unknown) {
  const n = Number(value ?? 0);

  return new Intl.NumberFormat("ar-EG-u-nu-latn", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function dateText(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const orange = "#E87516";
const orangeDark = "#C2410C";
const orangeSoft = "#FFF7ED";
const orangeBorder = "#FED7AA";
const text = "#1F2937";
const muted = "#6B7280";
const border = "#E5E7EB";
const surface = "#FFFFFF";
const page = "#FFFDFC";

const styles = {
  card: {
    background: surface,
    border: `1px solid ${border}`,
    borderRadius: 22,
    boxShadow: "0 10px 30px rgba(15,23,42,.05)",
  } as const,

  orangeButton: {
    border: 0,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${orange}, #F59E0B)`,
    color: "#FFFFFF",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 7px 18px rgba(232,117,22,.16)",
  } as const,

  outlineButton: {
    border: `1px solid ${orangeBorder}`,
    borderRadius: 12,
    background: "#FFF9F4",
    color: orangeDark,
    fontWeight: 900,
    cursor: "pointer",
  } as const,

  input: {
    height: 46,
    width: "100%",
    boxSizing: "border-box" as const,
    border: `1px solid ${orangeBorder}`,
    borderRadius: 12,
    background: "#FFFFFF",
    padding: "0 13px",
    outline: "none",
    color: text,
    fontSize: 14,
  } as const,
};

export default function CashAccounting() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [captainId, setCaptainId] = useState("");
  const [from, setFrom] = useState("2020-01-01");
  const [to, setTo] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [data, setData] = useState<CashData | null>(null);

  const [loadingCaptains, setLoadingCaptains] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [confirmState, setConfirmState] =
    useState<ConfirmState | null>(null);

  async function loadCaptains() {
    try {
      setLoadingCaptains(true);
      setError("");

      const response = await api.get("/captains");

      const rows = Array.isArray(response.data?.captains)
        ? response.data.captains
        : [];

      setCaptains(rows);
    } catch (err) {
      console.error(err);
      setCaptains([]);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل قائمة الكباتن.",
        ),
      );
    } finally {
      setLoadingCaptains(false);
    }
  }

  async function loadStatement(id: string) {
    if (!id) {
      setError("اختر الكابتن أولًا.");
      return;
    }

    if (from > to) {
      setError(
        "تاريخ البداية يجب أن يكون قبل تاريخ النهاية.",
      );
      return;
    }

    try {
      setLoadingStatement(true);
      setError("");
      setMessage("");
      setCaptainId(id);

      const response = await api.get(
        `/completion/cash/${encodeURIComponent(id)}`,
        {
          params: {
            from,
            to,
          },
        },
      );

      setData(response.data ?? null);
    } catch (err) {
      console.error(err);
      setData(null);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل كشف حساب الكابتن.",
        ),
      );
    } finally {
      setLoadingStatement(false);
    }
  }

  function requestReset(ids: string[]) {
    const uniqueIds = [
      ...new Set(ids.filter(Boolean)),
    ];

    if (uniqueIds.length === 0) {
      setError("حدد كابتنًا واحدًا على الأقل.");
      return;
    }

    const names = captains
      .filter((captain) =>
        uniqueIds.includes(captain._id),
      )
      .slice(0, 4)
      .map(
        (captain) =>
          captain.fullName || "بدون اسم",
      );

    const extra =
      uniqueIds.length > 4
        ? ` + ${uniqueIds.length - 4} آخرين`
        : "";

    setConfirmState({
      ids: uniqueIds,
      title:
        uniqueIds.length === captains.length
          ? "تصفير كشوفات الجميع"
          : uniqueIds.length === 1
            ? "تصفير كشف الكابتن"
            : "تصفير الكشوفات المحددة",
      text:
        `${names.join("، ")}${extra}\n\nسيتم تصفير الجزء القديم من الكشف فقط، ولن يتم حذف الطلبات نفسها.`,
    });
  }

  async function executeReset() {
    if (!confirmState) return;

    const ids = [...confirmState.ids];
    const isAll =
      captains.length > 0 &&
      ids.length === captains.length;

    setConfirmState(null);
    setError("");
    setMessage("");
    setActionId(isAll ? "all" : ids.length === 1 ? ids[0] : "bulk");

    try {
      await api.post(
        "/captain-ledger/statements/reset",
        {
          captainIds: ids,
        },
      );

      setSelectedIds((current) =>
        current.filter(
          (id) => !ids.includes(id),
        ),
      );

      setMessage(
        isAll
          ? `تم تصفير كشوف جميع الكباتن (${ids.length}).`
          : `تم تصفير كشف ${ids.length} كابتن.`,
      );

      if (
        captainId &&
        ids.includes(captainId)
      ) {
        await loadStatement(captainId);
      }
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تصفير كشوف الحساب.",
        ),
      );
    } finally {
      setActionId("");
    }
  }

  function toggleCaptain(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const filteredCaptains = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return captains;

    return captains.filter((captain) => {
      const name = (
        captain.fullName || ""
      ).toLowerCase();

      const phone = (
        captain.phone || ""
      ).toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q)
      );
    });
  }, [captains, search]);

  const allVisibleSelected =
    filteredCaptains.length > 0 &&
    filteredCaptains.every((captain) =>
      selectedIds.includes(captain._id),
    );

  function toggleAllVisible() {
    const ids = filteredCaptains.map(
      (captain) => captain._id,
    );

    if (ids.length === 0) return;

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) => !ids.includes(id),
        ),
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([...current, ...ids]),
    ]);
  }

  const currentCaptain = captains.find(
    (captain) =>
      captain._id === captainId,
  );

  const summary = [
    [
      "عدد الطلبات",
      data?.numberOfOrders ??
        data?.orders ??
        data?.completedOrders?.length ??
        0,
  ],
    [
      "المحصل من الزبائن",
      money(data?.collectedFromCustomers),
    ],
    [
      "المدفوع للمحل",
      money(data?.paidToEstablishments),
    ],
    [
      "أجور التوصيل",
      money(data?.deliveryFees),
    ],
    [
      "فرق الكاش",
      money(data?.cashDifference),
    ],
  ];

  useEffect(() => {
    void loadCaptains();
  }, []);

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: page,
        padding: 22,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <section
          style={{
            ...styles.card,
            padding: 24,
            marginBottom: 18,
            background:
              "linear-gradient(135deg,#FFFFFF 0%,#FFF7EF 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 11px",
                  borderRadius: 999,
                  background: orangeSoft,
                  border: `1px solid ${orangeBorder}`,
                  color: orangeDark,
                  fontWeight: 900,
                  fontSize: 12,
                  marginBottom: 11,
                }}
              >
                <Banknote size={15} />
                الحسابات والكاش
              </div>

              <h1
                style={{
                  margin: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "11px 17px",
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg,#E87516,#F59E0B)",
                  color: "#FFFFFF",
                  fontSize: 25,
                  fontWeight: 950,
                  boxShadow:
                    "0 9px 22px rgba(232,117,22,.18)",
                }}
              >
                كشف حساب الكباتن
              </h1>

              <p
                style={{
                  margin: "11px 0 0",
                  color: muted,
                  fontSize: 14,
                }}
              >
                عرض كشف أي كابتن وتصفير الكشوف
                القديمة بعد التسوية.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedIds([]);
                setCaptainId("");
                setData(null);
                setError("");
                setMessage("");
                void loadCaptains();
              }}
              style={{
                ...styles.outlineButton,
                minHeight: 44,
                padding: "0 15px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <RefreshCw size={17} />
              تحديث البيانات
            </button>
          </div>
        </section>

        {/* MESSAGES */}
        {error && (
          <div
            style={{
              padding: 14,
              marginBottom: 16,
              borderRadius: 14,
              background: "#FFF1F2",
              border: "1px solid #FECDD3",
              color: "#BE123C",
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: 14,
              marginBottom: 16,
              borderRadius: 14,
              background: "#FFF7ED",
              border: `1px solid ${orangeBorder}`,
              color: orangeDark,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={18} />
            {message}
          </div>
        )}

        {/* MANAGEMENT */}
        <section
          style={{
            ...styles.card,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: orangeSoft,
                  color: orange,
                  display: "grid",
                  placeItems: "center",
                  border: `1px solid ${orangeBorder}`,
                }}
              >
                <Users size={20} />
              </div>

              <div>
                <h2
                  style={{
                    margin: 0,
                    display: "inline-flex",
                    padding: "8px 13px",
                    borderRadius: 11,
                    background: "#FFF1E4",
                    color: orangeDark,
                    border: `1px solid ${orangeBorder}`,
                    fontSize: 17,
                    fontWeight: 950,
                  }}
                >
                  إدارة الكشوفات
                </h2>

                <div
                  style={{
                    marginTop: 6,
                    color: muted,
                    fontSize: 13,
                  }}
                >
                  حدّد عدة كباتن أو صفّر كشوف الجميع.
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={
                captains.length === 0 ||
                actionId === "all"
              }
              onClick={() =>
                requestReset(
                  captains.map(
                    (captain) =>
                      captain._id,
                  ),
                )
              }
              style={{
                ...styles.orangeButton,
                minHeight: 45,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {actionId === "all" ? (
                <Loader2
                  size={17}
                  className="premium-spin"
                />
              ) : (
                <Trash2 size={17} />
              )}
              تصفير كشوفات الجميع
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(260px,1.6fr) minmax(150px,1fr) minmax(150px,1fr)",
              gap: 12,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontWeight: 900,
                  color: text,
                }}
              >
                البحث عن كابتن
              </span>

              <div
                style={{
                  position: "relative",
                }}
              >
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    right: 13,
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color: orange,
                    pointerEvents: "none",
                  }}
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="اكتب الاسم أو رقم الهاتف..."
                  style={{
                    ...styles.input,
                    paddingRight: 42,
                  }}
                />
              </div>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontWeight: 900,
                  color: text,
                }}
              >
                من
              </span>

              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setData(null);
                }}
                style={styles.input}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontWeight: 900,
                  color: text,
                }}
              >
                إلى
              </span>

              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setData(null);
                }}
                style={styles.input}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 15,
              borderTop: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: muted,
                fontSize: 13,
              }}
            >
              النتائج:{" "}
              <strong style={{ color: orangeDark }}>
                {filteredCaptains.length}
              </strong>
              {" "}كابتن — المحدد:{" "}
              <strong style={{ color: orangeDark }}>
                {selectedIds.length}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={
                  filteredCaptains.length === 0
                }
                style={{
                  ...styles.outlineButton,
                  minHeight: 40,
                  padding: "0 13px",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {allVisibleSelected ? (
                  <CheckSquare size={16} />
                ) : (
                  <SquareIcon />
                )}
                {allVisibleSelected
                  ? "إلغاء تحديد النتائج"
                  : "تحديد النتائج"}
              </button>

              <button
                type="button"
                onClick={() =>
                  requestReset(selectedIds)
                }
                disabled={
                  selectedIds.length === 0 ||
                  actionId === "bulk"
                }
                style={{
                  ...styles.orangeButton,
                  minHeight: 40,
                  padding: "0 13px",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {actionId === "bulk" ? (
                  <Loader2
                    size={16}
                    className="premium-spin"
                  />
                ) : (
                  <Trash2 size={16} />
                )}
                تصفير المحدد
              </button>
            </div>
          </div>
        </section>

        {/* CAPTAINS */}
        <section
          style={{
            ...styles.card,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 15,
            }}
          >
            <div
              style={{
                padding: "8px 13px",
                borderRadius: 11,
                background: "#FFF1E4",
                color: orangeDark,
                border: `1px solid ${orangeBorder}`,
                fontWeight: 950,
                fontSize: 17,
              }}
            >
              قائمة الكباتن
            </div>
          </div>

          {loadingCaptains ? (
            <div
              style={{
                minHeight: 180,
                display: "grid",
                placeItems: "center",
                color: muted,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <Loader2
                  size={24}
                  className="premium-spin"
                  color={orange}
                />
                جاري تحميل الكباتن...
              </div>
            </div>
          ) : filteredCaptains.length === 0 ? (
            <div
              style={{
                padding: 45,
                textAlign: "center",
                color: muted,
                background: "#FFFDFC",
                border: `1px dashed ${orangeBorder}`,
                borderRadius: 15,
              }}
            >
              لا توجد نتائج مطابقة للبحث.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              {filteredCaptains.map(
                (captain) => {
                  const selected =
                    selectedIds.includes(
                      captain._id,
                    );

                  const busy =
                    actionId ===
                    captain._id;

                  const current =
                    captainId ===
                    captain._id;

                  return (
                    <div
                      key={captain._id}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "auto minmax(0,1fr) auto",
                        alignItems: "center",
                        gap: 13,
                        padding: 13,
                        border: current
                          ? `2px solid ${orange}`
                          : selected
                            ? `1px solid ${orangeBorder}`
                            : `1px solid ${border}`,
                        borderRadius: 16,
                        background: current
                          ? "#FFF9F4"
                          : selected
                            ? "#FFFCF8"
                            : "#FFFFFF",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          toggleCaptain(
                            captain._id,
                          )
                        }
                        style={{
                          width: 27,
                          height: 27,
                          borderRadius: 8,
                          border: selected
                            ? `2px solid ${orange}`
                            : `1px solid #D1D5DB`,
                          background:
                            selected
                              ? orange
                              : "#FFFFFF",
                          color: "#FFFFFF",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        aria-label="تحديد الكابتن"
                      >
                        {selected && (
                          <Check size={16} />
                        )}
                      </button>

                      <div
                        style={{
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 13,
                            background: orangeSoft,
                            color: orange,
                            border: `1px solid ${orangeBorder}`,
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <UserRound size={20} />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 950,
                              color: text,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {captain.fullName ||
                              "بدون اسم"}
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              color: muted,
                              fontSize: 13,
                            }}
                          >
                            {captain.phone ||
                              "بدون هاتف"}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          disabled={
                            loadingStatement ||
                            busy
                          }
                          onClick={() =>
                            void loadStatement(
                              captain._id,
                            )
                          }
                          style={{
                            ...styles.orangeButton,
                            minHeight: 40,
                            padding: "0 13px",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          {loadingStatement &&
                          current ? (
                            <Loader2
                              size={16}
                              className="premium-spin"
                            />
                          ) : (
                            <Eye size={16} />
                          )}
                          عرض كشف الحساب
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            requestReset([
                              captain._id,
                            ])
                          }
                          style={{
                            ...styles.outlineButton,
                            minHeight: 40,
                            padding: "0 13px",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          {busy ? (
                            <Loader2
                              size={16}
                              className="premium-spin"
                            />
                          ) : (
                            <Trash2
                              size={16}
                            />
                          )}
                          تصفير الكشف
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* STATEMENT */}
        <section
          style={{
            ...styles.card,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 13px",
                  borderRadius: 11,
                  background: "#FFF1E4",
                  color: orangeDark,
                  border: `1px solid ${orangeBorder}`,
                  fontSize: 17,
                  fontWeight: 950,
                }}
              >
                <Calculator size={18} />
                كشف الحساب
              </div>

              {currentCaptain && (
                <div
                  style={{
                    marginTop: 8,
                    color: muted,
                    fontSize: 13,
                  }}
                >
                  {currentCaptain.fullName ||
                    "بدون اسم"}{" "}
                  — من {from} إلى {to}
                </div>
              )}
            </div>

            {captainId && (
              <button
                type="button"
                onClick={() => {
                  setCaptainId("");
                  setData(null);
                  setError("");
                  setMessage("");
                }}
                style={{
                  ...styles.outlineButton,
                  width: 38,
                  height: 38,
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="إغلاق الكشف"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {!captainId && (
            <div
              style={{
                padding: 45,
                textAlign: "center",
                color: muted,
                background: "#FFFDFC",
                border: `1px dashed ${orangeBorder}`,
                borderRadius: 15,
              }}
            >
              اختر كابتنًا من القائمة لعرض كشف الحساب.
            </div>
          )}

          {loadingStatement && (
            <div
              style={{
                padding: 45,
                textAlign: "center",
                color: muted,
              }}
            >
              <Loader2
                size={29}
                className="premium-spin"
                color={orange}
              />
              <div style={{ marginTop: 9 }}>
                جاري تحميل كشف الحساب...
              </div>
            </div>
          )}

          {!loadingStatement &&
            captainId &&
            data && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 11,
                    marginBottom: 18,
                  }}
                >
                  {summary.map(
                    ([title, value]) => (
                      <div
                        key={String(title)}
                        style={{
                          padding: 16,
                          borderRadius: 15,
                          background:
                            "#FFFDFC",
                          border:
                            `1px solid ${orangeBorder}`,
                        }}
                      >
                        <div
                          style={{
                            color: muted,
                            fontSize: 12,
                            marginBottom: 7,
                          }}
                        >
                          {title}
                        </div>

                        <strong
                          style={{
                            color: orangeDark,
                            fontSize: 22,
                          }}
                        >
                          {value}
                        </strong>
                      </div>
                    ),
                  )}
                </div>

                <div
                  style={{
                    border:
                      `1px solid ${border}`,
                    borderRadius: 15,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: 15,
                      background:
                        orangeSoft,
                      color: orangeDark,
                      fontWeight: 950,
                    }}
                  >
                    تفاصيل الطلبات المكتملة
                  </div>

                  {Array.isArray(
                    data.completedOrders,
                  ) &&
                  data.completedOrders.length > 0 ? (
                    <div
                      style={{
                        overflowX:
                          "auto",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          minWidth: 850,
                          borderCollapse:
                            "collapse",
                        }}
                      >
                        <thead>
                          <tr>
                            {[
                              "الطلب",
                              "وقت الإكمال",
                              "قيمة الطلب",
                              "أجرة التوصيل",
                              "المحصل",
                              "المدفوع للمحل",
                            ].map(
                              (title) => (
                                <th
                                  key={title}
                                  style={{
                                    padding: 12,
                                    textAlign:
                                      "right",
                                    background:
                                      "#FFFCF8",
                                    borderBottom:
                                      `1px solid ${border}`,
                                    color:
                                      orangeDark,
                                    fontSize:
                                      13,
                                  }}
                                >
                                  {title}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {data.completedOrders.map(
                            (
                              order,
                              index,
                            ) => (
                              <tr
                                key={
                                  order.orderId ||
                                  `${order.orderNumber}-${index}`
                                }
                              >
                                <td
                                  style={{
                                    padding: 12,
                                    borderBottom:
                                      `1px solid ${border}`,
                                    fontWeight: 900,
                                  }}
                                >
                                  #
                                  {order.orderNumber ||
                                    order.orderId ||
                                    "—"}
                                </td>

                                <td
                                  style={{
                                    padding: 12,
                                    borderBottom:
                                      `1px solid ${border}`,
                                  }}
                                >
                                  {dateText(
                                    order.completedAt,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding: 12,
                                    borderBottom:
                                      `1px solid ${border}`,
                                  }}
                                >
                                  {money(
                                    order.orderValue,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding: 12,
                                    borderBottom:
                                      `1px solid ${border}`,
                                  }}
                                >
                                  {money(
                                    order.deliveryFee,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding: 12,
                                    borderBottom:
                                      `1px solid ${border}`,
                                  }}
                                >
                                  {money(
                                    order.collectedFromCustomer,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding: 12,
                                    borderBottom:
                                      `1px solid ${border}`,
                                  }}
                                >
                                  {money(
                                    order.paidToEstablishment,
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 34,
                        textAlign: "center",
                        color: muted,
                      }}
                    >
                      لا توجد طلبات مكتملة في هذه الفترة.
                    </div>
                  )}
                </div>
              </>
            )}
        </section>
      </div>

      {/* CONFIRM MODAL */}
      {confirmState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background:
              "rgba(31,41,55,.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            boxSizing: "border-box",
          }}
          onClick={() => {
            if (!actionId) {
              setConfirmState(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 470,
              background: "#FFFFFF",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow:
                "0 30px 90px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                padding: 22,
                background:
                  "linear-gradient(135deg,#E87516,#F59E0B)",
                color: "#FFFFFF",
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  background:
                    "rgba(255,255,255,.18)",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 12,
                }}
              >
                <AlertTriangle size={25} />
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 21,
                  fontWeight: 950,
                }}
              >
                {confirmState.title}
              </h3>
            </div>

            <div
              style={{
                padding: 22,
              }}
            >
              <div
                style={{
                  whiteSpace: "pre-line",
                  color: text,
                  lineHeight: 1.9,
                }}
              >
                {confirmState.text}
              </div>

              <div
                style={{
                  marginTop: 15,
                  padding: 13,
                  borderRadius: 12,
                  background: orangeSoft,
                  border:
                    `1px solid ${orangeBorder}`,
                  color: orangeDark,
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.8,
                }}
              >
                سيتم اعتبار الكشف القديم تمت تسويته،
                وسيبدأ احتساب الكشف الجديد من بعد
                التصفير. الطلبات الأصلية لا تُحذف.
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  disabled={Boolean(actionId)}
                  onClick={() =>
                    setConfirmState(null)
                  }
                  style={{
                    height: 47,
                    border:
                      `1px solid ${border}`,
                    borderRadius: 12,
                    background: "#FFFFFF",
                    color: text,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={Boolean(actionId)}
                  onClick={() =>
                    void executeReset()
                  }
                  style={{
                    height: 47,
                    border: 0,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg,#E87516,#F59E0B)",
                    color: "#FFFFFF",
                    fontWeight: 950,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                >
                  {actionId ? (
                    <>
                      <Loader2
                        size={17}
                        className="premium-spin"
                      />
                      جاري التصفير...
                    </>
                  ) : (
                    <>
                      <Trash2 size={17} />
                      نعم، صفّر الكشف
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SquareIcon() {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: "1px solid #D1D5DB",
        display: "inline-block",
        boxSizing: "border-box",
      }}
    />
  );
}
