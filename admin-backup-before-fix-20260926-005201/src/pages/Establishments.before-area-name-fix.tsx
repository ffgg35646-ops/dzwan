
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageEstablishments } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";
type EstablishmentType = "restaurant" | "shop";

type EstablishmentStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

interface Establishment {
  _id: string;
  name: string;
  type: EstablishmentType;
  status: EstablishmentStatus;
  phone: string;
  email?: string | null;
  address: string;
  governorateId?: {
    _id: string;
    name: string;
  } | string | null;
  areaId?: string | null;
  ownerUserId?: {
    _id: string;
    fullName: string;
    phone?: string;
    email?: string;
    role?: string;
    status?: string;
  } | string | null;
  captainId?: {
    _id: string;
    fullName: string;
    phone?: string;
    status?: string;
    governorateId?: string | null;
    areaId?: string | null;
  } | string | null;
  description?: string | null;
  logoUrl?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<EstablishmentStatus, string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
  inactive: "غير نشط",
};

const typeLabels: Record<EstablishmentType, string> = {
  restaurant: "مطعم",
  shop: "محل",
};

function statusClass(status: EstablishmentStatus) {
  return `establishment-status ${status}`;
}

function statusColors(status: EstablishmentStatus) {
  if (status === "active") {
    return {
      bg: "#ECFDF3",
      color: "#15803D",
      border: "#B7E4C7",
    };
  }

  if (status === "suspended") {
    return {
      bg: "#FFF7ED",
      color: "#C2410C",
      border: "#FED7AA",
    };
  }

  if (status === "rejected") {
    return {
      bg: "#FFF1F2",
      color: "#B42318",
      border: "#F5C2C7",
    };
  }

  if (status === "inactive") {
    return {
      bg: "#F1F5F9",
      color: "#475569",
      border: "#CBD5E1",
    };
  }

  return {
    bg: "#FFF8F1",
    color: "#D96C16",
    border: "#F1C79F",
  };
}


function getGovernorateName(
  value: Establishment["governorateId"],
) {
  if (!value) return "غير محددة";
  if (typeof value === "string") return value;
  return value.name;
}

function getCaptainName(
  value: Establishment["captainId"],
) {
  if (!value) return "غير معين";
  if (typeof value === "string") return value;
  return value.fullName;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Establishments() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);

  const [typeFilter, setTypeFilter] = useState<
    "all" | EstablishmentType
  >("all");

  const [statusFilter, setStatusFilter] = useState<
    "all" | EstablishmentStatus
  >("all");
  const [search, setSearch] = useState("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [editItem, setEditItem] =
    useState<Establishment | null>(null);

  const [editName, setEditName] = useState("");
  const [editType, setEditType] =
    useState<EstablishmentType>("restaurant");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editStatus, setEditStatus] =
    useState<EstablishmentStatus>("active");
  const [editDescription, setEditDescription] =
    useState("");

  const [rejectItem, setRejectItem] =
    useState<Establishment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function loadItems() {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (typeFilter !== "all") {
        params.type = typeFilter;
      }

      const response = await api.get(
        "/establishments",
        { params },
      );

      const data = Array.isArray(
        response.data?.establishments,
      )
        ? response.data.establishments
        : [];

      setItems(data);
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل المطاعم والمحلات."),
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
    loadItems();
  }, [typeFilter]);

  async function approveItem(
    item: Establishment,
  ) {
    if (!canManageEstablishments(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة المنشآت.",
      );
      return;
    }


    try {
      setSaving(true);
      setError("");

      await api.post(
        `/establishments/${item._id}/approve`,
      );

      await loadItems();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر قبول المنشأة."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function rejectSelectedItem() {
    if (!rejectItem) return;

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/establishments/${rejectItem._id}/reject`,
        {
          reason: rejectReason.trim(),
        },
      );

      setRejectItem(null);
      setRejectReason("");

      await loadItems();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر رفض المنشأة."),
      );
    } finally {
      setSaving(false);
    }
  }

  function openEdit(item: Establishment) {
    setEditItem(item);
    setEditName(item.name);
    setEditType(item.type);
    setEditPhone(item.phone);
    setEditEmail(item.email || "");
    setEditAddress(item.address);
    setEditStatus(item.status);
    setEditDescription(item.description || "");
  }

  async function saveEdit() {
    if (!editItem) return;

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/establishments/${editItem._id}`,
        {
          name: editName.trim(),
          type: editType,
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          address: editAddress.trim(),
          status: editStatus,
          description:
            editDescription.trim() || null,
        },
      );

      setEditItem(null);
      await loadItems();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحديث المنشأة."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccountStatus(item: Establishment) {
    if (!canManageEstablishments(currentRole)) {
      setError("ليس لديك صلاحية لإدارة المنشآت.");
      return;
    }

    if (item.status !== "active" && item.status !== "suspended") {
      return;
    }

    const isSuspended = item.status === "suspended";
    const action = isSuspended ? "reactivate" : "suspend";

    const confirmed = window.confirm(
      isSuspended
        ? `هل تريد فك إيقاف حساب "${item.name}"؟`
        : `هل تريد إيقاف حساب "${item.name}"؟`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/establishments/${item._id}/${action}`,
        isSuspended ? {} : { reason: "" },
      );

      await loadItems();
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          isSuspended
            ? "تعذر فك إيقاف الحساب."
            : "تعذر إيقاف الحساب.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(
    item: Establishment,
  ) {
    if (!canManageEstablishments(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة المنشآت.",
      );
      return;
    }


    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${item.name}"؟`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/establishments/${item._id}`,
      );

      await loadItems();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر حذف المنشأة."),
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (
        statusFilter !== "all" &&
        item.status !== statusFilter
      ) {
        return false;
      }

      if (!q) return true;

      const ownerName =
        item.ownerUserId &&
        typeof item.ownerUserId !== "string"
          ? item.ownerUserId.fullName
          : "";

      return [
        item.name,
        item.phone,
        item.email || "",
        item.address,
        item.areaId || "",
        getGovernorateName(item.governorateId),
        getCaptainName(item.captainId),
        ownerName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, statusFilter, search]);

  const restaurants = items.filter(
    (item) => item.type === "restaurant",
  ).length;

  const shops = items.filter(
    (item) => item.type === "shop",
  ).length;

  const pending = items.filter(
    (item) => item.status === "pending",
  ).length;

  const active = items.filter(
    (item) => item.status === "active",
  ).length;

  return (
    <div
      dir="rtl"
      style={{
        width: "100%",
        maxWidth: 1160,
        margin: "0 auto",
        padding: "18px 24px 44px",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .est-new-kpis {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .est-new-list-row {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 16px 18px;
          background: #fff;
          border-bottom: 1px solid #efe7de;
          transition: background .18s ease;
        }

        .est-new-list-row:hover {
          background: #fffaf5;
        }

        .est-new-details {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .est-new-detail {
          min-width: 0;
          padding: 14px;
          border-radius: 15px;
          border: 1px solid #f2dfcd;
          background: #fff;
        }

        .est-new-search {
          width: 100%;
          max-width: 780px;
          min-height: 54px;
          margin: 0 auto;
          padding: 0 16px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 17px;
          border: 1px solid #f1c79f;
          background: #fff;
          box-shadow: 0 8px 24px rgba(242,140,40,.09);
        }

        @media (max-width: 1100px) {
          .est-new-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .est-new-kpis,
          .est-new-details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .est-new-kpis,
          .est-new-details {
            grid-template-columns: 1fr;
          }

          .est-new-list-row {
            flex-wrap: wrap;
          }
        }
      `}</style>

      <HomeBackButton />

      {/* HEADER */}
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
          boxShadow: "0 14px 34px rgba(242,140,40,.18)",
          color: "#fff",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 230,
            height: 230,
            borderRadius: "50%",
            background: "rgba(255,255,255,.08)",
            top: -135,
            left: -80,
          }}
        />

        <div
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "rgba(255,255,255,.055)",
            bottom: -92,
            right: 100,
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
          <div style={{ flex: "1 1 520px", minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                fontSize: 13,
                fontWeight: 900,
                color: "rgba(255,255,255,.86)",
              }}
            >
              <Store size={16} />
              إدارة المنشآت
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                lineHeight: 1.2,
                fontWeight: 950,
              }}
            >
              المطاعم والمحلات
            </h1>

            <p
              style={{
                margin: "9px 0 0",
                maxWidth: 720,
                fontSize: 14,
                lineHeight: 1.85,
                color: "rgba(255,255,255,.84)",
              }}
            >
              إدارة المنشآت، مراجعة الحالات، متابعة المناطق والكباتن،
              والتحكم في حالة الحساب من مكان واحد.
            </p>
          </div>

          <div
            style={{
              minWidth: 175,
              padding: "15px 18px",
              borderRadius: 20,
              background: "rgba(255,255,255,.13)",
              border: "1px solid rgba(255,255,255,.18)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 800,
                color: "rgba(255,255,255,.82)",
              }}
            >
              إجمالي المنشآت
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
              {items.length}
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

      {/* KPIs */}
      <section className="est-new-kpis" style={{ marginBottom: 18 }}>
        {[
          ["إجمالي المنشآت", items.length],
          ["مطاعم", restaurants],
          ["محلات", shops],
          ["نشطة", active],
          ["قيد المراجعة", pending],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              background: "#fff",
              border: "1px solid #e8e1da",
              borderRadius: 18,
              padding: 18,
              boxShadow: "0 8px 24px rgba(15,23,42,.045)",
            }}
          >
            <span
              style={{
                display: "block",
                color: "#64748b",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              {label}
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 10,
                color:
                  label === "قيد المراجعة"
                    ? "#C2410C"
                    : "#172033",
                fontSize: 28,
                lineHeight: 1,
                fontWeight: 950,
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </section>

      {/* MAIN PANEL */}
      <section
        style={{
          background: "#fff",
          border: "1px solid #e8e1da",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15,23,42,.045)",
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
            borderBottom: "1px solid #efe7de",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#172033",
                fontSize: 19,
                fontWeight: 950,
              }}
            >
              قائمة المنشآت
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#64748b",
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {filteredItems.length} منشأة ظاهرة
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadItems()}
            disabled={loading}
            style={{
              minHeight: 42,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid #f1c79f",
              background: "#fff8f1",
              color: "#d96c16",
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

        {/* SEARCH */}
        <div
          style={{
            padding: 18,
            background: "#fff9f4",
            borderBottom: "1px solid #f3e5d7",
          }}
        >
          <div className="est-new-search">
            <Search
              size={19}
              style={{ color: "#d96c16", flexShrink: 0 }}
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المنشأة أو الهاتف أو البريد أو المنطقة..."
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: 0,
                background: "transparent",
                color: "#172033",
                fontSize: 14,
                fontWeight: 750,
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
                  background: "#fff1e3",
                  color: "#d96c16",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* FILTERS */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            padding: "14px 18px",
            borderBottom: "1px solid #efe7de",
            background: "#fff",
          }}
        >
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(
                event.target.value as
                  | "all"
                  | EstablishmentType,
              );
              setOpenId(null);
            }}
            style={{
              minHeight: 42,
              padding: "0 13px",
              borderRadius: 11,
              border: "1px solid #e7d8ca",
              background: "#fff",
              color: "#172033",
              fontWeight: 800,
              outline: "none",
            }}
          >
            <option value="all">كل الأنواع</option>
            <option value="restaurant">المطاعم</option>
            <option value="shop">المحلات</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value as
                  | "all"
                  | EstablishmentStatus,
              );
              setOpenId(null);
            }}
            style={{
              minHeight: 42,
              padding: "0 13px",
              borderRadius: 11,
              border: "1px solid #e7d8ca",
              background: "#fff",
              color: "#172033",
              fontWeight: 800,
              outline: "none",
            }}
          >
            <option value="all">كل الحالات</option>

            {Object.entries(statusLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>

        {/* LIST */}
        {loading ? (
          <div
            style={{
              minHeight: 280,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <div>
              <Loader2
                size={32}
                className="location-spin"
                style={{ marginBottom: 10 }}
              />
              <div style={{ fontWeight: 850 }}>
                جارٍ تحميل المنشآت...
              </div>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              minHeight: 280,
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
                  background: "#fff1e3",
                  color: "#d96c16",
                }}
              >
                <Store size={24} />
              </div>

              <h3
                style={{
                  margin: 0,
                  color: "#172033",
                  fontSize: 17,
                  fontWeight: 950,
                }}
              >
                لا توجد منشآت
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                لا توجد بيانات مطابقة للبحث أو الفلاتر الحالية.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {filteredItems.map((item) => {
              const isOpen = openId === item._id;
              const colors = statusColors(item.status);

              return (
                <div key={item._id}>
                  <div className="est-new-list-row">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenId(
                          isOpen ? null : item._id,
                        )
                      }
                      style={{
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid #f1dfce",
                        borderRadius: 11,
                        background: "#fff8f1",
                        color: "#d96c16",
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
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 14,
                        background: "#fff1e3",
                        color: "#d96c16",
                        border: "1px solid #f2d4b6",
                      }}
                    >
                      {item.logoUrl ? (
                        <img
                          src={item.logoUrl}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : item.type === "restaurant" ? (
                        <UtensilsCrossed size={21} />
                      ) : (
                        <Store size={21} />
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 170,
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          color: "#172033",
                          fontSize: 15,
                          fontWeight: 950,
                        }}
                      >
                        {item.name}
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: 4,
                          color: "#64748b",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {typeLabels[item.type]} · {item.phone}
                      </span>
                    </div>

                    <span
                      style={{
                        flexShrink: 0,
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: colors.bg,
                        color: colors.color,
                        border: `1px solid ${colors.border}`,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {statusLabels[item.status]}
                    </span>

                    <span
                      style={{
                        minWidth: 100,
                        color: "#64748b",
                        fontSize: 12,
                        fontWeight: 750,
                      }}
                    >
                      {getGovernorateName(
                        item.governorateId,
                      )}
                    </span>

                    <button
                      type="button"
                      title="تعديل"
                      onClick={() => openEdit(item)}
                      style={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid #f1d5b9",
                        borderRadius: 11,
                        background: "#fff8f1",
                        color: "#d96c16",
                        cursor: "pointer",
                      }}
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      title="حذف"
                      disabled={saving}
                      onClick={() =>
                        void deleteItem(item)
                      }
                      style={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid #f2caca",
                        borderRadius: 11,
                        background: "#fff4f4",
                        color: "#b42318",
                        cursor: saving
                          ? "not-allowed"
                          : "pointer",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        padding: "0 18px 20px",
                        background: "#fffdfb",
                        borderBottom:
                          "1px solid #efe7de",
                      }}
                    >
                      <div
                        style={{
                          height: 1,
                          background: "#f1e7dd",
                          marginBottom: 16,
                        }}
                      />

                      <div className="est-new-details">
                        {[
                          ["الهاتف", item.phone],
                          [
                            "البريد الإلكتروني",
                            item.email || "غير مضاف",
                          ],
                          [
                            "النوع",
                            typeLabels[item.type],
                          ],
                          [
                            "المحافظة",
                            getGovernorateName(
                              item.governorateId,
                            ),
                          ],
                          [
                            "المنطقة",
                            item.areaId || "غير محددة",
                          ],
                          [
                            "الكابتن",
                            getCaptainName(
                              item.captainId,
                            ),
                          ],
                          [
                            "تاريخ الإنشاء",
                            formatDate(
                              item.createdAt,
                            ),
                          ],
                          [
                            "آخر تحديث",
                            formatDate(
                              item.updatedAt,
                            ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            className="est-new-detail"
                          >
                            <span
                              style={{
                                display: "block",
                                color: "#d96c16",
                                fontSize: 11,
                                fontWeight: 900,
                              }}
                            >
                              {label}
                            </span>

                            <strong
                              style={{
                                display: "block",
                                marginTop: 7,
                                color: "#172033",
                                fontSize: 13,
                                lineHeight: 1.6,
                                wordBreak: "break-word",
                              }}
                            >
                              {String(value)}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div
                        className="est-new-detail"
                        style={{ marginTop: 12 }}
                      >
                        <span
                          style={{
                            display: "block",
                            color: "#d96c16",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          العنوان
                        </span>

                        <strong
                          style={{
                            display: "block",
                            marginTop: 7,
                            color: "#172033",
                            fontSize: 13,
                            lineHeight: 1.7,
                          }}
                        >
                          {item.address || "غير مضاف"}
                        </strong>
                      </div>

                      {item.description && (
                        <div
                          className="est-new-detail"
                          style={{ marginTop: 12 }}
                        >
                          <span
                            style={{
                              display: "block",
                              color: "#d96c16",
                              fontSize: 11,
                              fontWeight: 900,
                            }}
                          >
                            الوصف
                          </span>

                          <p
                            style={{
                              margin: "7px 0 0",
                              color: "#334155",
                              fontSize: 13,
                              lineHeight: 1.8,
                            }}
                          >
                            {item.description}
                          </p>
                        </div>
                      )}

                      {item.rejectionReason && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: "12px 14px",
                            borderRadius: 13,
                            background: "#fff4f4",
                            border: "1px solid #f4cdcd",
                            color: "#991b1b",
                            fontSize: 13,
                            fontWeight: 750,
                          }}
                        >
                          <b>سبب الرفض:</b>{" "}
                          {item.rejectionReason}
                        </div>
                      )}

                      {item.suspensionReason && (
                        <div
                          style={{
                            marginTop: 12,
                            padding: "12px 14px",
                            borderRadius: 13,
                            background: "#fff4f4",
                            border: "1px solid #f4cdcd",
                            color: "#991b1b",
                            fontSize: 13,
                            fontWeight: 750,
                          }}
                        >
                          <b>سبب الإيقاف:</b>{" "}
                          {item.suspensionReason}
                        </div>
                      )}

                      <div className="est-actions">
                        {item.status === "pending" && (
                          <>
                            <button
                              type="button"
                              className="captain-action approve"
                              disabled={saving}
                              onClick={() =>
                                void approveItem(item)
                              }
                            >
                              <Check size={16} />
                              قبول المنشأة
                            </button>

                            <button
                              type="button"
                              className="captain-action reject"
                              disabled={saving}
                              onClick={() => {
                                setRejectItem(item);
                                setRejectReason("");
                              }}
                            >
                              <X size={16} />
                              رفض المنشأة
                            </button>
                          </>
                        )}

                        {(item.status === "active" ||
                          item.status === "suspended") && (
                          <button
                            type="button"
                            className={
                              item.status === "suspended"
                                ? "captain-action approve"
                                : "captain-action reject"
                            }
                            disabled={saving}
                            onClick={() =>
                              void toggleAccountStatus(item)
                            }
                          >
                            {item.status === "suspended"
                              ? "فك الإيقاف"
                              : "إيقاف الحساب"}
                          </button>
                        )}

                        <button
                          type="button"
                          className="captain-action edit"
                          onClick={() =>
                            openEdit(item)
                          }
                        >
                          <Pencil size={16} />
                          تعديل
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* EDIT MODAL */}
      {editItem && (
        <div
          className="captain-modal-backdrop"
          onClick={() => setEditItem(null)}
        >
          <div
            className="captain-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="captain-modal-head">
              <div>
                <span>تعديل المنشأة</span>
                <h2>{editItem.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => setEditItem(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label>
                اسم المنشأة
                <input
                  value={editName}
                  onChange={(event) =>
                    setEditName(event.target.value)
                  }
                />
              </label>

              <label>
                النوع
                <select
                  value={editType}
                  onChange={(event) =>
                    setEditType(
                      event.target.value as EstablishmentType,
                    )
                  }
                >
                  <option value="restaurant">
                    مطعم
                  </option>
                  <option value="shop">
                    محل
                  </option>
                </select>
              </label>

              <label>
                الهاتف
                <input
                  value={editPhone}
                  onChange={(event) =>
                    setEditPhone(event.target.value)
                  }
                />
              </label>

              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) =>
                    setEditEmail(event.target.value)
                  }
                />
              </label>

              <label>
                العنوان
                <input
                  value={editAddress}
                  onChange={(event) =>
                    setEditAddress(event.target.value)
                  }
                />
              </label>

              <label>
                الحالة
                <select
                  value={editStatus}
                  onChange={(event) =>
                    setEditStatus(
                      event.target.value as EstablishmentStatus,
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

              <label className="full-width-field">
                الوصف
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(event) =>
                    setEditDescription(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() => setEditItem(null)}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEdit()}
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="location-spin"
                  />
                ) : (
                  <Check size={16} />
                )}
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectItem && (
        <div
          className="captain-modal-backdrop"
          onClick={() => {
            setRejectItem(null);
            setRejectReason("");
          }}
        >
          <div
            className="captain-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="captain-modal-head">
              <div>
                <span>رفض المنشأة</span>
                <h2>{rejectItem.name}</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectReason("");
                }}
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label className="full-width-field">
                سبب الرفض
                <textarea
                  rows={5}
                  autoFocus
                  value={rejectReason}
                  onChange={(event) =>
                    setRejectReason(event.target.value)
                  }
                  placeholder="اكتب سبب رفض المنشأة..."
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectReason("");
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={
                  saving || !rejectReason.trim()
                }
                onClick={() =>
                  void rejectSelectedItem()
                }
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
