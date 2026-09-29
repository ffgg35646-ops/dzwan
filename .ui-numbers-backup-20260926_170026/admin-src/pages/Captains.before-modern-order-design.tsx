import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Phone,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageCaptains } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";
type CaptainStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

interface Captain {
  _id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: "captain";
  status: CaptainStatus;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeenAt?: string | null;
  lastLoginAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CaptainOrder {
  _id?: string;
  orderNumber?: string | number | null;
  captainId?: string | { _id?: string | null } | null;
  status?: string | null;
}

const statusLabels: Record<CaptainStatus, string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
  inactive: "غير نشط",
};

function statusClass(status: CaptainStatus) {
  return `captain-status ${status}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Captains() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);
  const [captainOrders, setCaptainOrders] =
    useState<
      Record<
        string,
        {
          completed: string[];
          cancelledRejected: string[];
        }
      >
    >({});

  const [editCaptain, setEditCaptain] = useState<Captain | null>(null);
  const [rejectCaptain, setRejectCaptain] = useState<Captain | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<CaptainStatus>("active");

  async function loadCaptains() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/captains");

      const captainList: Captain[] =
        Array.isArray(response.data?.captains)
          ? response.data.captains
          : [];

      setCaptains(captainList);

      try {
        const ordersResponse = await api.get("/orders");

        const rawOrders: CaptainOrder[] =
          Array.isArray(ordersResponse.data?.orders)
            ? ordersResponse.data.orders
            : Array.isArray(ordersResponse.data?.data)
              ? ordersResponse.data.data
              : Array.isArray(ordersResponse.data)
                ? ordersResponse.data
                : [];

        const grouped: Record<
          string,
          {
            completed: string[];
            cancelledRejected: string[];
          }
        > = {};

        for (const order of rawOrders) {
          const status = String(order.status || "");

          const isCompleted =
            status === "completed" ||
            status === "delivered";

          const isCancelledRejected =
            status === "cancelled" ||
            status === "rejected";

          if (!isCompleted && !isCancelledRejected) {
            continue;
          }

          const captainValue = order.captainId;

          const captainKey =
            typeof captainValue === "string"
              ? captainValue
              : captainValue?._id
                ? String(captainValue._id)
                : "";

          const orderNumber = String(
            order.orderNumber ?? "",
          ).trim();

          if (!captainKey || !orderNumber) {
            continue;
          }

          grouped[captainKey] ??= {
            completed: [],
            cancelledRejected: [],
          };

          if (isCompleted) {
            grouped[captainKey].completed.push(orderNumber);
          } else {
            grouped[captainKey].cancelledRejected.push(
              orderNumber,
            );
          }
        }

        for (const key of Object.keys(grouped)) {
          grouped[key].completed = [
            ...new Set(grouped[key].completed),
          ];

          grouped[key].cancelledRejected = [
            ...new Set(grouped[key].cancelledRejected),
          ];
        }

        setCaptainOrders(grouped);
      } catch (ordersError) {
        console.error(
          "Captain orders loading error:",
          ordersError,
        );
        setCaptainOrders({});
      }
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل الكباتن."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCurrentRole() {
      try {
        const response = await api.get("/auth/me");
        setCurrentRole(
          response.data?.user?.role,
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "Role loading error:",
            error,
          );
        }
      }
    }

    void loadCurrentRole();
  }, []);

  useEffect(() => {
    loadCaptains();
  }, []);

  async function approveCaptain(captain: Captain) {
    if (!canManageCaptains(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة الكباتن.",
      );
      return;
    }


    try {
      setSaving(true);
      setError("");

      await api.post(`/captains/${captain._id}/approve`);
      await loadCaptains();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر قبول الكابتن."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function rejectSelectedCaptain() {
    if (!rejectCaptain) return;

    if (!canManageCaptains(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة الكباتن.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/captains/${rejectCaptain._id}/reject`,
        {
          reason: rejectReason.trim(),
        },
      );

      setRejectCaptain(null);
      setRejectReason("");

      await loadCaptains();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر رفض الكابتن."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editCaptain) return;

    try {
      setSaving(true);
      setError("");

      await api.patch(`/captains/${editCaptain._id}`, {
        fullName: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        status: editStatus,
      });

      setEditCaptain(null);
      await loadCaptains();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحديث بيانات الكابتن."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCaptain(captain: Captain) {
    if (!canManageCaptains(currentRole)) {
      setError(
        "ليس لديك صلاحية لحذف الكباتن.",
      );
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الكابتن "${captain.fullName}"؟`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      await api.delete(`/captains/${captain._id}`);
      await loadCaptains();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر حذف الكابتن."),
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(captain: Captain) {
    setEditCaptain(captain);
    setEditName(captain.fullName);
    setEditPhone(captain.phone);
    setEditEmail(captain.email || "");
    setEditStatus(captain.status);
  }

  const pendingCount = captains.filter(
    (item) => item.status === "pending",
  ).length;

  const activeCount = captains.filter(
    (item) => item.status === "active",
  ).length;

  const onlineCount = captains.filter(
    (item) => item.isOnline,
  ).length;

  return (
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
<div className="admin-content">

          <HomeBackButton />
          <div className="dashboard">

            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  إدارة الكباتن
                </span>

                <h1>الكباتن</h1>

                <p>
                  إدارة حسابات الكباتن ومراجعة طلبات الانضمام
                  وحالات الحسابات.
                </p>
              </div>

              <div className="captains-intro-icon">
                <Users size={24} />
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>إجمالي الكباتن</span>
                <strong>{captains.length}</strong>
              </div>

              <div className="location-summary-card">
                <span>كباتن نشطون</span>
                <strong>{activeCount}</strong>
              </div>

              <div className="location-summary-card">
                <span>قيد المراجعة</span>
                <strong>{pendingCount}</strong>
              </div>

              <div className="location-summary-card">
                <span>متصلون الآن</span>
                <strong>{onlineCount}</strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div className="panel-header">
                <div>
                  <h2>قائمة الكباتن</h2>
                  <p>
                    اضغط على الكابتن لعرض التفاصيل والإجراءات.
                  </p>
                </div>

                <Users
                  size={19}
                  className="panel-muted-icon"
                />
              </div>

              {loading ? (
                <div className="locations-loading">
                  <Loader2
                    size={27}
                    className="location-spin"
                  />
                  <span>جارٍ تحميل الكباتن...</span>
                </div>
              ) : captains.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <Users size={25} />
                  </div>

                  <h3>لا يوجد كباتن حتى الآن</h3>

                  <p>
                    عندما يتم تسجيل كابتن سيظهر هنا.
                  </p>
                </div>
              ) : (
                <div className="captains-list">
                  {captains.map((captain) => {
                    const isOpen =
                      openId === captain._id;

                    return (
                      <div
                        className="captain-item"
                        key={captain._id}
                      >
                        <div className="captain-row">

                          <button
                            type="button"
                            className="governorate-expand"
                            onClick={() =>
                              setOpenId(
                                isOpen
                                  ? null
                                  : captain._id,
                              )
                            }
                          >
                            {isOpen ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>

                          <div className="captain-avatar">
                            {captain.avatarUrl ? (
                              <img
                                src={captain.avatarUrl}
                                alt=""
                              />
                            ) : (
                              captain.fullName
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="captain-info">
                            <strong>
                              {captain.fullName}
                            </strong>

                            <span>
                              {captain.phone}
                            </span>
                          </div>

                          <span
                            className={statusClass(
                              captain.status,
                            )}
                          >
                            {statusLabels[captain.status]}
                          </span>

                          <span
                            className={
                              captain.isOnline
                                ? "captain-online online"
                                : "captain-online"
                            }
                          >
                            <span />
                            {captain.isOnline
                              ? "متصل"
                              : "غير متصل"}
                          </span>

                          <button
                            type="button"
                            className="location-icon-button"
                            title="تعديل"
                            onClick={() =>
                              openEdit(captain)
                            }
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            className="location-icon-button danger"
                            title="حذف"
                            disabled={saving}
                            onClick={() =>
                              deleteCaptain(captain)
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {isOpen && (
                          <div className="captain-details">

                            <div className="captain-details-grid">
                              <div>
                                <span>البريد الإلكتروني</span>
                                <strong>
                                  {captain.email || "غير مضاف"}
                                </strong>
                              </div>

                              <div>
                                <span>رقم الهاتف</span>
                                <strong>
                                  {captain.phone}
                                </strong>
                              </div>

                              <div>
                                <span>تاريخ التسجيل</span>
                                <strong>
                                  {formatDate(
                                    captain.createdAt,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>آخر دخول</span>
                                <strong>
                                  {formatDate(
                                    captain.lastLoginAt,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>آخر ظهور</span>
                                <strong>
                                  {formatDate(
                                    captain.lastSeenAt,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>تاريخ القبول</span>
                                <strong>
                                  {formatDate(
                                    captain.approvedAt,
                                  )}
                                </strong>
                              </div>
                            </div>

                            {captain.rejectionReason && (
                              <div className="captain-reason">
                                <span>سبب الرفض</span>
                                <strong>
                                  {captain.rejectionReason}
                                </strong>
                              </div>
                            )}

                            {captain.suspensionReason && (
                              <div className="captain-reason">
                                <span>سبب الإيقاف</span>
                                <strong>
                                  {captain.suspensionReason}
                                </strong>
                              </div>
                            )}

                            {(() => {
                              const rawOrders =
                                captainOrders[captain._id];

                              const orders =
                                rawOrders &&
                                !Array.isArray(rawOrders)
                                  ? {
                                      completed:
                                        Array.isArray(
                                          rawOrders.completed,
                                        )
                                          ? rawOrders.completed
                                          : [],
                                      cancelledRejected:
                                        Array.isArray(
                                          rawOrders.cancelledRejected,
                                        )
                                          ? rawOrders.cancelledRejected
                                          : [],
                                    }
                                  : {
                                      completed: [],
                                      cancelledRejected: [],
                                    };

                              return (
                                <div
                                  style={{
                                    marginTop: 18,
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(280px, 1fr))",
                                    gap: 14,
                                  }}
                                >
                                  <div
                                    style={{
                                      border:
                                        "1px solid #DCEFE2",
                                      borderRadius: 14,
                                      overflow: "hidden",
                                      background: "#FFFFFF",
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding:
                                          "13px 15px",
                                        background:
                                          "#F0FDF4",
                                        borderBottom:
                                          "1px solid #DCEFE2",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent:
                                          "space-between",
                                        gap: 10,
                                      }}
                                    >
                                      <strong
                                        style={{
                                          color: "#166534",
                                          fontSize: 14,
                                        }}
                                      >
                                        الطلبات المكتملة
                                      </strong>

                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 900,
                                          color: "#166534",
                                        }}
                                      >
                                        {orders.completed.length}
                                      </span>
                                    </div>

                                    {orders.completed.length >
                                    0 ? (
                                      <div
                                        style={{
                                          overflowX: "auto",
                                        }}
                                      >
                                        <table
                                          style={{
                                            width: "100%",
                                            borderCollapse:
                                              "collapse",
                                          }}
                                        >
                                          <thead>
                                            <tr
                                              style={{
                                                background:
                                                  "#FAFFFB",
                                              }}
                                            >
                                              <th
                                                style={{
                                                  textAlign:
                                                    "right",
                                                  padding:
                                                    "10px 14px",
                                                  fontSize: 12,
                                                  color:
                                                    "#64748B",
                                                  borderBottom:
                                                    "1px solid #EDF5EF",
                                                }}
                                              >
                                                رقم الطلب
                                              </th>
                                            </tr>
                                          </thead>

                                          <tbody>
                                            {orders.completed.map(
                                              (
                                                orderNumber,
                                              ) => (
                                                <tr
                                                  key={`completed-${orderNumber}`}
                                                >
                                                  <td
                                                    style={{
                                                      padding:
                                                        "11px 14px",
                                                      borderBottom:
                                                        "1px solid #F1F5F3",
                                                      fontWeight:
                                                        900,
                                                      color:
                                                        "#172033",
                                                    }}
                                                  >
                                                    #
                                                    {
                                                      orderNumber
                                                    }
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
                                          padding:
                                            "22px 14px",
                                          color:
                                            "#64748B",
                                          fontSize: 13,
                                        }}
                                      >
                                        لا توجد طلبات مكتملة.
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      border:
                                        "1px solid #F3D6D6",
                                      borderRadius: 14,
                                      overflow: "hidden",
                                      background: "#FFFFFF",
                                    }}
                                  >
                                    <div
                                      style={{
                                        padding:
                                          "13px 15px",
                                        background:
                                          "#FFF7F7",
                                        borderBottom:
                                          "1px solid #F3D6D6",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent:
                                          "space-between",
                                        gap: 10,
                                      }}
                                    >
                                      <strong
                                        style={{
                                          color: "#B42318",
                                          fontSize: 14,
                                        }}
                                      >
                                        الطلبات الملغاة والمرفوضة
                                      </strong>

                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 900,
                                          color: "#B42318",
                                        }}
                                      >
                                        {
                                          orders
                                            .cancelledRejected
                                            .length
                                        }
                                      </span>
                                    </div>

                                    {orders.cancelledRejected
                                      .length > 0 ? (
                                      <div
                                        style={{
                                          overflowX: "auto",
                                        }}
                                      >
                                        <table
                                          style={{
                                            width: "100%",
                                            borderCollapse:
                                              "collapse",
                                          }}
                                        >
                                          <thead>
                                            <tr
                                              style={{
                                                background:
                                                  "#FFFBFB",
                                              }}
                                            >
                                              <th
                                                style={{
                                                  textAlign:
                                                    "right",
                                                  padding:
                                                    "10px 14px",
                                                  fontSize: 12,
                                                  color:
                                                    "#64748B",
                                                  borderBottom:
                                                    "1px solid #F6EEEE",
                                                }}
                                              >
                                                رقم الطلب
                                              </th>
                                            </tr>
                                          </thead>

                                          <tbody>
                                            {orders.cancelledRejected.map(
                                              (
                                                orderNumber,
                                              ) => (
                                                <tr
                                                  key={`cancelled-rejected-${orderNumber}`}
                                                >
                                                  <td
                                                    style={{
                                                      padding:
                                                        "11px 14px",
                                                      borderBottom:
                                                        "1px solid #F7F2F2",
                                                      fontWeight:
                                                        900,
                                                      color:
                                                        "#172033",
                                                    }}
                                                  >
                                                    #
                                                    {
                                                      orderNumber
                                                    }
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
                                          padding:
                                            "22px 14px",
                                          color:
                                            "#64748B",
                                          fontSize: 13,
                                        }}
                                      >
                                        لا توجد طلبات ملغاة أو مرفوضة.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="captain-actions">

                              {captain.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    className="captain-action approve"
                                    disabled={saving}
                                    onClick={() =>
                                      approveCaptain(
                                        captain,
                                      )
                                    }
                                  >
                                    <Check size={16} />
                                    قبول الكابتن
                                  </button>

                                  <button
                                    type="button"
                                    className="captain-action reject"
                                    disabled={saving}
                                    onClick={() => {
                                      setRejectCaptain(
                                        captain,
                                      );
                                      setRejectReason("");
                                    }}
                                  >
                                    <X size={16} />
                                    رفض الكابتن
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                className="captain-action edit"
                                onClick={() =>
                                  openEdit(captain)
                                }
                              >
                                <Pencil size={16} />
                                تعديل البيانات
                              </button>

                              <div className="captain-phone">
                                <Phone size={15} />
                                {captain.phone}
                              </div>
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

      {editCaptain && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>تعديل الكابتن</span>
                <h2>{editCaptain.fullName}</h2>
              </div>

              <button
                type="button"
                onClick={() => setEditCaptain(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label>
                الاسم الكامل
                <input
                  value={editName}
                  onChange={(e) =>
                    setEditName(e.target.value)
                  }
                />
              </label>

              <label>
                رقم الهاتف
                <input
                  value={editPhone}
                  onChange={(e) =>
                    setEditPhone(e.target.value)
                  }
                />
              </label>

              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) =>
                    setEditEmail(e.target.value)
                  }
                />
              </label>

              <label>
                الحالة
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value as CaptainStatus,
                    )
                  }
                >
                  {Object.entries(statusLabels).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() => setEditCaptain(null)}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="location-spin"
                  />
                ) : (
                  <UserCheck size={16} />
                )}
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectCaptain && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>رفض طلب الكابتن</span>
                <h2>{rejectCaptain.fullName}</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRejectCaptain(null);
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
                  onChange={(e) =>
                    setRejectReason(e.target.value)
                  }
                  placeholder="اكتب سبب رفض الكابتن..."
                  rows={4}
                  autoFocus
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setRejectCaptain(null);
                  setRejectReason("");
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={rejectSelectedCaptain}
              >
                {saving ? (
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
