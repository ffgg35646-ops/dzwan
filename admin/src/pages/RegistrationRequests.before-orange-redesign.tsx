
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
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
<div className="admin-content">
          <HomeBackButton />

          <div className="dashboard registration-requests-page">
            <section className="dashboard-intro registration-intro">
              <div>
                <span className="dashboard-label">المراجعة والإعتماد</span>
                <h1>طلبات التسجيل</h1>
                <p>
                  مراجعة طلبات الكباتن والمطاعم والمحلات بعد تأكيد البريد الإلكتروني.
                </p>
              </div>

              <div className="registration-total-card">
                <span>طلبات بانتظار المراجعة</span>
                <strong>{totalPending}</strong>
              </div>
            </section>

            <section className="registration-summary-grid">
              <button
                type="button"
                className={`registration-summary-card ${tab === "captains" ? "active" : ""}`}
                onClick={() => {
                  setTab("captains");
                  setOpenId(null);
                  setSearch("");
                }}
              >
                <span className="registration-summary-icon">
                  <UserRound size={20} />
                </span>

                <span>
                  <b>طلبات الكباتن</b>
                  <small>
                    {pendingCaptains.length} معلقة · {captains.length} إجمالي
                  </small>
                </span>

                <strong className="registration-count">
                  {pendingCaptains.length}
                </strong>
              </button>

              <button
                type="button"
                className={`registration-summary-card ${tab === "establishments" ? "active" : ""}`}
                onClick={() => {
                  setTab("establishments");
                  setOpenId(null);
                  setSearch("");
                }}
              >
                <span className="registration-summary-icon">
                  <Store size={20} />
                </span>

                <span>
                  <b>طلبات المطاعم والمحلات</b>
                  <small>
                    {pendingEstablishments.length} معلقة ·{" "}
                    {establishments.length} إجمالي
                  </small>
                </span>

                <strong className="registration-count">
                  {pendingEstablishments.length}
                </strong>
              </button>
            </section>

            <section className="panel registration-panel">
              <div className="panel-header registration-panel-header">
                <div>
                  <h2>
                    {tab === "captains"
                      ? "قائمة طلبات الكباتن"
                      : "قائمة طلبات المطاعم والمحلات"}
                  </h2>
                  <p>
                    افتح الطلب لعرض كل البيانات والوثائق واتخاذ القرار.
                  </p>
                </div>

                <button
                  type="button"
                  className="registration-refresh"
                  onClick={() => void load()}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={16} className="location-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  تحديث
                </button>
              </div>

              <div className="registration-toolbar">
                <div className="registration-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={
                      tab === "captains"
                        ? "بحث بالاسم أو الهاتف أو Gmail..."
                        : "بحث باسم المطعم أو المالك أو الهاتف..."
                    }
                  />
                </div>
              </div>

              {error && <div className="location-error">{error}</div>}

              {loading ? (
                <div className="locations-loading">
                  <Loader2 size={22} className="location-spin" />
                  <span>جارٍ تحميل الطلبات...</span>
                </div>
              ) : tab === "captains" ? (
                captainRows.length === 0 ? (
                  <div className="locations-empty">
                    <div className="locations-empty-icon">
                      <UserRound size={22} />
                    </div>
                    <h3>لا توجد طلبات</h3>
                  </div>
                ) : (
                  <div className="registration-list">
                    {captainRows.map((row) => (
                      <article
                        key={row._id}
                        className={`registration-item ${row.status === "pending" ? "pending" : ""}`}
                      >
                        <button
                          type="button"
                          className="registration-item-head"
                          onClick={() =>
                            setOpenId((v) =>
                              v === row._id ? null : row._id,
                            )
                          }
                        >
                          <span className="registration-avatar">
                            <UserRound size={19} />
                          </span>

                          <span className="registration-main-info">
                            <b>{row.fullName}</b>
                            <small>
                              {row.gmail} · {row.phone}
                            </small>
                          </span>

                          <span
                            className={`registration-status ${row.status}`}
                          >
                            {statusText(row.status)}
                          </span>

                          {openId === row._id ? (
                            <ChevronUp size={19} />
                          ) : (
                            <ChevronDown size={19} />
                          )}
                        </button>

                        {openId === row._id && (
                          <div className="registration-details">
                            <div className="registration-data-grid">
                              <div><small><UserRound size={14} />الاسم</small><strong>{row.fullName}</strong></div>
                              <div><small><Phone size={14} />الهاتف</small><strong>{row.phone}</strong></div>
                              <div><small><Mail size={14} />Gmail</small><strong>{row.gmail}</strong></div>
                              <div><small><Mail size={14} />البريد</small><strong>{row.email || row.gmail || "غير مضاف"}</strong></div>
                              <div><small><MapPinned size={14} />المحافظة</small><strong>{loc(row.governorateId)}</strong></div>
                              <div><small><MapPinned size={14} />المنطقة</small><strong>{loc(row.areaId)}</strong></div>

                              <div>
                                <small>
                                  <Clock3 size={14} />
                                  الشفت الحالي
                                </small>

                                <strong>
                                  {row.currentShift
                                    ? (
                                        row.currentShift.name ||
                                        [row.currentShift.startTime, row.currentShift.endTime]
                                          .filter(Boolean)
                                          .join(" - ")
                                      ) || "غير محدد"
                                    : "غير محدد"}
                                </strong>

                                {row.currentShift &&
                                  (row.currentShift.startTime ||
                                    row.currentShift.endTime) && (
                                    <small style={{ marginTop: 4 }}>
                                      {row.currentShift.startTime || "--"} -{" "}
                                      {row.currentShift.endTime || "--"}
                                    </small>
                                  )}
                              </div>

                              <div>
                                <small>
                                  <Check size={14} />
                                  الطلبات المكتملة
                                </small>
                                <strong>
                                  {Number(row.completedOrders || 0)}
                                </strong>
                              </div>

                              <div>
                                <small>
                                  <X size={14} />
                                  الطلبات الملغاة
                                </small>
                                <strong>
                                  {Number(row.cancelledOrders || 0)}
                                </strong>
                              </div>

                              <div><small><CalendarDays size={14} />تاريخ الطلب</small><strong>{date(row.createdAt)}</strong></div>
                              <div><small><Clock3 size={14} />آخر تحديث</small><strong>{date(row.updatedAt)}</strong></div>
                            </div>

                            <div className="registration-section-title">
                              وثائق الكابتن
                            </div>

                            <div className="registration-docs-grid">
                              {[
                                ["الهوية الأمامية", row.idFrontUrl],
                                ["الهوية الخلفية", row.idBackUrl],
                                ["الإقامة / الأمامي", row.residenceFrontUrl],
                                ["الإقامة / الخلفي", row.residenceBackUrl],
                              ].map(([label, url]) => (
                                <button
                                  key={label}
                                  type="button"
                                  className="registration-document"
                                  onClick={() => {
                                    void openDocument(
                                      String(label),
                                      String(url || ""),
                                    );
                                  }}
                                  style={{
                                    width: "100%",
                                    border: 0,
                                    cursor: "pointer",
                                    textAlign: "right",
                                    font: "inherit",
                                  }}
                                >
                                  <span>
                                    <FileImage size={20} />
                                  </span>

                                  <b>{label}</b>

                                  <small>
                                    عرض الصورة <ExternalLink size={13} />
                                  </small>
                                </button>
                              ))}
                            </div>

                            {row.rejectionReason && (
                              <div className="registration-reason">
                                <b>سبب الرفض:</b> {row.rejectionReason}
                              </div>
                            )}

                            {row.status === "pending" && (
                              <div className="registration-actions">
                                <button
                                  type="button"
                                  className="registration-approve"
                                  disabled={savingId === row._id}
                                  onClick={() => void approve(row._id)}
                                >
                                  {savingId === row._id ? (
                                    <Loader2 size={16} className="location-spin" />
                                  ) : (
                                    <Check size={16} />
                                  )}
                                  اعتماد الطلب
                                </button>

                                <button
                                  type="button"
                                  className="registration-reject"
                                  disabled={savingId === row._id}
                                  onClick={() => {
                                    setRejectId(row._id);
                                    setRejectReason("");
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
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <Store size={22} />
                  </div>
                  <h3>لا توجد طلبات</h3>
                </div>
              ) : (
                <div className="registration-list">
                  {establishmentRows.map((row) => (
                    <article
                      key={row._id}
                      className={`registration-item ${row.status === "pending" ? "pending" : ""}`}
                    >
                      <button
                        type="button"
                        className="registration-item-head"
                        onClick={() =>
                          setOpenId((v) =>
                            v === row._id ? null : row._id,
                          )
                        }
                      >
                        <span className="registration-avatar">
                          <Store size={19} />
                        </span>

                        <span className="registration-main-info">
                          <b>{row.name}</b>
                          <small>
                            {row.type === "restaurant" ? "مطعم" : "محل"} ·{" "}
                            {row.ownerFullName} · {row.gmail}
                          </small>
                        </span>

                        <span
                          className={`registration-status ${row.status}`}
                        >
                          {statusText(row.status)}
                        </span>

                        {openId === row._id ? (
                          <ChevronUp size={19} />
                        ) : (
                          <ChevronDown size={19} />
                        )}
                      </button>

                      {openId === row._id && (
                        <div className="registration-details">
                          <div className="registration-data-grid">
                            <div><small>اسم النشاط</small><strong>{row.name}</strong></div>
                            <div><small>النوع</small><strong>{row.type === "restaurant" ? "مطعم" : "محل"}</strong></div>
                            <div><small>هاتف النشاط</small><strong>{row.phone}</strong></div>
                            <div><small>اسم المالك</small><strong>{row.ownerFullName}</strong></div>
                            <div><small>هاتف المالك</small><strong>{row.ownerPhone}</strong></div>
                            <div><small><Mail size={14} />Gmail</small><strong>{row.gmail}</strong></div>
                            <div><small><Mail size={14} />البريد</small><strong>{row.email || row.gmail || "غير مضاف"}</strong></div>
                            <div><small><MapPinned size={14} />المحافظة</small><strong>{loc(row.governorateId)}</strong></div>
                            <div><small><MapPinned size={14} />المنطقة</small><strong>{loc(row.areaId)}</strong></div>
                            <div className="registration-data-wide"><small><MapPin size={14} />العنوان</small><strong>{row.address}</strong></div>
                            <div><small>Latitude</small><strong>{row.latitude ?? "—"}</strong></div>
                            <div><small>Longitude</small><strong>{row.longitude ?? "—"}</strong></div>
                            <div><small><CalendarDays size={14} />تاريخ الطلب</small><strong>{date(row.createdAt)}</strong></div>
                            <div><small><Clock3 size={14} />آخر تحديث</small><strong>{date(row.updatedAt)}</strong></div>
                          </div>

                          <div className="registration-location-box">
                            <MapPin size={19} />
                            <div>
                              <b>موقع المنشأة</b>
                              <span>
                                {row.latitude != null && row.longitude != null
                                  ? `${row.latitude}, ${row.longitude}`
                                  : "لم يتم إرسال الإحداثيات"}
                              </span>
                            </div>
                          </div>

                          {row.rejectionReason && (
                            <div className="registration-reason">
                              <b>سبب الرفض:</b> {row.rejectionReason}
                            </div>
                          )}

                          {row.status === "pending" && (
                            <div className="registration-actions">
                              <button
                                type="button"
                                className="registration-approve"
                                disabled={savingId === row._id}
                                onClick={() => void approve(row._id)}
                              >
                                {savingId === row._id ? (
                                  <Loader2 size={16} className="location-spin" />
                                ) : (
                                  <Check size={16} />
                                )}
                                اعتماد الطلب
                              </button>

                              <button
                                type="button"
                                className="registration-reject"
                                disabled={savingId === row._id}
                                onClick={() => {
                                  setRejectId(row._id);
                                  setRejectReason("");
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
          </div>
        </div>
      </main>

      {(documentPreview || documentLoading || documentError) && (
        <div
          className="captain-modal-backdrop"
          onClick={closeDocumentPreview}
          style={{
            zIndex: 10000,
            padding: 24,
          }}
        >
          <div
            className="captain-modal"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1000px, 96vw)",
              maxHeight: "92vh",
              overflow: "hidden",
            }}
          >
            <div className="captain-modal-head">
              <div>
                <span>معاينة الوثيقة</span>
                <h2>
                  {documentPreview?.label || "الوثيقة"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDocumentPreview}
              >
                <X size={19} />
              </button>
            </div>

            <div
              style={{
                minHeight: 300,
                maxHeight: "75vh",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 12,
              }}
            >
              {documentLoading ? (
                <Loader2
                  size={36}
                  className="location-spin"
                />
              ) : documentError ? (
                <div
                  style={{
                    color: "#b91c1c",
                    textAlign: "center",
                    padding: 30,
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
                    maxHeight: "70vh",
                    objectFit: "contain",
                    borderRadius: 12,
                  }}
                />
              ) : null}
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={closeDocumentPreview}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>رفض طلب التسجيل</span>
                <h2>سبب الرفض</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label>
                سبب الرفض
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="اكتب سبب رفض الطلب..."
                  rows={5}
                  autoFocus
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={!rejectReason.trim() || savingId === rejectId}
                onClick={() => void reject(rejectId)}
              >
                {savingId === rejectId ? (
                  <Loader2 size={16} className="location-spin" />
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
