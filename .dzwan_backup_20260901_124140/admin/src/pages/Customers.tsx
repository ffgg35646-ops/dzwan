import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type CustomerStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

interface Customer {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: "customer";
  status: CustomerStatus;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Address {
  _id: string;
  label: string;
  address: string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  governorateId?:
    | string
    | {
        _id: string;
        name: string;
      }
    | null;
  areaId?: string | null;
}

const statusLabels: Record<CustomerStatus, string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
  inactive: "غير نشط",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getGovernorateName(
  value: Address["governorateId"],
) {
  if (!value) return "غير محددة";
  if (typeof value === "string") return value;
  return value.name;
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<
    Record<string, Address[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadingAddressId, setLoadingAddressId] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [openId, setOpenId] = useState<string | null>(
    null,
  );

  const [editCustomer, setEditCustomer] =
    useState<Customer | null>(null);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] =
    useState<CustomerStatus>("active");
  const [editPassword, setEditPassword] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/customers");

      setCustomers(
        Array.isArray(response.data?.customers)
          ? response.data.customers
          : [],
      );
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل العملاء."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAddresses(customerId: string) {
    try {
      setLoadingAddressId(customerId);

      const response = await api.get(
        `/customers/${customerId}/addresses`,
      );

      setAddresses((current) => ({
        ...current,
        [customerId]: Array.isArray(
          response.data?.addresses,
        )
          ? response.data.addresses
          : [],
      }));
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل عناوين العميل."),
      );
    } finally {
      setLoadingAddressId(null);
    }
  }


  useEffect(() => {
    loadCustomers();
  }, []);

  async function toggleCustomer(customerId: string) {
    const next =
      openId === customerId ? null : customerId;

    setOpenId(next);

    if (
      next &&
      addresses[next] === undefined
    ) {
      await loadAddresses(next);
    }
  }

  function openEdit(customer: Customer) {
    setEditCustomer(customer);
    setEditName(customer.fullName);
    setEditPhone(customer.phone);
    setEditEmail(customer.email || "");
    setEditStatus(customer.status);
    setEditPassword("");
  }

  async function saveCustomer() {
    if (!editCustomer) return;

    try {
      setSaving(true);
      setError("");

      const body: Record<string, unknown> = {
        fullName: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        status: editStatus,
      };

      if (editPassword.trim()) {
        body.password = editPassword.trim();
      }

      await api.patch(
        `/customers/${editCustomer._id}`,
        body,
      );

      setEditCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحديث العميل."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(
    customer: Customer,
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${customer.fullName}"؟`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/customers/${customer._id}`,
      );

      if (openId === customer._id) {
        setOpenId(null);
      }

      setAddresses((current) => {
        const next = { ...current };
        delete next[customer._id];
        return next;
      });

      await loadCustomers();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر حذف العميل."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <div className="header-kicker">
              منصة دزوان
            </div>
            <div className="header-title">
              إدارة العملاء
            </div>
          </div>
        </header>

        <div className="admin-content">
          <div className="dashboard">
            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  المستخدمون
                </span>

                <h1>العملاء</h1>

                <p>
                  إدارة حسابات العملاء وعناوينهم المسجلة.
                </p>
              </div>

              <div className="captains-intro-icon">
                <UserRound size={24} />
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>إجمالي العملاء</span>
                <strong>{customers.length}</strong>
              </div>

              <div className="location-summary-card">
                <span>نشطون</span>
                <strong>
                  {
                    customers.filter(
                      (x) => x.status === "active",
                    ).length
                  }
                </strong>
              </div>

              <div className="location-summary-card">
                <span>قيد المراجعة</span>
                <strong>
                  {
                    customers.filter(
                      (x) => x.status === "pending",
                    ).length
                  }
                </strong>
              </div>

              <div className="location-summary-card">
                <span>موقوفون</span>
                <strong>
                  {
                    customers.filter(
                      (x) =>
                        x.status === "suspended",
                    ).length
                  }
                </strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div className="panel-header">
                <div>
                  <h2>قائمة العملاء</h2>
                  <p>
                    البيانات من Customer API مباشرة.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="locations-loading">
                  <Loader2
                    size={27}
                    className="location-spin"
                  />
                  <span>
                    جارٍ تحميل العملاء...
                  </span>
                </div>
              ) : customers.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <UserRound size={25} />
                  </div>

                  <h3>لا يوجد عملاء</h3>

                  <p>
                    لا توجد حسابات عملاء حاليًا.
                  </p>
                </div>
              ) : (
                <div className="establishments-list">
                  {customers.map((customer) => {
                    const open =
                      openId === customer._id;

                    const customerAddresses =
                      addresses[customer._id];

                    return (
                      <div
                        className="establishment-item"
                        key={customer._id}
                      >
                        <div className="establishment-row">
                          <button
                            type="button"
                            className="governorate-expand"
                            onClick={() =>
                              toggleCustomer(
                                customer._id,
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
                            <UserRound size={18} />
                          </div>

                          <div className="establishment-info">
                            <strong>
                              {customer.fullName}
                            </strong>

                            <span>
                              {customer.phone}
                            </span>
                          </div>

                          <span
                            className={`establishment-status ${customer.status}`}
                          >
                            {
                              statusLabels[
                                customer.status
                              ]
                            }
                          </span>

                          <span className="establishment-governorate">
                            {customer.email ||
                              "بدون بريد"}
                          </span>

                          <button
                            type="button"
                            className="location-icon-button"
                            title="تعديل"
                            onClick={() =>
                              openEdit(customer)
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
                              deleteCustomer(
                                customer,
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {open && (
                          <div className="establishment-details">
                            <div className="establishment-details-grid">
                              <div>
                                <span>الهاتف</span>
                                <strong>
                                  {customer.phone}
                                </strong>
                              </div>

                              <div>
                                <span>
                                  البريد الإلكتروني
                                </span>
                                <strong>
                                  {customer.email ||
                                    "غير مضاف"}
                                </strong>
                              </div>

                              <div>
                                <span>الحالة</span>
                                <strong>
                                  {
                                    statusLabels[
                                      customer.status
                                    ]
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  تاريخ التسجيل
                                </span>
                                <strong>
                                  {formatDate(
                                    customer.createdAt,
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div className="order-items">
                              <h3>
                                <MapPin
                                  size={14}
                                />{" "}
                                العناوين
                              </h3>

                              {loadingAddressId ===
                              customer._id ? (
                                <div className="locations-loading">
                                  <Loader2
                                    size={20}
                                    className="location-spin"
                                  />
                                  <span>
                                    جارٍ تحميل العناوين...
                                  </span>
                                </div>
                              ) : !customerAddresses ||
                                customerAddresses.length ===
                                  0 ? (
                                <div className="locations-empty">
                                  <p>
                                    لا توجد عناوين مسجلة.
                                  </p>
                                </div>
                              ) : (
                                customerAddresses.map(
                                  (address) => (
                                    <div
                                      className="order-item-line"
                                      key={address._id}
                                    >
                                      <div>
                                        <strong>
                                          {address.label}
                                        </strong>

                                        <span
                                          style={{
                                            display:
                                              "block",
                                            marginTop:
                                              "3px",
                                          }}
                                        >
                                          {
                                            address.address
                                          }
                                        </span>

                                        <span
                                          style={{
                                            display:
                                              "block",
                                            marginTop:
                                              "3px",
                                          }}
                                        >
                                          {getGovernorateName(
                                            address.governorateId,
                                          )}
                                        </span>
                                      </div>

                                      <span>
                                        {address.isDefault
                                          ? "الافتراضي"
                                          : ""}
                                      </span>
                                    </div>
                                  ),
                                )
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

      {editCustomer && (
        <div className="captain-modal-backdrop">
          <div className="captain-modal">
            <div className="captain-modal-head">
              <div>
                <span>تعديل العميل</span>
                <h2>
                  {editCustomer.fullName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditCustomer(null)
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="captain-form">
              <label>
                الاسم
                <input
                  value={editName}
                  onChange={(e) =>
                    setEditName(e.target.value)
                  }
                />
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
                الحالة
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value as CustomerStatus,
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
                كلمة مرور جديدة
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) =>
                    setEditPassword(
                      e.target.value,
                    )
                  }
                  placeholder="اتركها فارغة إذا لم ترد تغييرها"
                />
              </label>
            </div>

            <div className="captain-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setEditCustomer(null)
                }
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveCustomer}
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="location-spin"
                  />
                ) : null}
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
