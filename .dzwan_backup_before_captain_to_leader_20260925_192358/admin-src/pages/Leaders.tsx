import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { canManageLeaders } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";

type LeaderRole =
  | "governorate_leader"
  | "area_leader";

type LeaderStatus =
  | "pending"
  | "active"
  | "rejected"
  | "suspended"
  | "inactive";

interface Area {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Location {
  _id: string;
  name: string;
  isActive: boolean;
  areas: Area[];
}

interface Leader {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: LeaderRole;
  status: LeaderStatus;
  governorateId?:
    | {
        _id: string;
        name: string;
      }
    | string
    | null;
  areaIds?: string[];
  areas?: Array<{
    id: string;
    name: string;
  }>;
  rejectionReason?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
}

const roleLabels: Record<
  LeaderRole,
  string
> = {
  governorate_leader: "قائد محافظة",
  area_leader: "قائد مناطق",
};

const statusLabels: Record<
  LeaderStatus,
  string
> = {
  pending: "قيد المراجعة",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
  inactive: "غير نشط",
};

type FormState = {
  role: LeaderRole;
  fullName: string;
  phone: string;
  email: string;
  password: string;
  governorateId: string;
  areaIds: string[];
};

const emptyForm: FormState = {
  role: "governorate_leader",
  fullName: "",
  phone: "",
  email: "",
  password: "",
  governorateId: "",
  areaIds: [],
};

function idOf(value: any) {
  if (!value) return "";
  return typeof value === "string"
    ? value
    : String(value._id || "");
}

export default function Leaders() {
  const [leaders, setLeaders] =
    useState<Leader[]>([]);
  const [locations, setLocations] =
    useState<Location[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [currentRole, setCurrentRole] =
    useState<string | undefined>();
  const [openId, setOpenId] =
    useState<string | null>(null);
  const [showForm, setShowForm] =
    useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);
  const [form, setForm] =
    useState<FormState>(emptyForm);

  const governorates = useMemo(
    () =>
      locations.filter(
        (item) => item.isActive,
      ),
    [locations],
  );

  const selectedLocation =
    governorates.find(
      (item) =>
        item._id === form.governorateId,
    );

  const activeAreas =
    selectedLocation?.areas.filter(
      (area) => area.isActive,
    ) ?? [];

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [
        leadersResponse,
        locationsResponse,
        meResponse,
      ] = await Promise.all([
        api.get("/leaders"),
        api.get("/locations"),
        api.get("/auth/me"),
      ]);

      setLeaders(
        Array.isArray(
          leadersResponse.data?.leaders,
        )
          ? leadersResponse.data.leaders
          : [],
      );

      setLocations(
        Array.isArray(
          locationsResponse.data?.locations,
        )
          ? locationsResponse.data.locations
          : [],
      );

      setCurrentRole(
        meResponse.data?.user?.role,
      );
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل بيانات القادة.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  }

  function openEdit(
    leader: Leader,
  ) {
    const ids =
      leader.areaIds?.length
        ? leader.areaIds
        : [];

    setEditingId(leader._id);
    setForm({
      role: leader.role,
      fullName: leader.fullName,
      phone: leader.phone,
      email: leader.email || "",
      password: "",
      governorateId:
        idOf(leader.governorateId),
      areaIds: ids,
    });
    setShowForm(true);
    setError("");
    setOpenId(leader._id);
  }

  function toggleArea(id: string) {
    setForm((current) => ({
      ...current,
      areaIds: current.areaIds.includes(id)
        ? current.areaIds.filter(
            (item) => item !== id,
          )
        : [
            ...current.areaIds,
            id,
          ],
    }));
  }

  async function saveLeader() {
    if (
      !canManageLeaders(currentRole)
    ) {
      setError(
        "ليس لديك صلاحية لإدارة القادة.",
      );
      return;
    }

    if (!form.fullName.trim()) {
      setError("اكتب اسم القائد.");
      return;
    }

    if (!form.phone.trim()) {
      setError("اكتب رقم الهاتف.");
      return;
    }

    if (!form.governorateId) {
      setError("اختر المحافظة.");
      return;
    }

    if (
      !editingId &&
      form.password.length < 6
    ) {
      setError(
        "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.",
      );
      return;
    }

    if (
      form.role === "area_leader" &&
      form.areaIds.length === 0
    ) {
      setError(
        "اختر منطقة واحدة على الأقل.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        const payload: any = {
          fullName:
            form.fullName.trim(),
          phone:
            form.phone.trim(),
          email:
            form.email.trim()
              ? form.email.trim()
              : null,
          governorateId:
            form.governorateId,
          areaIds: form.areaIds,
        };

        if (form.password) {
          payload.password =
            form.password;
        }

        await api.patch(
          `/leaders/${editingId}`,
          payload,
        );
      } else {
        await api.post("/leaders", {
          role: form.role,
          fullName:
            form.fullName.trim(),
          phone:
            form.phone.trim(),
          email:
            form.email.trim()
              ? form.email.trim()
              : undefined,
          password:
            form.password,
          governorateId:
            form.governorateId,
          areaIds:
            form.role === "area_leader"
              ? form.areaIds
              : [],
        });
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadAll();
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر حفظ بيانات القائد.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function approve(
    id: string,
  ) {
    if (
      !canManageLeaders(currentRole)
    ) {
      setError(
        "ليس لديك صلاحية لإدارة القادة.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/leaders/${id}/approve`,
      );

      await loadAll();
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر تفعيل القائد.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function reject(
    id: string,
  ) {
    if (
      !canManageLeaders(currentRole)
    ) {
      setError(
        "ليس لديك صلاحية لإدارة القادة.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/leaders/${id}/reject`,
        {
          reason:
            "رفض من لوحة الإدارة",
        },
      );

      await loadAll();
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر رفض القائد.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(
    leader: Leader,
  ) {
    if (
      !canManageLeaders(currentRole)
    ) {
      setError(
        "ليس لديك صلاحية لإدارة القادة.",
      );
      return;
    }

    const okay = window.confirm(
      `هل تريد حذف القائد "${leader.fullName}"؟`,
    );

    if (!okay) return;

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/leaders/${leader._id}`,
      );

      setOpenId(null);
      await loadAll();
    } catch (err: any) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف القائد.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="admin-app"
      dir="rtl"
    >
      <main className="admin-main">
        <div className="admin-content">
          <HomeBackButton />

          <div className="dashboard">
            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  الهيكل الإداري
                </span>

                <h1>القادة</h1>

                <p>
                  إنشاء قادة المحافظات والمناطق
                  وتحديد نطاق مسؤولية كل قائد.
                </p>
              </div>

              <div className="captains-intro-icon">
                <Shield size={24} />
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>إجمالي القادة</span>
                <strong>
                  {leaders.length}
                </strong>
              </div>

              <div className="location-summary-card">
                <span>قادة المحافظات</span>
                <strong>
                  {
                    leaders.filter(
                      (x) =>
                        x.role ===
                        "governorate_leader",
                    ).length
                  }
                </strong>
              </div>

              <div className="location-summary-card">
                <span>قادة المناطق</span>
                <strong>
                  {
                    leaders.filter(
                      (x) =>
                        x.role ===
                        "area_leader",
                    ).length
                  }
                </strong>
              </div>

              <div className="location-summary-card">
                <span>النشطون</span>
                <strong>
                  {
                    leaders.filter(
                      (x) =>
                        x.status ===
                        "active",
                    ).length
                  }
                </strong>
              </div>

              <div className="location-summary-card">
                <span>قيد المراجعة</span>
                <strong>
                  {
                    leaders.filter(
                      (x) =>
                        x.status ===
                        "pending",
                    ).length
                  }
                </strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div
                className="panel-header"
                style={{
                  alignItems: "center",
                }}
              >
                <div>
                  <h2>
                    قائمة القادة
                  </h2>

                  <p>
                    كل قائد مرتبط بمحافظة،
                    وقائد المناطق يمكن ربطه
                    بأكثر من منطقة.
                  </p>
                </div>

                {canManageLeaders(
                  currentRole,
                ) && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={openCreate}
                  >
                    <Plus size={17} />
                    إضافة قائد
                  </button>
                )}
              </div>

              {loading ? (
                <div className="locations-loading">
                  جاري التحميل...
                </div>
              ) : leaders.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <UserRound size={25} />
                  </div>

                  <h3>
                    لا يوجد قادة
                  </h3>

                  <p>
                    اضغط "إضافة قائد"
                    لإنشاء أول قائد.
                  </p>
                </div>
              ) : (
                <div className="establishments-list">
                  {leaders.map(
                    (leader) => {
                      const open =
                        openId ===
                        leader._id;

                      return (
                        <div
                          className="establishment-item"
                          key={leader._id}
                        >
                          <div className="establishment-row">
                            <button
                              type="button"
                              className="governorate-expand"
                              onClick={() =>
                                setOpenId(
                                  open
                                    ? null
                                    : leader._id,
                                )
                              }
                            >
                              {open ? (
                                <ChevronUp
                                  size={18}
                                />
                              ) : (
                                <ChevronDown
                                  size={18}
                                />
                              )}
                            </button>

                            <div className="establishment-icon">
                              <Shield
                                size={18}
                              />
                            </div>

                            <div className="establishment-info">
                              <strong>
                                {
                                  leader.fullName
                                }
                              </strong>

                              <span>
                                {
                                  roleLabels[
                                    leader.role
                                  ]
                                }
                              </span>
                            </div>

                            <span
                              className={`establishment-status ${leader.status}`}
                            >
                              {
                                statusLabels[
                                  leader.status
                                ]
                              }
                            </span>

                            <span className="establishment-governorate">
                              {idOf(
                                leader.governorateId,
                              )}
                            </span>
                          </div>

                          {open && (
                            <div className="establishment-details">
                              <div className="establishment-details-grid">
                                <div>
                                  <span>
                                    الهاتف
                                  </span>

                                  <strong>
                                    {
                                      leader.phone
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    البريد
                                  </span>

                                  <strong>
                                    {leader.email ||
                                      "غير مضاف"}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    الدور
                                  </span>

                                  <strong>
                                    {
                                      roleLabels[
                                        leader.role
                                      ]
                                    }
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    المحافظة
                                  </span>

                                  <strong>
                                    {typeof leader.governorateId ===
                                    "object"
                                      ? leader
                                          .governorateId
                                          ?.name
                                      : leader.governorateId ||
                                        "غير محددة"}
                                  </strong>
                                </div>

                                <div
                                  style={{
                                    gridColumn:
                                      "1 / -1",
                                  }}
                                >
                                  <span>
                                    نطاق المناطق
                                  </span>

                                  <strong>
                                    {leader.areas?.length
                                      ? leader.areas
                                          .map(
                                            (
                                              area,
                                            ) =>
                                              area.name,
                                          )
                                          .join(
                                            " • ",
                                          )
                                      : "المحافظة كاملة"}
                                  </strong>
                                </div>
                              </div>

                              {leader.rejectionReason && (
                                <div className="captain-reason">
                                  <span>
                                    سبب الرفض
                                  </span>

                                  <strong>
                                    {
                                      leader.rejectionReason
                                    }
                                  </strong>
                                </div>
                              )}

                              <div
                                className="captain-actions"
                                style={{
                                  flexWrap:
                                    "wrap",
                                }}
                              >
                                {leader.status ===
                                  "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void approve(
                                          leader._id,
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                    >
                                      <Check
                                        size={15}
                                      />
                                      قبول وتفعيل
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void reject(
                                          leader._id,
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                    >
                                      <X
                                        size={15}
                                      />
                                      رفض
                                    </button>
                                  </>
                                )}

                                {canManageLeaders(
                                  currentRole,
                                ) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openEdit(
                                          leader,
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                    >
                                      تعديل
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void remove(
                                          leader,
                                        )
                                      }
                                      disabled={
                                        saving
                                      }
                                      style={{
                                        color:
                                          "#B91C1C",
                                      }}
                                    >
                                      <Trash2
                                        size={15}
                                      />
                                      حذف
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(20,12,7,.46)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background:
                "#fff",
              borderRadius: 24,
              padding: 22,
              boxShadow:
                "0 25px 70px rgba(0,0,0,.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div>
                <span
                  className="dashboard-label"
                >
                  {editingId
                    ? "تعديل"
                    : "إنشاء حساب"}
                </span>

                <h2
                  style={{
                    margin:
                      "4px 0 0",
                  }}
                >
                  {editingId
                    ? "تعديل القائد"
                    : "إضافة Leader"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  border:
                    "1px solid #eee",
                  background:
                    "#fafafa",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <label>
                <span>نوع المسؤولية</span>
                <select
                  value={form.role}
                  disabled={
                    Boolean(editingId)
                  }
                  onChange={(e) => {
                    const role =
                      e.target.value as LeaderRole;

                    setForm(
                      (current) => ({
                        ...current,
                        role,
                        areaIds:
                          role ===
                          "governorate_leader"
                            ? []
                            : current.areaIds,
                      }),
                    );
                  }}
                >
                  <option value="governorate_leader">
                    محافظة كاملة
                  </option>

                  <option value="area_leader">
                    مناطق محددة
                  </option>
                </select>
              </label>

              <label>
                <span>اسم القائد</span>
                <input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        fullName:
                          e.target.value,
                      }),
                    )
                  }
                  placeholder="مثال: محمد أحمد"
                />
              </label>

              <label>
                <span>رقم الهاتف</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        phone:
                          e.target.value,
                      }),
                    )
                  }
                  placeholder="07xxxxxxxxx"
                />
              </label>

              <label>
                <span>
                  البريد الإلكتروني
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        email:
                          e.target.value,
                      }),
                    )
                  }
                  placeholder="leader@example.com"
                />
              </label>

              <label>
                <span>
                  {editingId
                    ? "كلمة مرور جديدة (اختياري)"
                    : "كلمة المرور"}
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        password:
                          e.target.value,
                      }),
                    )
                  }
                  placeholder="6 أحرف أو أكثر"
                />
              </label>

              <label>
                <span>المحافظة</span>
                <select
                  value={
                    form.governorateId
                  }
                  onChange={(e) =>
                    setForm(
                      (current) => ({
                        ...current,
                        governorateId:
                          e.target.value,
                        areaIds: [],
                      }),
                    )
                  }
                >
                  <option value="">
                    اختر المحافظة
                  </option>

                  {governorates.map(
                    (location) => (
                      <option
                        key={
                          location._id
                        }
                        value={
                          location._id
                        }
                      >
                        {location.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            {form.role ===
              "governorate_leader" && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background:
                    "#FFF7ED",
                  borderRadius: 16,
                  color:
                    "#7A4A21",
                  fontSize: 13,
                  lineHeight:
                    1.8,
                }}
              >
                قائد المحافظة يرى جميع
                المناطق والمنشآت والطلبات
                التابعة للمحافظة.
              </div>
            )}

            {form.role ===
              "area_leader" && (
              <div
                style={{
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    marginBottom: 10,
                  }}
                >
                  اختر المناطق
                </div>

                {!form.governorateId ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background:
                        "#F8F6F3",
                      color:
                        "#81746A",
                    }}
                  >
                    اختر المحافظة أولًا.
                  </div>
                ) : activeAreas.length ===
                  0 ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background:
                        "#FFF1F2",
                      color:
                        "#9F1239",
                    }}
                  >
                    لا توجد مناطق مفعلة
                    داخل هذه المحافظة.
                  </div>
                ) : (
                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(180px,1fr))",
                      gap: 8,
                    }}
                  >
                    {activeAreas.map(
                      (area) => {
                        const checked =
                          form.areaIds.includes(
                            area._id,
                          );

                        return (
                          <button
                            key={
                              area._id
                            }
                            type="button"
                            onClick={() =>
                              toggleArea(
                                area._id,
                              )
                            }
                            style={{
                              textAlign:
                                "right",
                              padding:
                                "12px 13px",
                              borderRadius:
                                14,
                              border:
                                checked
                                  ? "2px solid #FF6A00"
                                  : "1px solid #E9E0D8",
                              background:
                                checked
                                  ? "#FFF4E8"
                                  : "#fff",
                              cursor:
                                "pointer",
                              fontWeight:
                                800,
                            }}
                          >
                            {checked
                              ? "✓ "
                              : ""}
                            {area.name}
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent:
                  "flex-start",
                marginTop: 22,
              }}
            >
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void saveLeader()
                }
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="premium-spin"
                    />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {editingId
                      ? "حفظ التعديل"
                      : "إنشاء القائد"}
                  </>
                )}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowForm(false)
                }
                disabled={saving}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
