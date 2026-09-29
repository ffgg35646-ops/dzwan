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

  return new Date(value).toLocaleString("ar-EG-u-nu-latn", {
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

          {/* Header */}
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              marginTop: 18,
              marginBottom: 22,
              padding: "28px 30px",
              borderRadius: 24,
              background:
                "linear-gradient(135deg, #D96C16 0%, #F28C28 58%, #F6B56F 100%)",
              boxShadow:
                "0 14px 34px rgba(37, 99, 235, 0.16)",
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
              }}
            >
              <div>
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
                  <Users size={16} />
                  إدارة الكباتن
                </div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: 30,
                    lineHeight: 1.2,
                    fontWeight: 950,
                  }}
                >
                  الكباتن
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
                  إدارة الحسابات، متابعة حالة الكباتن، ومراجعة
                  الطلبات الخاصة بكل كابتن في مكان واحد.
                </p>
              </div>

              <div
                style={{
                  width: 68,
                  height: 68,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 20,
                  background: "rgba(255,255,255,0.13)",
                  border:
                    "1px solid rgba(255,255,255,0.18)",
                }}
              >
                <Users size={32} />
              </div>
            </div>
          </section>

          {error && (
            <div
              style={{
                marginBottom: 20,
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

          {/* KPIs */}
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              marginBottom: 22,
            }}
          >
            {[
              {
                title: "إجمالي الكباتن",
                value: captains.length,
                icon: <Users size={20} />,
                bg: "#EEF4FF",
                color: "#F28C28",
              },
              {
                title: "كباتن نشطون",
                value: activeCount,
                icon: <UserCheck size={20} />,
                bg: "#ECFDF3",
                color: "#15803D",
              },
              {
                title: "قيد المراجعة",
                value: pendingCount,
                icon: <Loader2 size={20} />,
                bg: "#FFF7ED",
                color: "#C2410C",
              },
              {
                title: "متصلون الآن",
                value: onlineCount,
                icon: <Check size={20} />,
                bg: "#ECFEFF",
                color: "#0F766E",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E4EAF2",
                  borderRadius: 18,
                  padding: 18,
                  boxShadow:
                    "0 7px 22px rgba(15, 23, 42, 0.035)",
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
                  <span
                    style={{
                      color: "#64748B",
                      fontSize: 13,
                      fontWeight: 850,
                    }}
                  >
                    {item.title}
                  </span>

                  <div
                    style={{
                      width: 40,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      background: item.bg,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: 15,
                    fontSize: 27,
                    lineHeight: 1,
                    color: "#172033",
                    fontWeight: 950,
                  }}
                >
                  {item.value}
                </strong>
              </div>
            ))}
          </section>

          {/* Captains */}
          <section
            style={{
              background: "#FFFFFF",
              border: "1px solid #E4EAF2",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow:
                "0 9px 28px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                padding: "19px 22px",
                borderBottom: "1px solid #EDF1F5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 950,
                    color: "#172033",
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
                  اضغط على الكابتن لعرض البيانات والطلبات والإجراءات.
                </p>
              </div>

              <span
                style={{
                  minWidth: 42,
                  height: 34,
                  padding: "0 11px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  background: "#F1F5F9",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {captains.length}
              </span>
            </div>

            {loading ? (
              <div
                style={{
                  padding: 54,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  color: "#64748B",
                  fontWeight: 800,
                }}
              >
                <Loader2
                  size={30}
                  className="location-spin"
                />
                جارٍ تحميل الكباتن...
              </div>
            ) : captains.length === 0 ? (
              <div
                style={{
                  padding: 54,
                  textAlign: "center",
                  color: "#64748B",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    margin: "0 auto 12px",
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background: "#FFF3E6",
                    color: "#F28C28",
                  }}
                >
                  <Users size={26} />
                </div>

                <h3
                  style={{
                    margin: 0,
                    color: "#334155",
                    fontSize: 16,
                    fontWeight: 950,
                  }}
                >
                  لا يوجد كباتن حتى الآن
                </h3>

                <p
                  style={{
                    margin: "7px 0 0",
                    fontSize: 13,
                  }}
                >
                  عندما يتم تسجيل كابتن سيظهر هنا.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 14,
                }}
              >
                {captains.map((captain) => {
                  const isOpen = openId === captain._id;

                  const rawOrders =
                    captainOrders[captain._id];

                  const orders =
                    rawOrders &&
                    !Array.isArray(rawOrders)
                      ? {
                          completed:
                            Array.isArray(rawOrders.completed)
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
                      key={captain._id}
                      style={{
                        border: "1px solid #E5EAF2",
                        borderRadius: 18,
                        background: "#FFFFFF",
                        overflow: "hidden",
                      }}
                    >
                      {/* Captain row */}
                      <div
                        style={{
                          minHeight: 76,
                          display: "grid",
                          gridTemplateColumns:
                            "auto auto minmax(180px,1fr) auto auto auto auto",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 15px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenId(
                              isOpen
                                ? null
                                : captain._id,
                            )
                          }
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: "1px solid #DCE3EC",
                            background: "#F8FAFC",
                            color: "#475569",
                            display: "grid",
                            placeItems: "center",
                            cursor: "pointer",
                          }}
                        >
                          {isOpen ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>

                        <div
                          style={{
                            width: 50,
                            height: 50,
                            borderRadius: 15,
                            overflow: "hidden",
                            display: "grid",
                            placeItems: "center",
                            background: "#FFF0DF",
                            color: "#F28C28",
                            fontSize: 18,
                            fontWeight: 950,
                            flexShrink: 0,
                          }}
                        >
                          {captain.avatarUrl ? (
                            <img
                              src={captain.avatarUrl}
                              alt=""
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            captain.fullName
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <strong
                            style={{
                              display: "block",
                              color: "#172033",
                              fontSize: 15,
                              fontWeight: 950,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {captain.fullName}
                          </strong>

                          <span
                            style={{
                              display: "block",
                              marginTop: 4,
                              color: "#64748B",
                              fontSize: 12,
                              direction: "ltr",
                              textAlign: "right",
                            }}
                          >
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

                      {/* Details */}
                      {isOpen && (
                        <div
                          style={{
                            borderTop:
                              "1px solid #EDF1F5",
                            background: "#FBFCFE",
                            padding: 18,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(190px, 1fr))",
                              gap: 10,
                              marginBottom: 16,
                            }}
                          >
                            {[
                              [
                                "البريد الإلكتروني",
                                captain.email || "غير مضاف",
                              ],
                              [
                                "رقم الهاتف",
                                captain.phone,
                              ],
                              [
                                "تاريخ التسجيل",
                                formatDate(
                                  captain.createdAt,
                                ),
                              ],
                              [
                                "آخر دخول",
                                formatDate(
                                  captain.lastLoginAt,
                                ),
                              ],
                              [
                                "آخر ظهور",
                                formatDate(
                                  captain.lastSeenAt,
                                ),
                              ],
                              [
                                "تاريخ القبول",
                                formatDate(
                                  captain.approvedAt,
                                ),
                              ],
                            ].map(([label, value]) => (
                              <div
                                key={String(label)}
                                style={{
                                  background: "#FFFFFF",
                                  border:
                                    "1px solid #E7ECF2",
                                  borderRadius: 12,
                                  padding: "11px 13px",
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: 11,
                                    color: "#94A3B8",
                                    fontWeight: 800,
                                    marginBottom: 5,
                                  }}
                                >
                                  {label}
                                </span>

                                <strong
                                  style={{
                                    display: "block",
                                    fontSize: 13,
                                    color: "#334155",
                                    fontWeight: 850,
                                  }}
                                >
                                  {value}
                                </strong>
                              </div>
                            ))}
                          </div>

                          {captain.rejectionReason && (
                            <div
                              className="captain-reason"
                              style={{
                                marginBottom: 12,
                              }}
                            >
                              <span>سبب الرفض</span>
                              <strong>
                                {captain.rejectionReason}
                              </strong>
                            </div>
                          )}

                          {captain.suspensionReason && (
                            <div
                              className="captain-reason"
                              style={{
                                marginBottom: 12,
                              }}
                            >
                              <span>سبب الإيقاف</span>
                              <strong>
                                {captain.suspensionReason}
                              </strong>
                            </div>
                          )}

                          {/* Orders tables */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(330px, 1fr))",
                              gap: 14,
                              marginBottom: 16,
                            }}
                          >
                            {/* Completed */}
                            <div
                              style={{
                                background: "#FFFFFF",
                                border:
                                  "1px solid #E2E8F0",
                                borderRadius: 15,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  padding: "13px 15px",
                                  borderBottom:
                                    "1px solid #E2E8F0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent:
                                    "space-between",
                                  gap: 10,
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize: 14,
                                    color: "#172033",
                                    fontWeight: 950,
                                  }}
                                >
                                  الطلبات المكتملة
                                </strong>

                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: "#64748B",
                                  }}
                                >
                                  {orders.completed.length}
                                </span>
                              </div>

                              {orders.completed.length > 0 ? (
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
                                            "#F8FAFC",
                                        }}
                                      >
                                        <th
                                          style={{
                                            textAlign: "right",
                                            padding:
                                              "11px 14px",
                                            fontSize: 12,
                                            color: "#64748B",
                                            borderBottom:
                                              "1px solid #E2E8F0",
                                          }}
                                        >
                                          رقم الطلب
                                        </th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {orders.completed.map(
                                        (orderNumber) => (
                                          <tr
                                            key={`completed-${orderNumber}`}
                                          >
                                            <td
                                              style={{
                                                padding:
                                                  "11px 14px",
                                                borderBottom:
                                                  "1px solid #F1F5F9",
                                                fontWeight: 900,
                                                color: "#172033",
                                              }}
                                            >
                                              #{orderNumber}
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
                                    padding: "20px 14px",
                                    color: "#94A3B8",
                                    fontSize: 13,
                                    fontWeight: 700,
                                  }}
                                >
                                  لا توجد طلبات مكتملة.
                                </div>
                              )}
                            </div>

                            {/* Cancelled + Rejected */}
                            <div
                              style={{
                                background: "#FFFFFF",
                                border:
                                  "1px solid #E2E8F0",
                                borderRadius: 15,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  padding: "13px 15px",
                                  borderBottom:
                                    "1px solid #E2E8F0",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent:
                                    "space-between",
                                  gap: 10,
                                }}
                              >
                                <strong
                                  style={{
                                    fontSize: 14,
                                    color: "#172033",
                                    fontWeight: 950,
                                  }}
                                >
                                  الطلبات الملغاة والمرفوضة
                                </strong>

                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: "#64748B",
                                  }}
                                >
                                  {
                                    orders
                                      .cancelledRejected
                                      .length
                                  }
                                </span>
                              </div>

                              {orders.cancelledRejected.length >
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
                                            "#F8FAFC",
                                        }}
                                      >
                                        <th
                                          style={{
                                            textAlign: "right",
                                            padding:
                                              "11px 14px",
                                            fontSize: 12,
                                            color: "#64748B",
                                            borderBottom:
                                              "1px solid #E2E8F0",
                                          }}
                                        >
                                          رقم الطلب
                                        </th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {orders.cancelledRejected.map(
                                        (orderNumber) => (
                                          <tr
                                            key={`cancelled-rejected-${orderNumber}`}
                                          >
                                            <td
                                              style={{
                                                padding:
                                                  "11px 14px",
                                                borderBottom:
                                                  "1px solid #F1F5F9",
                                                fontWeight: 900,
                                                color: "#172033",
                                              }}
                                            >
                                              #{orderNumber}
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
                                    padding: "20px 14px",
                                    color: "#94A3B8",
                                    fontSize: 13,
                                    fontWeight: 700,
                                  }}
                                >
                                  لا توجد طلبات ملغاة أو مرفوضة.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="captain-actions">
                            {captain.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  className="captain-action approve"
                                  disabled={saving}
                                  onClick={() =>
                                    approveCaptain(captain)
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
    </div>

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
  );
}
