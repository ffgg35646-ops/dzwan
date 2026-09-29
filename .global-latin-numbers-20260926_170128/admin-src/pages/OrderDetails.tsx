import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2, CheckCircle2, XCircle, ShieldCheck, ImageIcon, Camera } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";
type Order = Record<string, any>;

function unwrap(data: any) {
  return data?.data ?? data?.order ?? data;
}

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value?.fullName ?? value?.name ?? value?.title ?? value?._id ?? fallback;
  return String(value);
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "تم التأكيد",
  preparing: "جاري التحضير",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "جاري التسليم",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم الاستلام",
  rejected: "تم رفض الطلب",
  cancelled: "ملغي",
};

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryProof, setDeliveryProof] = useState<any>(null);
  const [pickupPhoto, setPickupPhoto] = useState<any>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<"rejected" | "delivered" | "">("");
  const [timeline, setTimeline] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;

      try {
        setLoading(true);
        setTimelineLoading(true);
        setProofLoading(true);
        setError("");

        const [response, timelineResponse] =
          await Promise.all([
            api.get(`/orders/${id}`),
            api
              .get(`/ops/orders/${id}/timeline`)
              .catch(() => null),
          ]);

        if (mounted) {
          const loadedOrder = unwrap(response.data);

          setOrder(loadedOrder);

          setDeliveryProof(
            loadedOrder?.deliveryProof ??
              loadedOrder?.deliveryProofData ??
              loadedOrder?.deliveryProofImage ??
              null,
          );

          setPickupPhoto(
            loadedOrder?.pickupPhoto ??
              loadedOrder?.pickupPhotoData ??
              loadedOrder?.pickupImage ??
              null,
          );

          setTimeline(
            timelineResponse?.data ?? null,
          );

          setTimelineLoading(false);
          setProofLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setTimelineLoading(false);
          setProofLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [id]);

  function imageUrl(value: any) {
    if (!value) return "";

    const raw =
      value?.url ??
      value?.photoUrl ??
      value?.imageUrl ??
      value?.path ??
      value?.filePath ??
      value;

    if (typeof raw !== "string") return "";

    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://")
    ) {
      return raw;
    }

    const base =
      import.meta.env.VITE_API_URL ||
      "";

    if (!base) return raw;

    return `${base.replace(/\/$/, "")}/${raw.replace(/^\//, "")}`;
  }

  const deliveryPhoto =
    imageUrl(deliveryProof?.photo ?? deliveryProof);

  const pickupPhotoUrl =
    imageUrl(pickupPhoto?.photo ?? pickupPhoto);



  async function handleDecision(status: "rejected" | "delivered") {
    if (!id || !order || order.status !== "pending") return;

    const message =
      status === "rejected"
        ? "هل أنت متأكد من رفض هذا الطلب؟"
        : "هل تريد تسجيل الطلب كتم استلامه؟";

    if (!window.confirm(message)) return;

    try {
      setActionLoading(status);

      const response = await api.patch(`/orders/${id}/admin-decision`, {
        status,
      });

      const updated = response?.data?.order ?? response?.data?.data ?? response?.data;
      setOrder(updated);
    } catch (err) {
      window.alert(getApiErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  }

  if (loading) {
    return <div className="page-loading"><Loader2 className="spin" size={22} /> جاري تحميل بيانات الطلب...</div>;
  }

  if (error || !order) {
    return (
      <div className="page-state">
        <p>{error || "الطلب غير موجود."}</p>
        <Link to="/orders">العودة إلى الطلبات</Link>
      </div>
    );
  }

  const customer = order.customerSnapshot ?? order.customerId;
  const establishment = order.establishmentId;
  const captain = order.captainId;
  const items = Array.isArray(order.items) ? order.items : [];

  function formatDuration(value: any) {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(Number(value))
    ) {
      return "—";
    }

    const totalSeconds = Math.max(
      0,
      Math.floor(Number(value) / 1000),
    );

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(
      (totalSeconds % 3600) / 60,
    );
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} س ${minutes} د`;
    }

    if (minutes > 0) {
      return `${minutes} د ${seconds} ث`;
    }

    return `${seconds} ث`;
  }

  const timelineEvents =
    Array.isArray(timeline?.events)
      ? timeline.events
      : [];

  const durations = timeline?.durations ?? {};

  return (
    <div className="page">

      <HomeBackButton />
      <div className="page-header">
        <div>
          <Link to="/orders" className="back-link"><ArrowRight size={18} /> العودة إلى الطلبات</Link>
          <h1>تفاصيل الطلب</h1>
        </div>
      </div>

      {order.status === "pending" && (
        <section
          className="details-card admin-order-actions"
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "flex-start",
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => handleDecision("rejected")}
            disabled={Boolean(actionLoading)}
            style={{
              border: "1px solid #ef4444",
              background: "#fff1f2",
              color: "#b91c1c",
              borderRadius: 12,
              padding: "11px 18px",
              fontWeight: 800,
              cursor: actionLoading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: actionLoading ? 0.65 : 1,
            }}
          >
            {actionLoading === "rejected" ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <XCircle size={18} />
            )}
            رفض الطلب
          </button>

          <button
            type="button"
            onClick={() => handleDecision("delivered")}
            disabled={Boolean(actionLoading)}
            style={{
              border: "1px solid #16a34a",
              background: "#f0fdf4",
              color: "#15803d",
              borderRadius: 12,
              padding: "11px 18px",
              fontWeight: 800,
              cursor: actionLoading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              opacity: actionLoading ? 0.65 : 1,
            }}
          >
            {actionLoading === "delivered" ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            تم الاستلام
          </button>
        </section>
      )}

      <section className="details-card">
        <h2>بيانات الطلب</h2>
        <div className="details-grid">
          <div><strong>رقم الطلب</strong><span>{text(order.orderNumber, text(order._id))}</span></div>
          <div><strong>الحالة</strong><span>{statusLabels[order.status] ?? text(order.status)}</span></div>
          <div><strong>العميل</strong><span>{text(customer)}</span></div>
          <div><strong>المنشأة</strong><span>{text(establishment)}</span></div>
          <div><strong>المندوب</strong><span>{text(captain)}</span></div>
          <div><strong>الإجمالي</strong><span>{text(order.totalAmount ?? order.total)}</span></div>
          <div><strong>رسوم التوصيل</strong><span>{text(order.deliveryFee)}</span></div>
          <div><strong>تاريخ الإنشاء</strong><span>{order.createdAt ? new Date(order.createdAt).toLocaleString("ar-EG-u-nu-latn") : "—"}</span></div>
        </div>
      </section>

      <section className="details-card">
        <h2>المنتجات</h2>
        {items.length === 0 ? (
          <p>لا توجد منتجات مسجلة لهذا الطلب.</p>
        ) : (
          <div className="details-list">
            {items.map((item: any, index: number) => (
              <div className="details-row" key={item?._id ?? index}>
                <span>{text(item.productId ?? item.product)}</span>
                <span>الكمية: {text(item.quantity)}</span>
                <span>السعر: {text(item.price ?? item.unitPrice)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="details-card">
        <h2>العنوان</h2>
        <p>
          {text(
            order.customerSnapshot?.addressText ??
            order.addressId ??
            order.address ??
            order.deliveryAddress
          )}
        </p>
        {order.customerSnapshot?.phone && (
          <p><strong>هاتف العميل:</strong> {text(order.customerSnapshot.phone)}</p>
        )}
        {order.customerSnapshot?.note && (
          <p><strong>ملاحظة العميل:</strong> {text(order.customerSnapshot.note)}</p>
        )}
        {order.customerSnapshot?.latitude != null &&
         order.customerSnapshot?.longitude != null && (
          <p style={{ marginTop: 10 }}>
            <a
              href={`https://www.google.com/maps?q=${order.customerSnapshot.latitude},${order.customerSnapshot.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              فتح موقع العميل على الخريطة
            </a>
          </p>
        )}
      </section>

      {/* R29 + R30 */}
      <section
        className="details-card"
        style={{
          marginTop: 20,
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
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#EFF6FF",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              color: "#2563EB",
            }}
          >
            ↔
          </div>

          <div>
            <h2 style={{ margin: 0 }}>
              سجل حركات الطلب
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748B",
                fontSize: 13,
              }}
            >
              كل حركة مسجلة بالوقت لمعرفة ما حدث في الطلب بالتسلسل.
            </p>
          </div>
        </div>

        {timelineLoading ? (
          <div
            style={{
              padding: 16,
              color: "#64748B",
            }}
          >
            جاري تحميل سجل الطلب...
          </div>
        ) : timelineEvents.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              background: "#F8FAFC",
              color: "#64748B",
            }}
          >
            لا توجد حركات مسجلة لهذا الطلب حتى الآن.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 0,
            }}
          >
            {timelineEvents.map(
              (event: any, index: number) => (
                <div
                  key={
                    String(
                      event?._id ??
                        `${event?.createdAt}-${index}`,
                    )
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "34px minmax(0, 1fr)",
                    gap: 12,
                    position: "relative",
                    paddingBottom:
                      index ===
                      timelineEvents.length - 1
                        ? 0
                        : 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background:
                          index ===
                          timelineEvents.length - 1
                            ? "#2563EB"
                            : "#94A3B8",
                        marginTop: 5,
                        zIndex: 1,
                      }}
                    />

                    {index !==
                      timelineEvents.length - 1 && (
                      <div
                        style={{
                          width: 2,
                          flex: 1,
                          background: "#E2E8F0",
                          marginTop: 2,
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      background: "#F8FAFC",
                      border:
                        "1px solid #E2E8F0",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong>
                        {event?.title ||
                          event?.message ||
                          event?.type ||
                          "حركة"}
                      </strong>

                      <span
                        style={{
                          color: "#64748B",
                          fontSize: 12,
                        }}
                      >
                        {event?.createdAt
                          ? new Date(
                              event.createdAt,
                            ).toLocaleString(
                              "ar-EG-u-nu-latn",
                            )
                          : "—"}
                      </span>
                    </div>

                    {event?.description &&
                      event.description !==
                        event?.title && (
                        <div
                          style={{
                            marginTop: 6,
                            color: "#64748B",
                            fontSize: 13,
                          }}
                        >
                          {event.description}
                        </div>
                      )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <section
        className="details-card"
        style={{
          marginTop: 20,
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
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#F0FDF4",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              color: "#15803D",
            }}
          >
            ⏱
          </div>

          <div>
            <h2 style={{ margin: 0 }}>
              مدة مراحل الطلب
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748B",
                fontSize: 13,
              }}
            >
              الوقت الفعلي الذي قضاه الطلب في كل مرحلة.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
          }}
        >
          {[
            [
              "انتظار الكابتن",
              durations.captain_wait_ms,
            ],
            [
              "الوصول للمحل",
              durations.captain_to_shop_ms,
            ],
            [
              "انتظار المحل",
              durations.shop_wait_ms,
            ],
            [
              "مدة التوصيل",
              durations.delivery_ms,
            ],
            [
              "إجمالي الطلب",
              durations.total_ms,
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                background: "#F8FAFC",
                border:
                  "1px solid #E2E8F0",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                style={{
                  color: "#64748B",
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                {String(label)}
              </div>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                {formatDuration(value)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="details-card"
        style={{
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ShieldCheck size={21} color="#E87516" />

          <div>
            <h2 style={{ margin: 0 }}>
              19. إثبات التسليم
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748B",
                fontSize: 13,
              }}
            >
              التحقق من تسليم الطلب للزبون باستخدام OTP أو صورة إثبات التسليم.
            </p>
          </div>
        </div>

        {proofLoading ? (
          <div style={{ marginTop: 18, color: "#64748B" }}>
            جاري تحميل بيانات إثبات التسليم...
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
              }}
            >
              <strong>حالة OTP</strong>

              <div
                style={{
                  marginTop: 8,
                  fontWeight: 800,
                  color:
                    deliveryProof?.otpVerifiedAt ||
                    deliveryProof?.otpVerified
                      ? "#15803D"
                      : "#B45309",
                }}
              >
                {deliveryProof?.otpVerifiedAt ||
                deliveryProof?.otpVerified
                  ? "تم التحقق من OTP ✅"
                  : "لم يتم التحقق من OTP"}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 14,
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
              }}
            >
              <strong>صورة إثبات التسليم</strong>

              <div
                style={{
                  marginTop: 8,
                  fontWeight: 800,
                  color: deliveryPhoto
                    ? "#15803D"
                    : "#B45309",
                }}
              >
                {deliveryPhoto
                  ? "تم رفع الصورة ✅"
                  : "لا توجد صورة"}
              </div>
            </div>
          </div>
        )}

        {deliveryPhoto && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <ImageIcon size={18} />
              <strong>صورة إثبات التسليم</strong>
            </div>

            <img
              src={deliveryPhoto}
              alt="صورة إثبات التسليم"
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: 420,
                objectFit: "contain",
                borderRadius: 14,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
              }}
            />
          </div>
        )}
      </section>

      <section
        className="details-card"
        style={{
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Camera size={21} color="#2563EB" />

          <div>
            <h2 style={{ margin: 0 }}>
              20. صورة الطلب عند الاستلام
            </h2>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748B",
                fontSize: 13,
              }}
            >
              الصورة التي يلتقطها الكابتن عند استلام الطلب من المحل.
            </p>
          </div>
        </div>

        {proofLoading ? (
          <div style={{ marginTop: 18, color: "#64748B" }}>
            جاري تحميل صورة الاستلام...
          </div>
        ) : pickupPhotoUrl ? (
          <div style={{ marginTop: 18 }}>
            <img
              src={pickupPhotoUrl}
              alt="صورة الطلب عند الاستلام"
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: 420,
                objectFit: "contain",
                borderRadius: 14,
                border: "1px solid #E2E8F0",
                background: "#F8FAFC",
              }}
            />

            {(pickupPhoto?.createdAt ||
              pickupPhoto?.uploadedAt) && (
              <div
                style={{
                  marginTop: 10,
                  color: "#64748B",
                  fontSize: 12,
                }}
              >
                وقت الرفع:{" "}
                {new Date(
                  pickupPhoto.createdAt ??
                  pickupPhoto.uploadedAt,
                ).toLocaleString("ar-EG-u-nu-latn")}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 14,
              background: "#F8FAFC",
              color: "#64748B",
            }}
          >
            لم يتم رفع صورة الاستلام لهذا الطلب بعد.
          </div>
        )}
      </section>

    </div>
  );
}
