import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  CheckSquare2,
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

function money(value: unknown) {
  const n = Number(value ?? 0);

  return new Intl.NumberFormat("ar-EG-u-nu-latn", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function dateText(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CashAccounting() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [captainId, setCaptainId] = useState("");

  const [from, setFrom] = useState("2020-01-01");
  const [to, setTo] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [data, setData] = useState<CashData | null>(null);

  const [loadingCaptains, setLoadingCaptains] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [clearingAll, setClearingAll] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [confirmClear, setConfirmClear] = useState<{
    ids: string[];
    title: string;
    description: string;
  } | null>(null);

  async function loadCaptains() {
    try {
      setLoadingCaptains(true);
      setError("");

      const response = await api.get("/captains");

      const rows = Array.isArray(
        response.data?.captains,
      )
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

  async function loadStatementByCaptainId(
    id: string,
  ) {
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
      setLoading(true);
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
      setLoading(false);
    }
  }

  async function loadStatement() {
    await loadStatementByCaptainId(captainId);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    const visibleIds = filteredCaptains.map(
      (captain) => captain._id,
    );

    if (visibleIds.length === 0) return;

    const allVisibleSelected = visibleIds.every(
      (id) => selectedIds.includes(id),
    );

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) => !visibleIds.includes(id),
        ),
      );

      return;
    }

    setSelectedIds((current) => [
      ...new Set([
        ...current,
        ...visibleIds,
      ]),
    ]);
  }

  async function clearStatements(
    ids: string[],
  ) {
    const uniqueIds = [
      ...new Set(ids.filter(Boolean)),
    ];

    if (uniqueIds.length === 0) {
      setError("اختر كابتنًا واحدًا على الأقل.");
      return;
    }

    const selectedCaptains = captains.filter(
      (captain) =>
        uniqueIds.includes(captain._id),
    );

    const names =
      selectedCaptains
        .slice(0, 5)
        .map(
          (captain) =>
            captain.fullName || "بدون اسم",
        )
        .join("، ") +
      (selectedCaptains.length > 5
        ? ` + ${selectedCaptains.length - 5} آخرين`
        : "");

    setConfirmClear({
      ids: uniqueIds,
      title:
        uniqueIds.length === 1
          ? "تصفير كشف حساب الكابتن"
          : "تصفير كشوف الحساب",
      description:
        `سيتم تصفير الكشف القديم لـ ${names || "الكباتن المحددين"}.
الطلبات نفسها لن يتم حذفها.`,
    });

      await api.post(
        "/captain-ledger/statements/reset",
        {
          captainIds: uniqueIds,
        },
      );

      setSelectedIds((current) =>
        current.filter(
          (id) => !uniqueIds.includes(id),
        ),
      );

      if (captainId && uniqueIds.includes(captainId)) {
        setData(null);
      }

      setMessage(
        `تم تصفير كشف الحساب لـ ${uniqueIds.length} كابتن.`,
      );

      if (
        captainId &&
        uniqueIds.includes(captainId)
      ) {
        await loadStatementByCaptainId(
          captainId,
        );
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
      setActionLoadingId("");
    }
  }

  async function clearAllStatements() {
    if (captains.length === 0) {
      setError("لا توجد قائمة كباتن.");
      return;
    }

    setConfirmClear({
      ids: captains.map(
        (captain) => captain._id,
      ),
      title: "تصفير كشوفات الجميع",
      description:
        `سيتم تصفير كشوف الحساب لجميع الكباتن وعددهم ${captains.length}.
الطلبات نفسها لن يتم حذفها.`,
    });

      await api.post(
        "/captain-ledger/statements/reset",
        {
          captainIds: captains.map(
            (captain) => captain._id,
          ),
        },
      );

      setSelectedIds([]);
      setData(null);

      setMessage(
        `تم تصفير كشوف الحساب لجميع الكباتن (${captains.length}).`,
      );
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تصفير كشوف الحساب للجميع.",
        ),
      );
    } finally {
      setClearingAll(false);
      setActionLoadingId("");
    }
  }

  async function confirmClearStatements() {
    if (!confirmClear) return;

    const ids = [...confirmClear.ids];

    setConfirmClear(null);

    try {
      setError("");
      setMessage("");

      if (ids.length === captains.length) {
        setClearingAll(true);
        setActionLoadingId("all");
      } else {
        setActionLoadingId(
          ids.length === 1 ? ids[0] : "bulk",
        );
      }

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

      if (captainId && ids.includes(captainId)) {
        setData(null);
      }

      setMessage(
        ids.length === captains.length
          ? `تم تصفير كشوف الحساب لجميع الكباتن (${ids.length}).`
          : `تم تصفير كشف الحساب لـ ${ids.length} كابتن.`,
      );

      if (captainId && ids.includes(captainId)) {
        await loadStatementByCaptainId(
          captainId,
        );
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
      setClearingAll(false);
      setActionLoadingId("");
    }
  }

  useEffect(() => {
    void loadCaptains();
  }, []);

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

  const visibleAllSelected =
    filteredCaptains.length > 0 &&
    filteredCaptains.every((captain) =>
      selectedIds.includes(captain._id),
    );

  const currentCaptain = captains.find(
    (captain) =>
      captain._id === captainId,
  );

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "#F8FAFC",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1250,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: 24,
            marginBottom: 18,
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
                width: 50,
                height: 50,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "#EFF6FF",
                color: "#2563EB",
                flexShrink: 0,
              }}
            >
              <Banknote size={26} />
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  color: "#0F172A",
                  fontWeight: 900,
                }}
              >
                كشف حساب الكباتن
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748B",
                }}
              >
                إدارة كشوف الحساب وعرض كشف كل كابتن
                وتصفير الكشوف القديمة بعد التسوية.
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
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              background: "#F0FDF4",
              color: "#166534",
              border: "1px solid #BBF7D0",
              borderRadius: 14,
              padding: 14,
              marginBottom: 18,
              fontWeight: 800,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
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
                gap: 10,
              }}
            >
              <Users size={21} />
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                    fontWeight: 900,
                  }}
                >
                  إدارة الكشوفات
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#64748B",
                    fontSize: 13,
                  }}
                >
                  حدد كباتن معيّنين للحذف أو صفّر
                  كشوف الجميع دفعة واحدة.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                void clearAllStatements()
              }
              disabled={
                clearingAll ||
                captains.length === 0
              }
              style={{
                minHeight: 44,
                padding: "0 16px",
                border: "1px solid #E87516",
                borderRadius: 12,
                background: "#E87516",
                color: "#FFFFFF",
                fontWeight: 900,
                cursor:
                  clearingAll ||
                  captains.length === 0
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {clearingAll ? (
                <>
                  <Loader2
                    size={18}
                    className="premium-spin"
                  />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  حذف كشوفات الجميع
                </>
              )}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 1.5fr) repeat(2, minmax(170px, 1fr)) auto",
              gap: 12,
              alignItems: "end",
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                }}
              >
                البحث عن الكباتن
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
                    right: 12,
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color: "#94A3B8",
                    pointerEvents: "none",
                  }}
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="اكتب اسم الكابتن أو الهاتف..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 44,
                    border:
                      "1px solid #CBD5E1",
                    borderRadius: 11,
                    padding:
                      "0 40px 0 12px",
                    outline: "none",
                  }}
                />
              </div>
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
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
                style={{
                  height: 44,
                  border:
                    "1px solid #CBD5E1",
                  borderRadius: 11,
                  padding: "0 12px",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
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
                style={{
                  height: 44,
                  border:
                    "1px solid #CBD5E1",
                  borderRadius: 11,
                  padding: "0 12px",
                }}
              />
            </label>

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
                height: 44,
                padding: "0 14px",
                border:
                  "1px solid #CBD5E1",
                borderRadius: 11,
                background: "#FFFFFF",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
              paddingTop: 16,
              borderTop:
                "1px solid #F1F5F9",
            }}
          >
            <div
              style={{
                color: "#64748B",
                fontSize: 13,
              }}
            >
              النتائج:{" "}
              <strong
                style={{
                  color: "#0F172A",
                }}
              >
                {filteredCaptains.length}
              </strong>
              {" "}كابتن — المحدد:{" "}
              <strong
                style={{
                  color: "#0F172A",
                }}
              >
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
                  minHeight: 40,
                  padding: "0 13px",
                  border:
                    "1px solid #CBD5E1",
                  borderRadius: 10,
                  background:
                    visibleAllSelected
                      ? "#FFF7ED"
                      : "#FFFFFF",
                  color:
                    visibleAllSelected
                      ? "#C2410C"
                      : "#0F172A",
                  fontWeight: 800,
                  cursor:
                    filteredCaptains.length ===
                    0
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <CheckSquare2 size={16} />
                {visibleAllSelected
                  ? "إلغاء تحديد النتائج"
                  : "تحديد نتائج البحث"}
              </button>

              <button
                type="button"
                onClick={() =>
                  void clearStatements(
                    selectedIds,
                  )
                }
                disabled={
                  selectedIds.length === 0 ||
                  actionLoadingId === "bulk"
                }
                style={{
                  minHeight: 40,
                  padding: "0 13px",
                  border:
                    "1px solid #FCA5A5",
                  borderRadius: 10,
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  fontWeight: 900,
                  cursor:
                    selectedIds.length === 0
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {actionLoadingId === "bulk" ? (
                  <Loader2
                    size={16}
                    className="premium-spin"
                  />
                ) : (
                  <Trash2 size={16} />
                )}
                حذف الكشوفات المحددة
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                قائمة الكباتن
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748B",
                  fontSize: 13,
                }}
              >
                لكل كابتن زر لعرض الكشف وزر لتصفير
                كشفه.
              </p>
            </div>

            {currentCaptain && (
              <div
                style={{
                  background: "#EFF6FF",
                  color: "#1D4ED8",
                  border:
                    "1px solid #BFDBFE",
                  borderRadius: 10,
                  padding:
                    "8px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                يتم عرض كشف:{" "}
                {currentCaptain.fullName ||
                  "بدون اسم"}
              </div>
            )}
          </div>

          {loadingCaptains ? (
            <div
              style={{
                minHeight: 160,
                display: "grid",
                placeItems: "center",
                color: "#64748B",
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
                />
                جاري تحميل الكباتن...
              </div>
            </div>
          ) : filteredCaptains.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748B",
                border:
                  "1px dashed #CBD5E1",
                borderRadius: 14,
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
                    actionLoadingId ===
                    captain._id;

                  const isCurrent =
                    captainId ===
                    captain._id;

                  return (
                    <div
                      key={captain._id}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "auto minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: 14,
                        padding: 14,
                        border:
                          isCurrent
                            ? "2px solid #2563EB"
                            : selected
                              ? "1px solid #93C5FD"
                              : "1px solid #E2E8F0",
                        borderRadius: 14,
                        background:
                          isCurrent
                            ? "#FFF7ED"
                            : selected
                              ? "#F8FBFF"
                              : "#FFFFFF",
                      }}
                    >
                      <button
                        type="button"
                        aria-label={
                          selected
                            ? "إلغاء تحديد الكابتن"
                            : "تحديد الكابتن"
                        }
                        onClick={() =>
                          toggleSelected(
                            captain._id,
                          )
                        }
                        style={{
                          width: 25,
                          height: 25,
                          borderRadius: 7,
                          border:
                            selected
                              ? "2px solid #2563EB"
                              : "1px solid #CBD5E1",
                          background:
                            selected
                              ? "#2563EB"
                              : "#FFFFFF",
                          color: "#FFFFFF",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        {selected ? "✓" : ""}
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
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background:
                              "#F1F5F9",
                            color: "#475569",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <UserRound
                            size={20}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              color: "#0F172A",
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {captain.fullName ||
                              "بدون اسم"}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              color: "#64748B",
                              fontSize: 13,
                              direction: "ltr",
                              textAlign: "right",
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
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          justifyContent:
                            "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void loadStatementByCaptainId(
                              captain._id,
                            )
                          }
                          disabled={
                            loading ||
                            busy
                          }
                          style={{
                            minHeight: 40,
                            padding:
                              "0 13px",
                            border: 0,
                            borderRadius: 10,
                            background:
                              "#2563EB",
                            color:
                              "#FFFFFF",
                            fontWeight: 900,
                            cursor:
                              loading ||
                              busy
                                ? "not-allowed"
                                : "pointer",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 7,
                          }}
                        >
                          {loading &&
                          isCurrent ? (
                            <Loader2
                              size={16}
                              className="premium-spin"
                            />
                          ) : (
                            <Eye
                              size={16}
                            />
                          )}
                          عرض كشف الحساب
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void clearStatements([
                              captain._id,
                            ])
                          }
                          disabled={busy}
                          style={{
                            minHeight: 40,
                            padding:
                              "0 13px",
                            border:
                              "1px solid #FCA5A5",
                            borderRadius: 10,
                            background:
                              "#FEF2F2",
                            color:
                              "#B91C1C",
                            fontWeight: 900,
                            cursor:
                              busy
                                ? "not-allowed"
                                : "pointer",
                            display:
                              "flex",
                            alignItems:
                              "center",
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
                          حذف الكشف
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Calculator size={21} />

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                كشف الحساب
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748B",
                  fontSize: 13,
                }}
              >
                {currentCaptain
                  ? `الفترة من ${from} إلى ${to} — ${currentCaptain.fullName || "بدون اسم"}`
                  : "اختر كابتنًا من القائمة لعرض كشفه."}
              </p>
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
                  marginRight: "auto",
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border:
                    "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="إغلاق الكشف"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {loading && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#64748B",
              }}
            >
              <Loader2
                size={29}
                className="premium-spin"
              />

              <div
                style={{
                  marginTop: 9,
                  fontWeight: 700,
                }}
              >
                جاري تحميل كشف الحساب...
              </div>
            </div>
          )}

          {!loading && !captainId && (
            <div
              style={{
                padding: 45,
                textAlign: "center",
                color: "#64748B",
                border:
                  "1px dashed #CBD5E1",
                borderRadius: 14,
              }}
            >
              اضغط «عرض كشف الحساب» بجانب أي
              كابتن.
            </div>
          )}

          {!loading &&
            captainId &&
            data && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(180px,1fr))",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  {[
                    [
                      "عدد الطلبات",
                      data.numberOfOrders ??
                        data.orders ??
                        data.completedOrders
                          ?.length ??
                        0,
                    ],
                    [
                      "المحصل من الزبائن",
                      money(
                        data.collectedFromCustomers,
                      ),
                    ],
                    [
                      "المدفوع للمحل",
                      money(
                        data.paidToEstablishments,
                      ),
                    ],
                    [
                      "أجور التوصيل",
                      money(
                        data.deliveryFees,
                      ),
                    ],
                    [
                      "فرق الكاش",
                      money(
                        data.cashDifference,
                      ),
                    ],
                  ].map(
                    ([title, value]) => (
                      <div
                        key={String(title)}
                        style={{
                          background:
                            "#F8FAFC",
                          border:
                            "1px solid #E2E8F0",
                          borderRadius: 14,
                          padding: 17,
                        }}
                      >
                        <div
                          style={{
                            color: "#64748B",
                            fontSize: 13,
                            marginBottom: 7,
                          }}
                        >
                          {title}
                        </div>

                        <strong
                          style={{
                            fontSize: 22,
                            color: "#0F172A",
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
                      "1px solid #E2E8F0",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      borderBottom:
                        "1px solid #E2E8F0",
                      fontWeight: 900,
                    }}
                  >
                    تفاصيل الطلبات المكتملة
                  </div>

                  {Array.isArray(
                    data.completedOrders,
                  ) &&
                  data.completedOrders.length >
                    0 ? (
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
                                    textAlign:
                                      "right",
                                    padding: 12,
                                    background:
                                      "#F8FAFC",
                                    borderBottom:
                                      "1px solid #E2E8F0",
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
                                    padding:
                                      12,
                                    borderBottom:
                                      "1px solid #F1F5F9",
                                    fontWeight:
                                      900,
                                  }}
                                >
                                  #
                                  {order.orderNumber ||
                                    order.orderId ||
                                    "—"}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      12,
                                    borderBottom:
                                      "1px solid #F1F5F9",
                                  }}
                                >
                                  {dateText(
                                    order.completedAt,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      12,
                                    borderBottom:
                                      "1px solid #F1F5F9",
                                  }}
                                >
                                  {money(
                                    order.orderValue,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      12,
                                    borderBottom:
                                      "1px solid #F1F5F9",
                                  }}
                                >
                                  {money(
                                    order.deliveryFee,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      12,
                                    borderBottom:
                                      "1px solid #F1F5F9",
                                  }}
                                >
                                  {money(
                                    order.collectedFromCustomer,
                                  )}
                                </td>

                                <td
                                  style={{
                                    padding:
                                      12,
                                    borderBottom:
                                      "1px solid #F1F5F9",
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
                        padding: 32,
                        textAlign:
                          "center",
                        color: "#64748B",
                      }}
                    >
                      لا توجد طلبات مكتملة في
                      هذه الفترة.
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      </div>

      {confirmClear && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200000,
            background:
              "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            boxSizing: "border-box",
          }}
          onClick={() => {
            if (!actionLoadingId) {
              setConfirmClear(null);
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
              maxWidth: 460,
              background: "#FFFFFF",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow:
                "0 24px 70px rgba(15,23,42,.28)",
              direction: "rtl",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg,#E87516,#F59E0B)",
                color: "#FFFFFF",
                padding: 22,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background:
                    "rgba(255,255,255,.18)",
                  display: "grid",
                  placeItems: "center",
                  marginBottom: 12,
                }}
              >
                <AlertTriangle size={24} />
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 21,
                  fontWeight: 900,
                }}
              >
                {confirmClear.title}
              </h3>
            </div>

            <div style={{ padding: 22 }}>
              <p
                style={{
                  margin: 0,
                  color: "#334155",
                  lineHeight: 1.9,
                  whiteSpace: "pre-line",
                }}
              >
                {confirmClear.description}
              </p>

              <div
                style={{
                  marginTop: 16,
                  padding: 13,
                  borderRadius: 12,
                  background: "#FFF7ED",
                  border:
                    "1px solid #FED7AA",
                  color: "#9A3412",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                ملاحظة: التصفير لا يحذف الطلبات
                أو بياناتها، وإنما يبدأ كشفًا جديدًا
                بعد التسوية.
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
                  onClick={() =>
                    setConfirmClear(null)
                  }
                  disabled={Boolean(
                    actionLoadingId,
                  )}
                  style={{
                    minHeight: 46,
                    border:
                      "1px solid #CBD5E1",
                    borderRadius: 12,
                    background: "#FFFFFF",
                    color: "#334155",
                    fontWeight: 900,
                    cursor:
                      actionLoadingId
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void confirmClearStatements()
                  }
                  disabled={Boolean(
                    actionLoadingId,
                  )}
                  style={{
                    minHeight: 46,
                    border: 0,
                    borderRadius: 12,
                    background: "#E87516",
                    color: "#FFFFFF",
                    fontWeight: 900,
                    cursor:
                      actionLoadingId
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {actionLoadingId ? (
                    <>
                      <Loader2
                        size={17}
                        className="premium-spin"
                      />
                      جارٍ التصفير...
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
