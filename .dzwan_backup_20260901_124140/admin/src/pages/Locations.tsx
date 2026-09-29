import { useEffect, useState } from "react";
import {
  Plus,
  Map,
  Pencil,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageLocations } from "../lib/permissions";

interface Area {
  _id: string;
  name: string;
  isActive: boolean;
}

interface Governorate {
  _id: string;
  name: string;
  isActive: boolean;
  areas: Area[];
}

export default function Locations() {
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const [showGovernorateForm, setShowGovernorateForm] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState<string | null>(null);

  const [governorateName, setGovernorateName] = useState("");
  const [areaName, setAreaName] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);

  async function loadLocations() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/locations");

      const data = response.data;

      setGovernorates(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.locations)
            ? data.locations
            : Array.isArray(data?.governorates)
              ? data.governorates
              : [],
      );
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل المحافظات والمناطق."),
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
    loadLocations();
  }, []);

  async function addGovernorate(event: React.FormEvent) {
    if (!canManageLocations(currentRole)) {
      setError("ليس لديك صلاحية لإدارة المحافظات والمناطق.");
      return;
    }


    event.preventDefault();

    if (!governorateName.trim()) return;

    try {
      setSaving(true);
      setError("");

      await api.post("/locations", {
        governorate: governorateName.trim(),
        name: governorateName.trim(),
      });

      setGovernorateName("");
      setShowGovernorateForm(false);

      await loadLocations();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر إضافة المحافظة."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function addArea(
    event: React.FormEvent,
    governorateId: string,
  ) {
    if (!canManageLocations(currentRole)) {
      setError("ليس لديك صلاحية لإدارة المحافظات والمناطق.");
      return;
    }


    event.preventDefault();

    if (!areaName.trim()) return;

    try {
      setSaving(true);
      setError("");

      await api.post(`/locations/${governorateId}/areas`, {
        name: areaName.trim(),
      });

      setAreaName("");
      setShowAreaForm(null);

      await loadLocations();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر إضافة المنطقة."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleGovernorate(item: Governorate) {
    if (!canManageLocations(currentRole)) {
      setError("ليس لديك صلاحية لتغيير حالة المحافظة.");
      return;
    }


    try {
      await api.patch(`/locations/${item._id}`, {
        isActive: !item.isActive,
      });

      await loadLocations();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تغيير حالة المحافظة."),
      );
    }
  }

  async function toggleArea(
    governorateId: string,
    area: Area,
  ) {
    if (!canManageLocations(currentRole)) {
      setError("ليس لديك صلاحية لتغيير حالة المنطقة.");
      return;
    }


    try {
      await api.patch(
        `/locations/${governorateId}/areas/${area._id}`,
        {
          isActive: !area.isActive,
        },
      );

      await loadLocations();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تغيير حالة المنطقة."),
      );
    }
  }

  async function deleteGovernorate(item: Governorate) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف محافظة "${item.name}"؟`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/locations/${item._id}`);
      await loadLocations();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر حذف المحافظة."),
      );
    }
  }

  async function deleteArea(
    governorateId: string,
    area: Area,
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف منطقة "${area.name}"؟`,
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/locations/${governorateId}/areas/${area._id}`,
      );

      await loadLocations();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر حذف المنطقة."),
      );
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
              المحافظات والمناطق
            </div>
          </div>
        </header>

        <div className="admin-content">
          <div className="dashboard">

            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  إدارة المناطق
                </span>

                <h1>
                  المحافظات والمناطق
                </h1>

                <p>
                  إدارة المحافظات والمناطق التي تعمل فيها منصة دزوان.
                </p>
              </div>

              <button
                type="button"
                className="location-primary-button"
                onClick={() => {
                  setShowGovernorateForm(
                    !showGovernorateForm,
                  );
                  setError("");
                }}
              >
                <Plus size={17} />
                إضافة محافظة
              </button>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            {showGovernorateForm && (
              <section className="panel location-form-panel">
                <div className="panel-header">
                  <div>
                    <h2>إضافة محافظة جديدة</h2>
                    <p>
                      أدخل اسم المحافظة ثم احفظها.
                    </p>
                  </div>
                </div>

                <form
                  className="location-form"
                  onSubmit={addGovernorate}
                >
                  <input
                    value={governorateName}
                    onChange={(event) =>
                      setGovernorateName(event.target.value)
                    }
                    placeholder="اسم المحافظة"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2
                        size={16}
                        className="location-spin"
                      />
                    ) : (
                      "حفظ المحافظة"
                    )}
                  </button>
                </form>
              </section>
            )}

            <section className="locations-summary">
              <div className="location-summary-card">
                <span>المحافظات</span>
                <strong>{governorates.length}</strong>
              </div>

              <div className="location-summary-card">
                <span>المناطق</span>
                <strong>
                  {governorates.reduce(
                    (total, item) =>
                      total + item.areas.length,
                    0,
                  )}
                </strong>
              </div>

              <div className="location-summary-card">
                <span>المحافظات النشطة</span>
                <strong>
                  {
                    governorates.filter(
                      (item) => item.isActive,
                    ).length
                  }
                </strong>
              </div>
            </section>

            <section className="panel locations-panel">
              <div className="panel-header">
                <div>
                  <h2>المحافظات</h2>
                  <p>
                    اختر المحافظة لإدارة المناطق التابعة لها.
                  </p>
                </div>

                <Map
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
                  <span>
                    جارٍ تحميل المحافظات...
                  </span>
                </div>
              ) : governorates.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <Map size={25} />
                  </div>

                  <h3>
                    لا توجد محافظات حتى الآن
                  </h3>

                  <p>
                    ابدأ بإضافة أول محافظة للنظام.
                  </p>
                </div>
              ) : (
                <div className="governorates-list">
                  {governorates.map((item) => {
                    const isOpen = openId === item._id;

                    return (
                      <div
                        className="governorate-item"
                        key={item._id}
                      >

                        <div className="governorate-row">

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

                          <div className="governorate-icon">
                            <Map size={18} />
                          </div>

                          <div className="governorate-info">
                            <strong>
                              {item.name}
                            </strong>

                            <span>
                              {item.areas.length} منطقة
                            </span>
                          </div>

                          <span
                            className={
                              item.isActive
                                ? "location-status active"
                                : "location-status inactive"
                            }
                          >
                            {item.isActive
                              ? "نشطة"
                              : "متوقفة"}
                          </span>

                          <button
                            type="button"
                            className="location-icon-button"
                            title={
                              item.isActive
                                ? "تعطيل"
                                : "تفعيل"
                            }
                            onClick={() =>
                              toggleGovernorate(item)
                            }
                          >
                            <Power size={16} />
                          </button>

                          <button
                            type="button"
                            className="location-icon-button danger"
                            title="حذف"
                            onClick={() =>
                              deleteGovernorate(item)
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {isOpen && (
                          <div className="areas-section">

                            <div className="areas-head">
                              <div>
                                <strong>
                                  مناطق {item.name}
                                </strong>

                                <span>
                                  إدارة المناطق التابعة للمحافظة
                                </span>
                              </div>

                              <button
                                type="button"
                                className="area-add-button"
                                onClick={() => {
                                  setShowAreaForm(
                                    showAreaForm === item._id
                                      ? null
                                      : item._id,
                                  );
                                  setAreaName("");
                                  setError("");
                                }}
                              >
                                <Plus size={15} />
                                إضافة منطقة
                              </button>
                            </div>

                            {showAreaForm === item._id && (
                              <form
                                className="area-form"
                                onSubmit={(event) =>
                                  addArea(
                                    event,
                                    item._id,
                                  )
                                }
                              >
                                <input
                                  value={areaName}
                                  onChange={(event) =>
                                    setAreaName(
                                      event.target.value,
                                    )
                                  }
                                  placeholder="اسم المنطقة"
                                  autoFocus
                                />

                                <button
                                  type="submit"
                                  disabled={saving}
                                >
                                  {saving
                                    ? "جارٍ الحفظ..."
                                    : "إضافة"}
                                </button>
                              </form>
                            )}

                            {item.areas.length === 0 ? (
                              <div className="areas-empty">
                                لا توجد مناطق مضافة لهذه المحافظة.
                              </div>
                            ) : (
                              <div className="areas-list">
                                {item.areas.map((area) => (
                                  <div
                                    className="area-row"
                                    key={area._id}
                                  >
                                    <div className="area-name">
                                      <span />
                                      <strong>
                                        {area.name}
                                      </strong>
                                    </div>

                                    <span
                                      className={
                                        area.isActive
                                          ? "location-status active"
                                          : "location-status inactive"
                                      }
                                    >
                                      {area.isActive
                                        ? "نشطة"
                                        : "متوقفة"}
                                    </span>

                                    <button
                                      type="button"
                                      className="location-icon-button"
                                      title={
                                        area.isActive
                                          ? "تعطيل"
                                          : "تفعيل"
                                      }
                                      onClick={() =>
                                        toggleArea(
                                          item._id,
                                          area,
                                        )
                                      }
                                    >
                                      <Power size={15} />
                                    </button>

                                    <button
                                      type="button"
                                      className="location-icon-button"
                                      title="تعديل"
                                      onClick={() => {
                                        const value =
                                          window.prompt(
                                            "اسم المنطقة:",
                                            area.name,
                                          );

                                        if (
                                          value &&
                                          value.trim()
                                        ) {
                                          api
                                            .patch(
                                              `/locations/${item._id}/areas/${area._id}`,
                                              {
                                                name: value.trim(),
                                              },
                                            )
                                            .then(
                                              loadLocations,
                                            )
                                            .catch(
                                              (err) =>
                                                setError(
                                                  err?.response
                                                    ?.data
                                                    ?.message ||
                                                    "تعذر تعديل المنطقة.",
                                                ),
                                            );
                                        }
                                      }}
                                    >
                                      <Pencil size={15} />
                                    </button>

                                    <button
                                      type="button"
                                      className="location-icon-button danger"
                                      title="حذف"
                                      onClick={() =>
                                        deleteArea(
                                          item._id,
                                          area,
                                        )
                                      }
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

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
