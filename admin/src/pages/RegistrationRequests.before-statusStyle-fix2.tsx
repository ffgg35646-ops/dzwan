
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileImage,
  Loader2,
  MapPin,
  MapPinned,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Store,
  Clock3,
  UserRound,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";

type Status = "pending" | "approved" | "rejected";
type Tab = "captains" | "establishments";
type LocationRef = string | { _id: string; name: string };

interface CaptainRegistration {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  gmail: string;
  governorateId: LocationRef;
  areaId: LocationRef;
  idFrontUrl: string;
  idBackUrl: string;
  residenceFrontUrl: string;
  residenceBackUrl: string;
  status: Status;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  currentShift?: {
    _id?: string;
    name?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  completedOrders?: number;
  cancelledOrders?: number;
}

interface EstablishmentRegistration {
  _id: string;
  name: string;
  type: "restaurant" | "shop";
  phone: string;
  email?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  ownerFullName: string;
  ownerPhone: string;
  gmail: string;
  governorateId: LocationRef;
  areaId: LocationRef;
  status: Status;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

function repairArabicText(value: string) {
  const input = String(value ?? "");

  if (!input) return "—";

  // إصلاح UTF-8 الذي وصل كنص Latin-1 / Windows-1252.
  try {
    if (/[ÃÂØÙÚÛÑÐ]/.test(input)) {
      const bytes = new Uint8Array(
        Array.from(input, (char) => char.charCodeAt(0) & 0xff),
      );

      const repaired = new TextDecoder("utf-8").decode(bytes);

      if (repaired && !repaired.includes("\ufffd")) {
        return repaired;
      }
    }
  } catch {}

  return input;
}

function loc(v: LocationRef) {
  if (typeof v === "object") {
    return repairArabicText(v.name);
  }

  return repairArabicText(String(v || "—"));
}

function date(v?: string | null) {
  return v
    ? new Date(v).toLocaleString("ar-EG-u-nu-latn", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}

function statusText(v: Status) {
  return v === "pending"
    ? "قيد المراجعة"
    : v === "approved"
      ? "مقبول"
      : "مرفوض";
}

export default function RegistrationRequests() {
  const [captains, setCaptains] = useState<CaptainRegistration[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentRegistration[]>([]);
  const [tab, setTab] = useState<Tab>("captains");
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [documentPreview, setDocumentPreview] = useState<{
    label: string;
    url: string;
  } | null>(null);

  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentError, setDocumentError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [c, e] = await Promise.all([
        api.get("/captain-registration"),
        api.get("/establishment-registration"),
      ]);

      setCaptains(Array.isArray(c.data?.registrations) ? c.data.registrations : []);
      setEstablishments(
        Array.isArray(e.data?.registrations) ? e.data.registrations : [],
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "تعذر تحميل طلبات التسجيل."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDocument(label: string, sourceUrl: string) {
    const rawUrl = String(sourceUrl || "").trim();

    if (!rawUrl) {
      setDocumentError("رابط الصورة غير موجود.");
      return;
    }

    try {
      setDocumentError("");
      setDocumentPreview(null);
      setDocumentLoading(true);

      let documentUrl = rawUrl;

      if (!/^https?:\/\//i.test(rawUrl)) {
        const configuredApi = String(
          import.meta.env.VITE_API_URL || ""
        ).trim();

        if (/^https?:\/\//i.test(configuredApi)) {
          const backendOrigin = configuredApi.replace(
            /\/api\/?$/i,
            "",
          );

          documentUrl =
            backendOrigin +
            (rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`);
        } else {
          documentUrl =
            `${window.location.protocol}//` +
            `${window.location.hostname}:4000` +
            (rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`);
        }
      }

      const response = await fetch(documentUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `تعذر تحميل الصورة (${response.status})`,
        );
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      setDocumentPreview({
        label,
        url: blobUrl,
      });
    } catch (error) {
      console.error("openDocument error:", error);

      setDocumentError(
        error instanceof Error
          ? error.message
          : "تعذر فتح الصورة.",
      );
    } finally {
      setDocumentLoading(false);
    }
  }

  function closeDocumentPreview() {
    if (documentPreview?.url) {
      URL.revokeObjectURL(documentPreview.url);
    }

    setDocumentPreview(null);
    setDocumentError("");
    setDocumentLoading(false);
  }

  const pendingCaptains = useMemo(
    () => captains.filter((x) => x.status === "pending"),
    [captains],
  );

  const pendingEstablishments = useMemo(
    () => establishments.filter((x) => x.status === "pending"),
    [establishments],
  );

  const totalPending =
    pendingCaptains.length + pendingEstablishments.length;

  const captainRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return captains;

    return captains.filter((x) =>
      [
        x.fullName,
        x.phone,
        x.gmail,
        loc(x.governorateId),
        loc(x.areaId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [captains, search]);

  const establishmentRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return establishments;

    return establishments.filter((x) =>
      [
        x.name,
        x.phone,
        x.ownerFullName,
        x.ownerPhone,
        x.gmail,
        x.address,
        loc(x.governorateId),
        loc(x.areaId),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [establishments, search]);

  async function approve(id: string) {
    try {
      setSavingId(id);
      await api.post(
        tab === "captains"
          ? `/captain-registration/${id}/approve`
          : `/establishment-registration/${id}/approve`,
      );
      setOpenId(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "تعذر اعتماد الطلب."));
    } finally {
      setSavingId(null);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return;

    try {
      setSavingId(id);
      await api.post(
        tab === "captains"
          ? `/captain-registration/${id}/reject`
          : `/establishment-registration/${id}/reject`,
        { reason: rejectReason.trim() },
      );
      setRejectId(null);
      setRejectReason("");
      setOpenId(null);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "تعذر رفض الطلب."));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div dir="rtl" style={{
      width: "100%",
      maxWidth: 1160,
      margin: "0 auto",
      padding: "18px 24px 42px",
      boxSizing: "border-box",
    }}>
      <style>{`
        .rr-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .rr-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .rr-data-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .rr-doc-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .rr-row:hover {
          background: #fffaf5 !important;
        }

        .rr-search-input::placeholder {
          color: #94a3b8;
        }

        .rr-search-input:focus {
          outline: none;
        }

        @media (max-width: 900px) {
          .rr-grid-3,
          .rr-data-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .rr-doc-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 680px) {
          .rr-grid-3,
          .rr-tabs,
          .rr-data-grid {
            grid-template-columns: 1fr;
          }

          .rr-page-padding {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
      `}</style>

      <HomeBackButton />

      {/* =====================================================
          HEADER
      ===================================================== */}
      <section
        className="rr-page-padding"
        style={{
          position: "relative",
          overflow: "hidden",
          marginTop: 18,
          marginBottom: 22,
          padding: "28px 30px",
          borderRadius: 24,
          background:
            "linear-gradient(135deg, #D96C16 0%, #F28C28 58%, #F6B56F 100%)",
          boxShadow: "0 14px 34px rgba(242, 140, 40, 0.18)",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            top: -120,
            left: -70,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.055)",
            bottom: -90,
            right: 110,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0, flex: "1 1 520px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                fontSize: 13,
                fontWeight: 900,
                color: "rgba(255,255,255,0.86)",
              }}
            >
              <UserRound size={16} />
              المراجعة والإعتماد
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.2,
                fontWeight: 950,
              }}
            >
              طلبات التسجيل
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                maxWidth: 720,
                fontSize: 14,
                lineHeight: 1.85,
                color: "rgba(255,255,255,0.84)",
              }}
            >
              مراجعة طلبات الكباتن والمطاعم والمحلات واتخاذ قرار الاعتماد من
              مكان واحد.
            </p>
          </div>

          <div
            style={{
              minWidth: 175,
              padding: "15px 18px",
              flexShrink: 0,
              borderRadius: 20,
              background: "rgba(255,255,255,0.13)",
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(255,255,255,0.82)",
              }}
            >
              بانتظار المراجعة
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 6,
                fontSize: 30,
                lineHeight: 1,
                fontWeight: 950,
              }}
            >
              {totalPending}
            </strong>
          </div>
        </div>
      </section>

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: "13px 15px",
            borderRadius: 14,
            background: "#FFF4F4",
            border: "1px solid #F6CCCC",
            color: "#B42318",
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* =====================================================
          SUMMARY
      ===================================================== */}
      <section className="rr-grid-3" style={{ marginBottom: 18 }}>
        {[
          {
            title: "إجمالي الطلبات",
            value: captains.length + establishments.length,
            icon: <UserRound size={20} />,
          },
          {
            title: "طلبات الكباتن المعلقة",
            value: pendingCaptains.length,
            icon: <UserRound size={20} />,
          },
          {
            title: "طلبات المطاعم والمحلات المعلقة",
            value: pendingEstablishments.length,
            icon: <Store size={20} />,
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8E1DA",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.045)",
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
                <span
                  style={{
                    display: "block",
                    color: "#64748B",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {item.title}
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 10,
                    fontSize: 28,
                    lineHeight: 1,
                    color: "#172033",
                    fontWeight: 950,
                  }}
                >
                  {item.value}
                </strong>
              </div>

              <div
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 13,
                  background: "#FFF1E3",
                  color: "#D96C16",
                }}
              >
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* =====================================================
          TABS
      ===================================================== */}
      <section className="rr-tabs" style={{ marginBottom: 18 }}>
        <button
          type="button"
          onClick={() => {
            setTab("captains");
            setOpenId(null);
            setSearch("");
          }}
          style={{
            background: tab === "captains" ? "#FFF8F1" : "#FFFFFF",
            border:
              tab === "captains"
                ? "2px solid #F28C28"
                : "1px solid #E8E1DA",
            borderRadius: 18,
            padding: "17px 18px",
            cursor: "pointer",
            textAlign: "right",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.045)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                background: "#FFF1E3",
                color: "#D96C16",
              }}
            >
              <UserRound size={21} />
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <b
                style={{
                  display: "block",
                  fontSize: 15,
                  fontWeight: 950,
                  color: "#172033",
                }}
              >
                طلبات الكباتن
              </b>

              <small
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#64748B",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {pendingCaptains.length} معلقة · {captains.length} إجمالي
              </small>
            </span>

            <strong
              style={{
                minWidth: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                background:
                  tab === "captains" ? "#F28C28" : "#FFF1E3",
                color: tab === "captains" ? "#FFFFFF" : "#D96C16",
                fontSize: 16,
                fontWeight: 950,
              }}
            >
              {pendingCaptains.length}
            </strong>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab("establishments");
            setOpenId(null);
            setSearch("");
          }}
          style={{
            background:
              tab === "establishments" ? "#FFF8F1" : "#FFFFFF",
            border:
              tab === "establishments"
                ? "2px solid #F28C28"
                : "1px solid #E8E1DA",
            borderRadius: 18,
            padding: "17px 18px",
            cursor: "pointer",
            textAlign: "right",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.045)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
            }}
          >
            <span
              style={{
                width: 46,
                height: 46,
                flexShrink: 0,
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                background: "#FFF1E3",
                color: "#D96C16",
              }}
            >
              <Store size={21} />
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <b
                style={{
                  display: "block",
                  fontSize: 15,
                  fontWeight: 950,
                  color: "#172033",
                }}
              >
                طلبات المطاعم والمحلات
              </b>

              <small
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#64748B",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {pendingEstablishments.length} معلقة ·{" "}
                {establishments.length} إجمالي
              </small>
            </span>

            <strong
              style={{
                minWidth: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                background:
                  tab === "establishments" ? "#F28C28" : "#FFF1E3",
                color:
                  tab === "establishments"
                    ? "#FFFFFF"
                    : "#D96C16",
                fontSize: 16,
                fontWeight: 950,
              }}
            >
              {pendingEstablishments.length}
            </strong>
          </div>
        </button>
      </section>

      {/* =====================================================
          MAIN PANEL + SEARCH
      ===================================================== */}
      <section
        style={{
          background: "#FFFFFF",
          border: "1px solid #E8E1DA",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.045)",
        }}
      >
        <div
          style={{
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            borderBottom: "1px solid #EFE7DE",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 950,
                color: "#172033",
              }}
            >
              {tab === "captains"
                ? "طلبات الكباتن"
                : "طلبات المطاعم والمحلات"}
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748B",
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {tab === "captains"
                ? `${captainRows.length} طلب ظاهر`
                : `${establishmentRows.length} طلب ظاهر`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            style={{
              minHeight: 42,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #F1C79F",
              background: "#FFF8F1",
              color: "#D96C16",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            {loading ? (
              <Loader2 size={16} className="location-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            تحديث
          </button>
        </div>

        <div
          style={{
            padding: 18,
            background: "#FFF9F4",
            borderBottom: "1px solid #F3E5D7",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 780,
              minHeight: 54,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 17px",
              boxSizing: "border-box",
              borderRadius: 17,
              background: "#FFFFFF",
              border: "1px solid #F1C79F",
              boxShadow: "0 8px 24px rgba(242, 140, 40, 0.09)",
            }}
          >
            <Search
              size={19}
              style={{ color: "#D96C16", flexShrink: 0 }}
            />

            <input
              className="rr-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                tab === "captains"
                  ? "ابحث باسم الكابتن أو الهاتف أو Gmail أو المحافظة..."
                  : "ابحث باسم المطعم أو المحل أو المالك أو الهاتف..."
              }
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                background: "transparent",
                fontSize: 14,
                fontWeight: 750,
                color: "#172033",
              }}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  border: 0,
                  borderRadius: 10,
                  background: "#FFF1E3",
                  color: "#D96C16",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}
        {loading ? (
          <div
            style={{
              minHeight: 260,
              display: "grid",
              placeItems: "center",
              padding: 30,
              color: "#64748B",
              textAlign: "center",
            }}
          >
            <div>
              <Loader2
                size={32}
                className="location-spin"
                style={{ marginBottom: 10 }}
              />
              <div style={{ fontWeight: 850 }}>
                جارٍ تحميل الطلبات...
              </div>
            </div>
          </div>
        ) : tab === "captains" ? (
          captainRows.length === 0 ? (
            <div
              style={{
                minHeight: 260,
                display: "grid",
                placeItems: "center",
                padding: 30,
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    margin: "0 auto 12px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 17,
                    background: "#FFF1E3",
                    color: "#D96C16",
                  }}
                >
                  <UserRound size={24} />
                </div>

                <h3
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 950,
                    color: "#172033",
                  }}
                >
                  لا توجد طلبات
                </h3>

                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 13,
                    color: "#64748B",
                    fontWeight: 650,
                  }}
                >
                  لا توجد نتائج مطابقة للبحث الحالي.
                </p>
              </div>
            </div>
          ) : (
            <div>
              {captainRows.map((row) => (
                <article
                  key={row._id}
                  style={{
                    borderBottom: "1px solid #EFE7DE",
                    background: "#FFFFFF",
                  }}
                >
                  <button
                    type="button"
                    className="rr-row"
                    onClick={() =>
                      setOpenId((current) =>
                        current === row._id ? null : row._id,
                      )
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                      padding: "17px 18px",
                      border: 0,
                      background: "#FFFFFF",
                      cursor: "pointer",
                      textAlign: "right",
                      font: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 14,
                        background: "#FFF1E3",
                        color: "#D96C16",
                      }}
                    >
                      <UserRound size={21} />
                    </span>

                    <span
                      style={{
                        minWidth: 0,
                        flex: 1,
                        display: "block",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#172033",
                          fontSize: 15,
                          fontWeight: 950,
                        }}
                      >
                        {row.fullName}
                      </span>

                      <span
                        style={{
                          display: "block",
                          marginTop: 4,
                          color: "#64748B",
                          fontSize: 12,
                          fontWeight: 700,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.gmail} · {row.phone}
                      </span>
                    </span>

                    <span
                      style={{
                        ...statusStyle(row.status),
                        flexShrink: 0,
                        padding: "7px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {statusText(row.status)}
                    </span>

                    {openId === row._id ? (
                      <ChevronUp size={19} color="#D96C16" />
                    ) : (
                      <ChevronDown size={19} color="#94A3B8" />
                    )}
                  </button>

                  {openId === row._id && (
                    <div
                      style={{
                        padding: "0 18px 20px",
                        background: "#FFFCF9",
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          background: "#F1E7DD",
                          marginBottom: 16,
                        }}
                      />

                      <div className="rr-data-grid">
                        {[
                          ["الاسم", row.fullName, <UserRound size={14} />],
                          ["الهاتف", row.phone, <Phone size={14} />],
                          ["Gmail", row.gmail, <Mail size={14} />],
                          [
                            "البريد",
                            row.email || row.gmail || "غير مضاف",
                            <Mail size={14} />,
                          ],
                          [
                            "المحافظة",
                            loc(row.governorateId),
                            <MapPinned size={14} />,
                          ],
                          [
                            "المنطقة",
                            loc(row.areaId),
                            <MapPinned size={14} />,
                          ],
                          [
                            "الشفت الحالي",
                            row.currentShift
                              ? (
                                  row.currentShift.name ||
                                  [
                                    row.currentShift.startTime,
                                    row.currentShift.endTime,
                                  ]
                                    .filter(Boolean)
                                    .join(" - ")
                                ) || "غير محدد"
                              : "غير محدد",
                            <Clock3 size={14} />,
                          ],
                          [
                            "الطلبات المكتملة",
                            String(Number(row.completedOrders || 0)),
                            <Check size={14} />,
                          ],
                          [
                            "الطلبات الملغاة",
                            String(Number(row.cancelledOrders || 0)),
                            <X size={14} />,
                          ],
                          [
                            "تاريخ الطلب",
                            formatDate(row.createdAt),
                            <CalendarDays size={14} />,
                          ],
                          [
                            "آخر تحديث",
                            formatDate(row.updatedAt),
                            <CalendarDays size={14} />,
                          ],
                        ].map(([label, value, icon]) => (
                          <div
                            key={String(label)}
                            style={{
                              minWidth: 0,
                              padding: 14,
                              borderRadius: 15,
                              background: "#FFFFFF",
                              border: "1px solid #F2DFCD",
                            }}
                          >
                            <small
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                color: "#D96C16",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              {icon}
                              {label}
                            </small>

                            <strong
                              style={{
                                display: "block",
                                marginTop: 7,
                                color: "#172033",
                                fontSize: 13,
                                lineHeight: 1.55,
                                wordBreak: "break-word",
                              }}
                            >
                              {String(value)}
                            </strong>

                            {label === "الشفت الحالي" &&
                              row.currentShift &&
                              (row.currentShift.startTime ||
                                row.currentShift.endTime) && (
                                <small
                                  style={{
                                    display: "block",
                                    marginTop: 4,
                                    color: "#64748B",
                                    fontSize: 11,
                                    fontWeight: 700,
                                  }}
                                >
                                  {row.currentShift.startTime || "--"} -{" "}
                                  {row.currentShift.endTime || "--"}
                                </small>
                              )}
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          margin: "18px 0 10px",
                          fontSize: 14,
                          color: "#172033",
                          fontWeight: 950,
                        }}
                      >
                        وثائق الكابتن
                      </div>

                      <div className="rr-doc-grid">
                        {[
                          ["الهوية الأمامية", row.idFrontUrl],
                          ["الهوية الخلفية", row.idBackUrl],
                          ["الإقامة / الأمامي", row.residenceFrontUrl],
                          ["الإقامة / الخلفي", row.residenceBackUrl],
                        ].map(([label, url]) => (
                          <button
                            key={String(label)}
                            type="button"
                            onClick={() =>
                              void openDocument(
                                String(label),
                                String(url || ""),
                              )
                            }
                            style={{
                              minHeight: 96,
                              padding: 12,
                              borderRadius: 15,
                              border: "1px solid #F1C79F",
                              background: "#FFFFFF",
                              color: "#D96C16",
                              cursor: "pointer",
                              textAlign: "right",
                              font: "inherit",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  width: 34,
                                  height: 34,
                                  display: "grid",
                                  placeItems: "center",
                                  borderRadius: 10,
                                  background: "#FFF1E3",
                                }}
                              >
                                <FileImage size={18} />
                              </span>

                              <ExternalLink size={15} />
                            </div>

                            <b
                              style={{
                                display: "block",
                                marginTop: 10,
                                color: "#172033",
                                fontSize: 12,
                              }}
                            >
                              {label}
                            </b>

                            <small
                              style={{
                                display: "block",
                                marginTop: 3,
                                color: "#64748B",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              عرض الوثيقة
                            </small>
                          </button>
                        ))}
                      </div>

                      {row.rejectionReason && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "12px 14px",
                            borderRadius: 13,
                            background: "#FFF4F4",
                            border: "1px solid #F4CDCD",
                            color: "#991B1B",
                            fontSize: 13,
                            fontWeight: 750,
                          }}
                        >
                          <b>سبب الرفض:</b> {row.rejectionReason}
                        </div>
                      )}

                      {row.status === "pending" && (
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                            marginTop: 16,
                          }}
                        >
                          <button
                            type="button"
                            disabled={savingId === row._id}
                            onClick={() => void approve(row._id)}
                            style={{
                              minHeight: 44,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              padding: "0 17px",
                              border: 0,
                              borderRadius: 12,
                              background: "#16A34A",
                              color: "#FFFFFF",
                              cursor:
                                savingId === row._id
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight: 900,
                              fontSize: 13,
                            }}
                          >
                            {savingId === row._id ? (
                              <Loader2
                                size={16}
                                className="location-spin"
                              />
                            ) : (
                              <Check size={16} />
                            )}
                            اعتماد الطلب
                          </button>

                          <button
                            type="button"
                            disabled={savingId === row._id}
                            onClick={() => {
                              setRejectId(row._id);
                              setRejectReason("");
                            }}
                            style={{
                              minHeight: 44,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              padding: "0 17px",
                              border: "1px solid #F0B6B6",
                              borderRadius: 12,
                              background: "#FFF4F4",
                              color: "#B42318",
                              cursor:
                                savingId === row._id
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight: 900,
                              fontSize: 13,
                            }}
                          >
                            <X size={16} />
                            رفض الطلب
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )
        ) : establishmentRows.length === 0 ? (
          <div
            style={{
              minHeight: 260,
              display: "grid",
              placeItems: "center",
              padding: 30,
              textAlign: "center",
            }}
          >
            <div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  margin: "0 auto 12px",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 17,
                  background: "#FFF1E3",
                  color: "#D96C16",
                }}
              >
                <Store size={24} />
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 950,
                  color: "#172033",
                }}
              >
                لا توجد طلبات
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 13,
                  color: "#64748B",
                  fontWeight: 650,
                }}
              >
                لا توجد نتائج مطابقة للبحث الحالي.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {establishmentRows.map((row) => (
              <article
                key={row._id}
                style={{
                  borderBottom: "1px solid #EFE7DE",
                  background: "#FFFFFF",
                }}
              >
                <button
                  type="button"
                  className="rr-row"
                  onClick={() =>
                    setOpenId((current) =>
                      current === row._id ? null : row._id,
                    )
                  }
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "17px 18px",
                    border: 0,
                    background: "#FFFFFF",
                    cursor: "pointer",
                    textAlign: "right",
                    font: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: 46,
                      height: 46,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 14,
                      background: "#FFF1E3",
                      color: "#D96C16",
                    }}
                  >
                    <Store size={21} />
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        color: "#172033",
                        fontSize: 15,
                        fontWeight: 950,
                      }}
                    >
                      {row.name}
                    </span>

                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        color: "#64748B",
                        fontSize: 12,
                        fontWeight: 700,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {row.type === "restaurant" ? "مطعم" : "محل"} ·{" "}
                      {row.ownerFullName} · {row.gmail}
                    </span>
                  </span>

                  <span
                    style={{
                      ...statusStyle(row.status),
                      flexShrink: 0,
                      padding: "7px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 900,
                    }}
                  >
                    {statusText(row.status)}
                  </span>

                  {openId === row._id ? (
                    <ChevronUp size={19} color="#D96C16" />
                  ) : (
                    <ChevronDown size={19} color="#94A3B8" />
                  )}
                </button>

                {openId === row._id && (
                  <div
                    style={{
                      padding: "0 18px 20px",
                      background: "#FFFCF9",
                    }}
                  >
                    <div
                      style={{
                        height: 1,
                        background: "#F1E7DD",
                        marginBottom: 16,
                      }}
                    />

                    <div className="rr-data-grid">
                      {[
                        ["اسم النشاط", row.name, <Store size={14} />],
                        [
                          "النوع",
                          row.type === "restaurant"
                            ? "مطعم"
                            : "محل",
                          <Store size={14} />,
                        ],
                        [
                          "هاتف النشاط",
                          row.phone,
                          <Phone size={14} />,
                        ],
                        [
                          "اسم المالك",
                          row.ownerFullName,
                          <UserRound size={14} />,
                        ],
                        [
                          "هاتف المالك",
                          row.ownerPhone,
                          <Phone size={14} />,
                        ],
                        ["Gmail", row.gmail, <Mail size={14} />],
                        [
                          "البريد",
                          row.email || row.gmail || "غير مضاف",
                          <Mail size={14} />,
                        ],
                        [
                          "المحافظة",
                          loc(row.governorateId),
                          <MapPinned size={14} />,
                        ],
                        [
                          "المنطقة",
                          loc(row.areaId),
                          <MapPinned size={14} />,
                        ],
                        [
                          "العنوان",
                          row.address,
                          <MapPin size={14} />,
                        ],
                        [
                          "Latitude",
                          String(row.latitude ?? "—"),
                          <MapPin size={14} />,
                        ],
                        [
                          "Longitude",
                          String(row.longitude ?? "—"),
                          <MapPin size={14} />,
                        ],
                        [
                          "تاريخ الطلب",
                          formatDate(row.createdAt),
                          <CalendarDays size={14} />,
                        ],
                        [
                          "آخر تحديث",
                          formatDate(row.updatedAt),
                          <CalendarDays size={14} />,
                        ],
                      ].map(([label, value, icon]) => (
                        <div
                          key={String(label)}
                          style={{
                            minWidth: 0,
                            padding: 14,
                            borderRadius: 15,
                            background: "#FFFFFF",
                            border: "1px solid #F2DFCD",
                            ...(label === "العنوان"
                              ? { gridColumn: "span 2" }
                              : {}),
                          }}
                        >
                          <small
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              color: "#D96C16",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            {icon}
                            {label}
                          </small>

                          <strong
                            style={{
                              display: "block",
                              marginTop: 7,
                              color: "#172033",
                              fontSize: 13,
                              lineHeight: 1.55,
                              wordBreak: "break-word",
                            }}
                          >
                            {String(value)}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        borderRadius: 15,
                        background: "#FFFFFF",
                        border: "1px solid #F1DFCE",
                      }}
                    >
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          flexShrink: 0,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 12,
                          background: "#FFF1E3",
                          color: "#D96C16",
                        }}
                      >
                        <MapPin size={19} />
                      </span>

                      <div>
                        <b
                          style={{
                            display: "block",
                            color: "#172033",
                            fontSize: 13,
                            fontWeight: 950,
                          }}
                        >
                          موقع المنشأة
                        </b>

                        <span
                          style={{
                            display: "block",
                            marginTop: 3,
                            color: "#64748B",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {row.latitude != null &&
                          row.longitude != null
                            ? `${row.latitude}, ${row.longitude}`
                            : "لم يتم إرسال الإحداثيات"}
                        </span>
                      </div>
                    </div>

                    {row.rejectionReason && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "12px 14px",
                          borderRadius: 13,
                          background: "#FFF4F4",
                          border: "1px solid #F4CDCD",
                          color: "#991B1B",
                          fontSize: 13,
                          fontWeight: 750,
                        }}
                      >
                        <b>سبب الرفض:</b> {row.rejectionReason}
                      </div>
                    )}

                    {row.status === "pending" && (
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                          marginTop: 16,
                        }}
                      >
                        <button
                          type="button"
                          disabled={savingId === row._id}
                          onClick={() => void approve(row._id)}
                          style={{
                            minHeight: 44,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "0 17px",
                            border: 0,
                            borderRadius: 12,
                            background: "#16A34A",
                            color: "#FFFFFF",
                            cursor:
                              savingId === row._id
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: 900,
                            fontSize: 13,
                          }}
                        >
                          {savingId === row._id ? (
                            <Loader2
                              size={16}
                              className="location-spin"
                            />
                          ) : (
                            <Check size={16} />
                          )}
                          اعتماد الطلب
                        </button>

                        <button
                          type="button"
                          disabled={savingId === row._id}
                          onClick={() => {
                            setRejectId(row._id);
                            setRejectReason("");
                          }}
                          style={{
                            minHeight: 44,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "0 17px",
                            border: "1px solid #F0B6B6",
                            borderRadius: 12,
                            background: "#FFF4F4",
                            color: "#B42318",
                            cursor:
                              savingId === row._id
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: 900,
                            fontSize: 13,
                          }}
                        >
                          <X size={16} />
                          رفض الطلب
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          DOCUMENT MODAL
      ===================================================== */}
      {(documentPreview || documentLoading || documentError) && (
        <div
          onClick={closeDocumentPreview}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(15, 23, 42, 0.58)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1000px, calc(100vw - 32px))",
              maxHeight: "92vh",
              overflow: "hidden",
              background: "#FFFFFF",
              borderRadius: 22,
              border: "1px solid #EEE5DC",
              boxShadow: "0 26px 70px rgba(15, 23, 42, 0.24)",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: "1px solid #EEE5DC",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    color: "#D96C16",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  معاينة الوثيقة
                </span>

                <h2
                  style={{
                    margin: "4px 0 0",
                    color: "#172033",
                    fontSize: 18,
                    fontWeight: 950,
                  }}
                >
                  {documentPreview?.label || "الوثيقة"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDocumentPreview}
                style={{
                  width: 38,
                  height: 38,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid #E8E1DA",
                  borderRadius: 11,
                  background: "#FFFFFF",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                minHeight: 300,
                maxHeight: "74vh",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              {documentLoading ? (
                <Loader2
                  size={38}
                  className="location-spin"
                />
              ) : documentError ? (
                <div
                  style={{
                    color: "#B42318",
                    textAlign: "center",
                    padding: 30,
                    fontWeight: 800,
                  }}
                >
                  {documentError}
                </div>
              ) : documentPreview?.url ? (
                <img
                  src={documentPreview.url}
                  alt={documentPreview.label}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "68vh",
                    objectFit: "contain",
                    borderRadius: 12,
                  }}
                />
              ) : null}
            </div>

            <div
              style={{
                padding: 14,
                borderTop: "1px solid #EEE5DC",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={closeDocumentPreview}
                style={{
                  minHeight: 42,
                  padding: "0 16px",
                  border: "1px solid #E8E1DA",
                  borderRadius: 11,
                  background: "#FFFFFF",
                  color: "#172033",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          REJECT MODAL
      ===================================================== */}
      {rejectId && (
        <div
          onClick={() => {
            setRejectId(null);
            setRejectReason("");
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(15, 23, 42, 0.58)",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(560px, calc(100vw - 32px))",
              background: "#FFFFFF",
              borderRadius: 22,
              border: "1px solid #EEE5DC",
              boxShadow: "0 26px 70px rgba(15, 23, 42, 0.24)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderBottom: "1px solid #EEE5DC",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    color: "#B42318",
                    fontSize: 11,
                    fontWeight: 900,
                  }}
                >
                  رفض طلب التسجيل
                </span>

                <h2
                  style={{
                    margin: "4px 0 0",
                    color: "#172033",
                    fontSize: 18,
                    fontWeight: 950,
                  }}
                >
                  اكتب سبب الرفض
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                style={{
                  width: 38,
                  height: 38,
                  display: "grid",
                  placeItems: "center",
                  border: "1px solid #E8E1DA",
                  borderRadius: 11,
                  background: "#FFFFFF",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <label
                style={{
                  display: "block",
                  color: "#172033",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                سبب الرفض

                <textarea
                  value={rejectReason}
                  onChange={(event) =>
                    setRejectReason(event.target.value)
                  }
                  placeholder="اكتب سبب رفض الطلب..."
                  rows={6}
                  autoFocus
                  style={{
                    width: "100%",
                    marginTop: 9,
                    padding: 13,
                    boxSizing: "border-box",
                    resize: "vertical",
                    borderRadius: 13,
                    border: "1px solid #E6D8CA",
                    outline: "none",
                    background: "#FFFCF9",
                    color: "#172033",
                    font: "inherit",
                    lineHeight: 1.7,
                  }}
                />
              </label>
            </div>

            <div
              style={{
                padding: 14,
                borderTop: "1px solid #EEE5DC",
                display: "flex",
                justifyContent: "flex-end",
                gap: 9,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                style={{
                  minHeight: 42,
                  padding: "0 15px",
                  border: "1px solid #E8E1DA",
                  borderRadius: 11,
                  background: "#FFFFFF",
                  color: "#475569",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={
                  !rejectReason.trim() || savingId === rejectId
                }
                onClick={() => void reject(rejectId)}
                style={{
                  minHeight: 42,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "0 16px",
                  border: 0,
                  borderRadius: 11,
                  background:
                    !rejectReason.trim() || savingId === rejectId
                      ? "#E7A0A0"
                      : "#B42318",
                  color: "#FFFFFF",
                  cursor:
                    !rejectReason.trim() || savingId === rejectId
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: 900,
                }}
              >
                {savingId === rejectId ? (
                  <Loader2
                    size={16}
                    className="location-spin"
                  />
                ) : (
                  <X size={16} />
                )}
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
