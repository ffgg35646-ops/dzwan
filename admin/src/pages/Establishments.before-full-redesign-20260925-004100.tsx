
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
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

  return new Date(value).toLocaleString("ar-EG-u-nu-latn", {
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
    if (statusFilter === "all") {
      return items;
    }

    return items.filter(
      (item) => item.status === statusFilter,
    );
  }, [items, statusFilter]);

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
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
<div className="admin-content">

          <HomeBackButton />
          <div className="dashboard">
            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  إدارة المنشآت
                </span>

                <h1>المطاعم والمحلات</h1>

                <p>
                  إدارة المنشآت التجارية وربطها بالمناطق
                  والكباتن.
                </p>
              </div>

              <div className="captains-intro-icon">
                <Store size={24} />
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>إجمالي المنشآت</span>
                <strong>{items.length}</strong>
              </div>

              <div className="location-summary-card">
                <span>مطاعم</span>
                <strong>{restaurants}</strong>
              </div>

              <div className="location-summary-card">
                <span>محلات</span>
                <strong>{shops}</strong>
              </div>

              <div className="location-summary-card">
                <span>نشطة</span>
                <strong>{active}</strong>
              </div>

              <div className="location-summary-card">
                <span>قيد المراجعة</span>
                <strong>{pending}</strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div className="panel-header">
                <div>
                  <h2>قائمة المطاعم والمحلات</h2>
                  <p>
                    البيانات المعروضة تأتي مباشرة من
                    قاعدة البيانات.
                  </p>
                </div>

                <div className="establishment-filters">
                  <select
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(
                        e.target.value as
                          | "all"
                          | EstablishmentType,
                      )
                    }
                  >
                    <option value="all">
                      الكل
                    </option>
                    <option value="restaurant">
                      المطاعم
                    </option>
                    <option value="shop">
                      المحلات
                    </option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as
                          | "all"
                          | EstablishmentStatus,
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
                    جارٍ تحميل المنشآت...
                  </span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <Store size={25} />
                  </div>

                  <h3>
                    لا توجد منشآت
                  </h3>

                  <p>
                    لا توجد بيانات مطابقة للفلاتر
                    الحالية.
                  </p>
                </div>
              ) : (
                <div className="establishments-list">
                  {filteredItems.map((item) => {
                    const isOpen =
                      openId === item._id;

                    return (
                      <div
                        className="establishment-item"
                        key={item._id}
                      >
                        <div className="establishment-row">
                          <button
                            type="button"
                            className="governorate-expand"
                            onClick={() =>
                              setOpenId(
                                isOpen
                                  ? null
                                  : item._id,
                              )
                            }
                          >
                            {isOpen ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>

                          <div className="establishment-icon">
                            {item.logoUrl ? (
                              <img
                                src={item.logoUrl}
                                alt=""
                              />
                            ) : item.type ===
                              "restaurant" ? (
                              <UtensilsCrossed
                                size={18}
                              />
                            ) : (
                              <Store size={18} />
                            )}
                          </div>

                          <div className="establishment-info">
                            <strong>
                              {item.name}
                            </strong>
                            <span>
                              {typeLabels[item.type]}
                            </span>
                          </div>

                          <span
                            className={statusClass(
                              item.status,
                            )}
                          >
                            {
                              statusLabels[
                                item.status
                              ]
                            }
                          </span>

                          <span className="establishment-governorate">
                            {getGovernorateName(
                              item.governorateId,
                            )}
                          </span>

                          <button
                            type="button"
                            className="location-icon-button"
                            title="تعديل"
                            onClick={() =>
                              openEdit(item)
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
                              deleteItem(item)
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {isOpen && (
                          <div className="establishment-details">
                            <div className="establishment-details-grid">
                              <div>
                                <span>
                                  الهاتف
                                </span>
                                <strong>
                                  {item.phone}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  البريد الإلكتروني
                                </span>
                                <strong>
                                  {item.email ||
                                    "غير مضاف"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  العنوان
                                </span>
                                <strong>
                                  {item.address}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  المنطقة
                                </span>
                                <strong>
                                  {item.areaId ||
                                    "غير محددة"}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  الكابتن
                                </span>
                                <strong>
                                  {getCaptainName(
                                    item.captainId,
                                  )}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  تاريخ الإنشاء
                                </span>
                                <strong>
                                  {formatDate(
                                    item.createdAt,
                                  )}
                                </strong>
                              </div>
                            </div>

                            {item.description && (
                              <div className="establishment-description">
                                <span>
                                  الوصف
                                </span>
                                <p>
                                  {item.description}
                                </p>
                              </div>
                            )}

                            {item.rejectionReason && (
                              <div className="captain-reason">
                                <span>
                                  سبب الرفض
                                </span>
                                <strong>
                                  {
                                    item.rejectionReason
                                  }
                                </strong>
                              </div>
                            )}

                            {item.suspensionReason && (
                              <div className="captain-reason">
                                <span>
                                  سبب الإيقاف
                                </span>
                                <strong>
                                  {
                                    item.suspensionReason
                                  }
                                </strong>
                              </div>
                            )}

                            <div className="captain-actions">
                              {item.status ===
                                "pending" && (
                                <>
                                  <button
                                    type="button"
                                    className="captain-action approve"
                                    disabled={saving}
                                    onClick={() =>
                                      approveItem(
                                        item,
                                      )
                                    }
                                  >
                                    <Check
                                      size={16}
                                    />
                                    قبول
                                  </button>

                                  <button
                                    type="button"
                                    className="captain-action reject"
                                    disabled={saving}
                                    onClick={() => {
                                      setRejectItem(
                                        item,
                                      );
                                      setRejectReason(
                                        "",
                                      );
                                    }}
                                  >
                                    <X size={16} />
                                    رفض
                                  </button>
                                </>
                              )}

                                                            <button
                                type="button"
                                className={
                                  item.status === "suspended"
                                    ? "captain-action approve"
                                    : "captain-action reject"
                                }
                                disabled={saving}
                                onClick={() =>
                                  toggleAccountStatus(item)
                                }
                              >
                                {item.status === "suspended"
                                  ? "فك الإيقاف"
                                  : "إيقاف الحساب"}
                              </button>

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
          </div>
        </div>
      </main>

      {editItem && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>
                  تعديل المنشأة
                </span>

                <h2>{editItem.name}</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditItem(null)
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label>
                اسم المنشأة
                <input
                  value={editName}
                  onChange={(e) =>
                    setEditName(e.target.value)
                  }
                />
              </label>

              <label>
                النوع
                <select
                  value={editType}
                  onChange={(e) =>
                    setEditType(
                      e.target.value as EstablishmentType,
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
                العنوان
                <input
                  value={editAddress}
                  onChange={(e) =>
                    setEditAddress(e.target.value)
                  }
                />
              </label>

              <label>
                الحالة
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value as EstablishmentStatus,
                    )
                  }
                >
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
              </label>

              <label className="full-width-field">
                الوصف
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) =>
                    setEditDescription(
                      e.target.value,
                    )
                  }
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setEditItem(null)
                }
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
                  <Check size={16} />
                )}
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectItem && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>
                  رفض المنشأة
                </span>

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
                  rows={4}
                  autoFocus
                  value={rejectReason}
                  onChange={(e) =>
                    setRejectReason(
                      e.target.value,
                    )
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
                disabled={saving}
                onClick={
                  rejectSelectedItem
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
