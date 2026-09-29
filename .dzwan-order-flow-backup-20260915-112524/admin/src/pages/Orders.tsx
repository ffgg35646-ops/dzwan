import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Truck,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageOrders } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled"
  | "rejected";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerId:
    | string
    | {
        _id: string;
        fullName: string;
        phone?: string;
        email?: string;
      };
  establishmentId:
    | string
    | {
        _id: string;
        name: string;
        type: string;
        status: string;
        governorateId?: string;
        areaId?: string;
      };
  addressId:
    | string
    | {
        _id: string;
        label: string;
        address: string;
        notes?: string | null;
      };
  captainId?:
    | string
    | {
        _id: string;
        fullName: string;
        phone?: string;
        status?: string;
        isOnline?: boolean;
      }
    | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  customerNote?: string | null;
  customerSnapshot?: {
    name?: string | null;
    phone?: string | null;
    addressText?: string | null;
    note?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  confirmedAt?: string | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "جديد",
  confirmed: "مؤكد",
  preparing: "جاري التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تم إسناده",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

const statusClass = (status: OrderStatus) =>
  `order-status ${status}`;

function getName(
  value:
    | string
    | { fullName?: string; name?: string }
    | null
    | undefined,
) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.fullName || value.name || "—";
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function money(value: number) {
  return `${value.toFixed(2)} ج.م`;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | OrderStatus
  >("all");
  const [openId, setOpenId] = useState<string | null>(
    null,
  );

  const [captains, setCaptains] = useState<
    Array<{
      _id: string;
      fullName: string;
      phone?: string;
      status?: string;
      isOnline?: boolean;
      governorateId?: string;
      areaId?: string;
    }>
  >([]);

  const [selectedCaptain, setSelectedCaptain] =
    useState<Record<string, string>>({});

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await api.get("/orders", {
        params,
      });

      const captainResponse =
        await api.get("/captains");

      setCaptains(
        Array.isArray(
          captainResponse.data?.captains,
        )
          ? captainResponse.data.captains
          : [],
      );

      setOrders(
        Array.isArray(response.data?.orders)
          ? response.data.orders
          : [],
      );
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل الطلبات."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();

    async function loadCurrentRole() {
      try {
        const response = await api.get("/auth/me");
        setCurrentRole(
          response.data?.user?.role,
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(error);
        }
      }
    }

    void loadCurrentRole();
  }, [statusFilter]);

  async function updateStatus(
    order: Order,
    status: OrderStatus,
  ) {
    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/orders/${order._id}/status`,
        { status },
      );

      await loadOrders();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحديث حالة الطلب."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function assignCaptain(orderId: string) {
    if (!canManageOrders(currentRole)) {
      setError(
        "ليس لديك صلاحية لإسناد الطلبات.",
      );
      return;
    }
    const captainId =
      selectedCaptain[orderId];

    if (!captainId) {
      setError("اختر الكابتن أولًا.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/orders/${orderId}/assign-captain`,
        {
          captainId,
        },
      );

      await loadOrders();
    } catch (err) {
      console.error(err);
      setError(
        "تعذر إسناد الطلب للكابتن حاليًا.",
      );
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter(
        (o) => o.status === "pending",
      ).length,
      active: orders.filter(
        (o) =>
          ![
            "delivered",
            "cancelled",
            "rejected",
          ].includes(o.status),
      ).length,
      delivered: orders.filter(
        (o) => o.status === "delivered",
      ).length,
    }),
    [orders],
  );

  return (
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
<div className="admin-content">

          <HomeBackButton />
          <div className="dashboard">
            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  العمليات
                </span>
                <h1>الطلبات</h1>
                <p>
                  متابعة الطلبات وحالتها من الإنشاء
                  حتى التسليم.
                </p>
              </div>

              <div className="captains-intro-icon">
                <Package size={24} />
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>إجمالي</span>
                <strong>{stats.total}</strong>
              </div>

              <div className="location-summary-card">
                <span>جديدة</span>
                <strong>{stats.pending}</strong>
              </div>

              <div className="location-summary-card">
                <span>قيد التنفيذ</span>
                <strong>{stats.active}</strong>
              </div>

              <div className="location-summary-card">
                <span>تم التسليم</span>
                <strong>{stats.delivered}</strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div className="panel-header">
                <div>
                  <h2>قائمة الطلبات</h2>
                  <p>
                    البيانات من قاعدة البيانات مباشرة.
                  </p>
                </div>

                <div className="establishment-filters">
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as
                          | "all"
                          | OrderStatus,
                      )
                    }
                  >
                    <option value="all">
                      كل الحالات
                    </option>

                    {Object.entries(
                      statusLabels,
                    ).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="locations-loading">
                  <Loader2
                    size={27}
                    className="location-spin"
                  />
                  <span>
                    جارٍ تحميل الطلبات...
                  </span>
                </div>
              ) : orders.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <Package size={25} />
                  </div>

                  <h3>
                    لا توجد طلبات
                  </h3>

                  <p>
                    لا توجد طلبات مطابقة للفلتر الحالي.
                  </p>
                </div>
              ) : (
                <div className="establishments-list">
                  {orders.map((order) => {
                    const open =
                      openId === order._id;

                    return (
                      <div
                        className="establishment-item"
                        key={order._id}
                      >
                        <div className="establishment-row">
                          <button
                            type="button"
                            className="governorate-expand"
                            onClick={() =>
                              setOpenId(
                                open
                                  ? null
                                  : order._id,
                              )
                            }
                          >
                            {open ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>

                          <div className="establishment-icon">
                            <Package size={18} />
                          </div>

                          <div className="establishment-info">
                            <strong>
                              {order.orderNumber}
                            </strong>
                            <span>
                              {getName(
                                order.establishmentId,
                              )}
                            </span>
                          </div>

                          <span
                            className={statusClass(
                              order.status,
                            )}
                          >
                            {
                              statusLabels[
                                order.status
                              ]
                            }
                          </span>

                          <span className="establishment-governorate">
                            {money(order.total)}
                          </span>

                          <span className="establishment-governorate">
                            {getName(order.captainId)}
                          </span>
                        </div>

                        {open && (
                          <div className="establishment-details">
                            <div className="establishment-details-grid">
                              <div>
                                <span>
                                  العميل
                                </span>
                                <strong>
                                  {getName(
                                    order.customerId,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  هاتف العميل
                                </span>
                                <strong>
                                  {typeof order.customerId ===
                                  "object"
                                    ? order.customerId
                                        .phone || "—"
                                    : "—"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  المطعم / المحل
                                </span>
                                <strong>
                                  {getName(
                                    order.establishmentId,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  الكابتن
                                </span>
                                <strong>
                                  {getName(
                                    order.captainId,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  الإجمالي
                                </span>
                                <strong>
                                  {money(order.total)}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  تاريخ الطلب
                                </span>
                                <strong>
                                  {formatDate(
                                    order.createdAt,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  عنوان التوصيل
                                </span>
                                <strong>
                                  {typeof order.addressId ===
                                  "object"
                                    ? order.addressId
                                        .address
                                    : "—"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  رسوم التوصيل
                                </span>
                                <strong>
                                  {money(
                                    order.deliveryFee,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  المجموع قبل التوصيل
                                </span>
                                <strong>
                                  {money(
                                    order.subtotal,
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div className="order-items">
                              <h3>
                                محتويات الطلب
                              </h3>

                              {order.items.map(
                                (item) => (
                                  <div
                                    className="order-item-line"
                                    key={
                                      item.productId
                                    }
                                  >
                                    <span>
                                      {item.name} ×{" "}
                                      {item.quantity}
                                    </span>

                                    <strong>
                                      {money(
                                        item.totalPrice,
                                      )}
                                    </strong>
                                  </div>
                                ),
                              )}
                            </div>

                            {order.customerNote && (
                              <div className="establishment-description">
                                <span>
                                  ملاحظة العميل
                                </span>
                                <p>
                                  {order.customerNote}
                                </p>
                              </div>
                            )}

                            {canManageOrders(currentRole) &&
                              [
                                "pending",
                                "confirmed",
                                "preparing",
                                "ready_for_pickup",
                              ].includes(order.status) && (
                              <div className="captain-actions">
                                <select
                                  value={
                                    selectedCaptain[order._id] || ""
                                  }
                                  onChange={(e) =>
                                    setSelectedCaptain(
                                      (current) => ({
                                        ...current,
                                        [order._id]:
                                          e.target.value,
                                      }),
                                    )
                                  }
                                  disabled={saving}
                                >
                                  <option value="">
                                    اختر الكابتن
                                  </option>

                                  {captains
                                    .filter(
                                      (captain) =>
                                        captain.status === "active" ||
                                        captain.status === undefined,
                                    )
                                    .map((captain) => (
                                      <option
                                        key={captain._id}
                                        value={captain._id}
                                      >
                                        {captain.fullName}
                                        {captain.isOnline
                                          ? " — متصل"
                                          : ""}
                                      </option>
                                    ))}
                                </select>

                                <button
                                  type="button"
                                  className="captain-action approve"
                                  disabled={
                                    saving ||
                                    !selectedCaptain[order._id]
                                  }
                                  onClick={() =>
                                    assignCaptain(order._id)
                                  }
                                >
                                  <Truck size={16} />
                                  إسناد الكابتن
                                </button>
                              </div>
                            )}

                            <div className="captain-actions">
                              {order.status ===
                                "pending" && (
                                <>
                                  <button
                                    type="button"
                                    className="captain-action approve"
                                    disabled={saving}
                                    onClick={() =>
                                      updateStatus(
                                        order,
                                        "confirmed",
                                      )
                                    }
                                  >
                                    <Check size={16} />
                                    تأكيد الطلب
                                  </button>

                                  <button
                                    type="button"
                                    className="captain-action reject"
                                    disabled={saving}
                                    onClick={() =>
                                      updateStatus(
                                        order,
                                        "rejected",
                                      )
                                    }
                                  >
                                    <X size={16} />
                                    رفض الطلب
                                  </button>
                                </>
                              )}

                              {order.status ===
                                "confirmed" && (
                                <button
                                  type="button"
                                  className="captain-action edit"
                                  disabled={saving}
                                  onClick={() =>
                                    updateStatus(
                                      order,
                                      "preparing",
                                    )
                                  }
                                >
                                  بدء التجهيز
                                </button>
                              )}

                              {order.status ===
                                "preparing" && (
                                <button
                                  type="button"
                                  className="captain-action edit"
                                  disabled={saving}
                                  onClick={() =>
                                    updateStatus(
                                      order,
                                      "ready_for_pickup",
                                    )
                                  }
                                >
                                  جاهز للاستلام
                                </button>
                              )}

                              {order.status ===
                                "on_the_way" && (
                                <div className="captain-action edit">
                                  <Truck size={16} />
                                  الطلب في الطريق
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
