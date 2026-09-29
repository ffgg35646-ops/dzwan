import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Layers3,
  Loader2,
  MapPinned,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  X,
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

type ConfirmState =
  | {
      type: "delete-governorate";
      governorate: Governorate;
      title: string;
      text: string;
    }
  | {
      type: "delete-area";
      governorate: Governorate;
      area: Area;
      title: string;
      text: string;
    }
  | {
      type: "toggle-governorate";
      governorate: Governorate;
      title: string;
      text: string;
    }
  | {
      type: "toggle-area";
      governorate: Governorate;
      area: Area;
      title: string;
      text: string;
    }
  | null;

const ORANGE = "#E87516";
const ORANGE_DARK = "#C2410C";
const ORANGE_LIGHT = "#FFF7ED";
const ORANGE_SOFT = "#FFF1E4";
const ORANGE_BORDER = "#FED7AA";
const YELLOW_LIGHT = "#FFFBEB";
const YELLOW_BORDER = "#FDE68A";
const TEXT = "#1F2937";
const MUTED = "#64748B";
const BORDER = "#E5E7EB";
const SURFACE = "#FFFFFF";

const cardStyle = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 20,
  boxShadow: "0 10px 28px rgba(15,23,42,.045)",
} as const;

const inputStyle = {
  width: "100%",
  height: 45,
  boxSizing: "border-box" as const,
  border: `1px solid ${ORANGE_BORDER}`,
  borderRadius: 12,
  background: "#FFFFFF",
  color: TEXT,
  padding: "0 13px",
  outline: "none",
  fontSize: 14,
} as const;

const primaryButton = {
  minHeight: 42,
  padding: "0 14px",
  border: 0,
  borderRadius: 11,
  background: `linear-gradient(135deg,${ORANGE},#F59E0B)`,
  color: "#FFFFFF",
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  boxShadow: "0 7px 16px rgba(232,117,22,.15)",
} as const;

const softButton = {
  minHeight: 42,
  padding: "0 14px",
  border: `1px solid ${ORANGE_BORDER}`,
  borderRadius: 11,
  background: ORANGE_LIGHT,
  color: ORANGE_DARK,
  fontWeight: 900,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
} as const;

export default function Locations() {
  const [governorates, setGovernorates] = useState<
    Governorate[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);

  const [search, setSearch] = useState("");
  const [openId, setOpenId] =
    useState<string | null>(null);

  const [showGovernorateForm, setShowGovernorateForm] =
    useState(false);
  const [showAreaForm, setShowAreaForm] =
    useState<string | null>(null);

  const [governorateName, setGovernorateName] =
    useState("");
  const [areaName, setAreaName] =
    useState("");

  const [editingArea, setEditingArea] = useState<{
    governorateId: string;
    area: Area;
  } | null>(null);

  const [editingAreaName, setEditingAreaName] =
    useState("");

  const [confirmState, setConfirmState] =
    useState<ConfirmState>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadLocations() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/locations");
      const data = response.data;

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.locations)
          ? data.locations
          : Array.isArray(data?.governorates)
            ? data.governorates
            : [];

      setGovernorates(
        rows.map((item: Governorate) => ({
          ...item,
          areas: Array.isArray(item.areas)
            ? item.areas
            : [],
        })),
      );
    } catch (err) {
      console.error(err);

      setGovernorates([]);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل المحافظات والمناطق.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRole() {
    try {
      const response = await api.get("/auth/me");

      setCurrentRole(
        response.data?.user?.role,
      );
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error(
          "Role loading error:",
          err,
        );
      }
    }
  }

  useEffect(() => {
    void loadLocations();
    void loadRole();
  }, []);

  function showSuccess(text: string) {
    setMessage(text);

    window.setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  function ensurePermission() {
    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة المحافظات والمناطق.",
      );
      return false;
    }

    return true;
  }

  async function addGovernorate(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!ensurePermission()) return;

    const name =
      governorateName.trim();

    if (!name) {
      setError("اكتب اسم المحافظة أولًا.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post("/locations", {
        governorate: name,
        name,
      });

      setGovernorateName("");
      setShowGovernorateForm(false);

      showSuccess(
        "تمت إضافة المحافظة بنجاح.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر إضافة المحافظة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function addArea(
    event: FormEvent,
    governorateId: string,
  ) {
    event.preventDefault();

    if (!ensurePermission()) return;

    const name = areaName.trim();

    if (!name) {
      setError("اكتب اسم المنطقة أولًا.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(
        `/locations/${governorateId}/areas`,
        {
          name,
        },
      );

      setAreaName("");
      setShowAreaForm(null);

      showSuccess(
        "تمت إضافة المنطقة بنجاح.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر إضافة المنطقة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleGovernorate(
    item: Governorate,
  ) {
    if (!ensurePermission()) return;

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/locations/${item._id}`,
        {
          isActive: !item.isActive,
        },
      );

      showSuccess(
        item.isActive
          ? "تم إيقاف المحافظة."
          : "تم تفعيل المحافظة.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تغيير حالة المحافظة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleArea(
    governorateId: string,
    area: Area,
  ) {
    if (!ensurePermission()) return;

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/locations/${governorateId}/areas/${area._id}`,
        {
          isActive: !area.isActive,
        },
      );

      showSuccess(
        area.isActive
          ? "تم إيقاف المنطقة."
          : "تم تفعيل المنطقة.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تغيير حالة المنطقة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteGovernorate(
    item: Governorate,
  ) {
    if (!ensurePermission()) return;

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/locations/${item._id}`,
      );

      if (openId === item._id) {
        setOpenId(null);
      }

      showSuccess(
        "تم حذف المحافظة بنجاح.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف المحافظة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteArea(
    governorateId: string,
    area: Area,
  ) {
    if (!ensurePermission()) return;

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/locations/${governorateId}/areas/${area._id}`,
      );

      showSuccess(
        "تم حذف المنطقة بنجاح.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر حذف المنطقة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveAreaEdit() {
    if (!editingArea) return;

    if (!ensurePermission()) return;

    const name =
      editingAreaName.trim();

    if (!name) {
      setError(
        "اكتب اسم المنطقة أولًا.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/locations/${editingArea.governorateId}/areas/${editingArea.area._id}`,
        {
          name,
        },
      );

      setEditingArea(null);
      setEditingAreaName("");

      showSuccess(
        "تم تعديل المنطقة بنجاح.",
      );

      await loadLocations();
    } catch (err) {
      console.error(err);

      setError(
        getApiErrorMessage(
          err,
          "تعذر تعديل المنطقة.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function executeConfirm() {
    if (!confirmState) return;

    const current = confirmState;
    setConfirmState(null);

    if (
      current.type ===
      "delete-governorate"
    ) {
      await deleteGovernorate(
        current.governorate,
      );
      return;
    }

    if (
      current.type ===
      "delete-area"
    ) {
      await deleteArea(
        current.governorate._id,
        current.area,
      );
      return;
    }

    if (
      current.type ===
      "toggle-governorate"
    ) {
      await toggleGovernorate(
        current.governorate,
      );
      return;
    }

    await toggleArea(
      current.governorate._id,
      current.area,
    );
  }

  const filteredGovernorates =
    useMemo(() => {
      const q =
        search.trim().toLowerCase();

      if (!q) return governorates;

      return governorates
        .filter((item) => {
          if (
            item.name
              .toLowerCase()
              .includes(q)
          ) {
            return true;
          }

          return item.areas.some(
            (area) =>
              area.name
                .toLowerCase()
                .includes(q),
          );
        })
        .map((item) => ({
          ...item,
          areas:
            item.areas.filter((area) =>
              q
                ? item.name
                    .toLowerCase()
                    .includes(q) ||
                  area.name
                    .toLowerCase()
                    .includes(q)
                : true,
            ),
        }));
    }, [governorates, search]);

  const totalAreas =
    governorates.reduce(
      (sum, item) =>
        sum + item.areas.length,
      0,
    );

  const activeGovernorates =
    governorates.filter(
      (item) => item.isActive,
    ).length;

  const activeAreas =
    governorates.reduce(
      (sum, item) =>
        sum +
        item.areas.filter(
          (area) => area.isActive,
        ).length,
      0,
    );

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#FFFDFC 0%,#FFF8EF 100%)",
        padding: 22,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <section
          style={{
            ...cardStyle,
            padding: 24,
            marginBottom: 18,
            background:
              "linear-gradient(135deg,#FFFFFF 0%,#FFF8EE 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 7,
                  padding:
                    "7px 11px",
                  borderRadius: 999,
                  background:
                    ORANGE_LIGHT,
                  color:
                    ORANGE_DARK,
                  border:
                    `1px solid ${ORANGE_BORDER}`,
                  fontSize: 12,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                <MapPinned size={15} />
                المحافظات والمناطق
              </div>

              <h1
                style={{
                  margin: 0,
                  display:
                    "inline-flex",
                  padding:
                    "10px 17px",
                  borderRadius: 14,
                  background:
                    `linear-gradient(135deg,${ORANGE},#F59E0B)`,
                  color: "#FFFFFF",
                  fontSize: 25,
                  fontWeight: 950,
                  boxShadow:
                    "0 9px 22px rgba(232,117,22,.18)",
                }}
              >
                إدارة المناطق
              </h1>

              <p
                style={{
                  margin:
                    "10px 0 0",
                  color: MUTED,
                  fontSize: 14,
                }}
              >
                إدارة المحافظات والمناطق
                وحالات التفعيل من مكان واحد.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap:
                  "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  void loadLocations();
                }}
                disabled={loading}
                style={{
                  ...softButton,
                  minHeight: 44,
                }}
              >
                <RefreshCw size={17} />
                تحديث
              </button>

              {canManageLocations(
                currentRole,
              ) && (
                <button
                  type="button"
                  onClick={() =>
                    setShowGovernorateForm(
                      (value) =>
                        !value,
                    )
                  }
                  style={{
                    ...primaryButton,
                    minHeight: 44,
                  }}
                >
                  <Plus size={17} />
                  إضافة محافظة
                </button>
              )}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4,minmax(0,1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <StatCard
            icon={<MapPinned size={20} />}
            title="إجمالي المحافظات"
            value={governorates.length}
          />

          <StatCard
            icon={<Check size={20} />}
            title="المحافظات المفعلة"
            value={activeGovernorates}
          />

          <StatCard
            icon={<Layers3 size={20} />}
            title="إجمالي المناطق"
            value={totalAreas}
          />

          <StatCard
            icon={<Power size={20} />}
            title="المناطق المفعلة"
            value={activeAreas}
          />
        </section>

        {/* ADD GOVERNORATE */}
        {showGovernorateForm &&
          canManageLocations(
            currentRole,
          ) && (
            <section
              style={{
                ...cardStyle,
                padding: 20,
                marginBottom: 18,
                background:
                  "linear-gradient(135deg,#FFFFFF,#FFF9F0)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "grid",
                    placeItems:
                      "center",
                    background:
                      ORANGE_LIGHT,
                    color: ORANGE,
                    border:
                      `1px solid ${ORANGE_BORDER}`,
                  }}
                >
                  <Plus size={19} />
                </div>

                <div>
                  <div
                    style={{
                      display:
                        "inline-flex",
                      padding:
                        "7px 12px",
                      borderRadius: 10,
                      background:
                        ORANGE_SOFT,
                      color:
                        ORANGE_DARK,
                      border:
                        `1px solid ${ORANGE_BORDER}`,
                      fontWeight: 950,
                    }}
                  >
                    محافظة جديدة
                  </div>

                  <div
                    style={{
                      color: MUTED,
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    اكتب اسم المحافظة ثم أضفها.
                  </div>
                </div>
              </div>

              <form
                onSubmit={
                  addGovernorate
                }
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(0,1fr) auto auto",
                  gap: 9,
                }}
              >
                <input
                  value={
                    governorateName
                  }
                  onChange={(event) =>
                    setGovernorateName(
                      event.target.value,
                    )
                  }
                  placeholder="مثال: البصرة"
                  disabled={saving}
                  style={
                    inputStyle
                  }
                />

                <button
                  type="submit"
                  disabled={saving}
                  style={
                    primaryButton
                  }
                >
                  {saving ? (
                    <Loader2
                      size={17}
                      className="premium-spin"
                    />
                  ) : (
                    <Check size={17} />
                  )}
                  إضافة
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowGovernorateForm(
                      false,
                    )
                  }
                  style={
                    softButton
                  }
                >
                  إلغاء
                </button>
              </form>
            </section>
          )}

        {/* MESSAGES */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              background: "#FFF1F2",
              border:
                "1px solid #FECDD3",
              color: "#BE123C",
              fontWeight: 800,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 14,
              background:
                ORANGE_LIGHT,
              border:
                `1px solid ${ORANGE_BORDER}`,
              color: ORANGE_DARK,
              fontWeight: 800,
              display: "flex",
              alignItems:
                "center",
              gap: 8,
            }}
          >
            <Check size={17} />
            {message}
          </div>
        )}

        {/* SEARCH */}
        <section
          style={{
            ...cardStyle,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(0,1fr) auto",
              gap: 12,
              alignItems:
                "center",
            }}
          >
            <div
              style={{
                position: "relative",
              }}
            >
              <Search
                size={18}
                style={{
                  position:
                    "absolute",
                  right: 13,
                  top: "50%",
                  transform:
                    "translateY(-50%)",
                  color: ORANGE,
                  pointerEvents:
                    "none",
                }}
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="ابحث باسم المحافظة أو المنطقة..."
                style={{
                  ...inputStyle,
                  paddingRight: 42,
                }}
              />
            </div>

            <div
              style={{
                padding:
                  "9px 13px",
                borderRadius: 11,
                background:
                  YELLOW_LIGHT,
                border:
                  `1px solid ${YELLOW_BORDER}`,
                color:
                  "#92400E",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {filteredGovernorates.length} محافظة
            </div>
          </div>
        </section>

        {/* GOVERNORATES */}
        {loading ? (
          <section
            style={{
              ...cardStyle,
              padding: 55,
              textAlign: "center",
              color: MUTED,
            }}
          >
            <Loader2
              size={30}
              color={ORANGE}
              className="premium-spin"
            />
            <div
              style={{
                marginTop: 10,
              }}
            >
              جاري تحميل المحافظات...
            </div>
          </section>
        ) : filteredGovernorates.length ===
          0 ? (
          <section
            style={{
              ...cardStyle,
              padding: 55,
              textAlign: "center",
              color: MUTED,
            }}
          >
            <MapPinned
              size={34}
              color={ORANGE}
            />

            <div
              style={{
                marginTop: 10,
                fontWeight: 900,
                color: TEXT,
              }}
            >
              لا توجد نتائج
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
              }}
            >
              جرّب اسم محافظة أو منطقة مختلف.
            </div>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2,minmax(0,1fr))",
              gap: 16,
            }}
          >
            {filteredGovernorates.map(
              (item) => {
                const isOpen =
                  openId === item._id;

                const areaCount =
                  item.areas.length;

                const activeAreaCount =
                  item.areas.filter(
                    (area) =>
                      area.isActive,
                  ).length;

                return (
                  <section
                    key={item._id}
                    style={{
                      ...cardStyle,
                      overflow:
                        "hidden",
                      border:
                        isOpen
                          ? `2px solid ${ORANGE_BORDER}`
                          : `1px solid ${BORDER}`,
                    }}
                  >
                    {/* GOVERNORATE TOP */}
                    <div
                      style={{
                        padding: 18,
                        background:
                          isOpen
                            ? "linear-gradient(135deg,#FFF9F2,#FFF4E4)"
                            : "#FFFFFF",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 11,
                        }}
                      >
                        <div
                          style={{
                            width: 47,
                            height: 47,
                            borderRadius: 14,
                            display: "grid",
                            placeItems:
                              "center",
                            background:
                              item.isActive
                                ? ORANGE_LIGHT
                                : "#F8FAFC",
                            color:
                              item.isActive
                                ? ORANGE
                                : "#94A3B8",
                            border:
                              item.isActive
                                ? `1px solid ${ORANGE_BORDER}`
                                : `1px solid ${BORDER}`,
                            flexShrink: 0,
                          }}
                        >
                          <MapPinned
                            size={22}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 8,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <h2
                              style={{
                                margin: 0,
                                fontSize:
                                  20,
                                fontWeight:
                                  950,
                                color:
                                  TEXT,
                              }}
                            >
                              {
                                item.name
                              }
                            </h2>

                            <span
                              style={{
                                padding:
                                  "5px 9px",
                                borderRadius:
                                  999,
                                background:
                                  item.isActive
                                    ? ORANGE_LIGHT
                                    : "#F8FAFC",
                                color:
                                  item.isActive
                                    ? ORANGE_DARK
                                    : MUTED,
                                border:
                                  item.isActive
                                    ? `1px solid ${ORANGE_BORDER}`
                                    : `1px solid ${BORDER}`,
                                fontSize:
                                  11,
                                fontWeight:
                                  900,
                              }}
                            >
                              {item.isActive
                                ? "مفعلة"
                                : "متوقفة"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 5,
                              color:
                                MUTED,
                              fontSize:
                                12,
                            }}
                          >
                            {areaCount} منطقة —{" "}
                            {activeAreaCount} مفعلة
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenId(
                              isOpen
                                ? null
                                : item._id,
                            )
                          }
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius:
                              11,
                            border:
                              `1px solid ${ORANGE_BORDER}`,
                            background:
                              ORANGE_LIGHT,
                            color:
                              ORANGE_DARK,
                            cursor:
                              "pointer",
                            display:
                              "grid",
                            placeItems:
                              "center",
                            flexShrink: 0,
                          }}
                          aria-label="فتح المحافظة"
                        >
                          {isOpen ? (
                            <ChevronUp
                              size={19}
                            />
                          ) : (
                            <ChevronDown
                              size={19}
                            />
                          )}
                        </button>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 8,
                          flexWrap:
                            "wrap",
                          marginTop: 15,
                        }}
                      >
                        {canManageLocations(
                          currentRole,
                        ) && (
                          <>
                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                setConfirmState(
                                  {
                                    type:
                                      "toggle-governorate",
                                    governorate:
                                      item,
                                    title:
                                      item.isActive
                                        ? "إيقاف المحافظة"
                                        : "تفعيل المحافظة",
                                    text:
                                      item.isActive
                                        ? `هل تريد إيقاف محافظة "${item.name}"؟`
                                        : `هل تريد تفعيل محافظة "${item.name}"؟`,
                                  },
                                )
                              }
                              style={{
                                ...softButton,
                                minHeight:
                                  38,
                                padding:
                                  "0 11px",
                              }}
                            >
                              <Power
                                size={16}
                              />
                              {item.isActive
                                ? "إيقاف"
                                : "تفعيل"}
                            </button>

                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() =>
                                setConfirmState(
                                  {
                                    type:
                                      "delete-governorate",
                                    governorate:
                                      item,
                                    title:
                                      "حذف المحافظة",
                                    text:
                                      `سيتم حذف محافظة "${item.name}". تأكد أن هذا هو المطلوب.`,
                                  },
                                )
                              }
                              style={{
                                minHeight:
                                  38,
                                padding:
                                  "0 11px",
                                border:
                                  `1px solid ${ORANGE_BORDER}`,
                                borderRadius:
                                  11,
                                background:
                                  "#FFF9F4",
                                color:
                                  ORANGE_DARK,
                                fontWeight:
                                  900,
                                cursor:
                                  "pointer",
                                display:
                                  "inline-flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                gap: 7,
                              }}
                            >
                              <Trash2
                                size={16}
                              />
                              حذف
                            </button>

                            <button
                              type="button"
                              disabled={
                                saving
                              }
                              onClick={() => {
                                setShowAreaForm(
                                  (current) =>
                                    current ===
                                    item._id
                                      ? null
                                      : item._id,
                                );
                                setOpenId(
                                  item._id,
                                );
                              }}
                              style={{
                                ...primaryButton,
                                minHeight:
                                  38,
                                padding:
                                  "0 11px",
                              }}
                            >
                              <Plus
                                size={16}
                              />
                              إضافة منطقة
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ADD AREA */}
                    {showAreaForm ===
                      item._id &&
                      canManageLocations(
                        currentRole,
                      ) && (
                        <form
                          onSubmit={(event) =>
                            void addArea(
                              event,
                              item._id,
                            )
                          }
                          style={{
                            margin:
                              "0 16px 16px",
                            padding: 14,
                            borderRadius:
                              14,
                            background:
                              YELLOW_LIGHT,
                            border:
                              `1px solid ${YELLOW_BORDER}`,
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#92400E",
                              fontWeight:
                                900,
                              marginBottom:
                                9,
                              fontSize:
                                13,
                            }}
                          >
                            إضافة منطقة إلى{" "}
                            {item.name}
                          </div>

                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "minmax(0,1fr) auto auto",
                              gap: 8,
                            }}
                          >
                            <input
                              value={
                                areaName
                              }
                              onChange={(
                                event,
                              ) =>
                                setAreaName(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder="اسم المنطقة"
                              disabled={
                                saving
                              }
                              style={
                                inputStyle
                              }
                            />

                            <button
                              type="submit"
                              disabled={
                                saving
                              }
                              style={{
                                ...primaryButton,
                                minHeight:
                                  44,
                              }}
                            >
                              {saving ? (
                                <Loader2
                                  size={17}
                                  className="premium-spin"
                                />
                              ) : (
                                <Check
                                  size={17}
                                />
                              )}
                              إضافة
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowAreaForm(
                                  null,
                                );
                                setAreaName(
                                  "",
                                );
                              }}
                              style={{
                                ...softButton,
                                minHeight:
                                  44,
                              }}
                            >
                              إلغاء
                            </button>
                          </div>
                        </form>
                      )}

                    {/* AREAS */}
                    {isOpen && (
                      <div
                        style={{
                          padding:
                            "0 16px 16px",
                        }}
                      >
                        {item.areas
                          .length ===
                        0 ? (
                          <div
                            style={{
                              padding: 26,
                              textAlign:
                                "center",
                              color:
                                MUTED,
                              border:
                                `1px dashed ${ORANGE_BORDER}`,
                              borderRadius:
                                14,
                              background:
                                "#FFFDFC",
                            }}
                          >
                            <Layers3
                              size={
                                28
                              }
                              color={
                                ORANGE
                              }
                            />

                            <div
                              style={{
                                marginTop:
                                  8,
                                fontWeight:
                                  900,
                                color:
                                  TEXT,
                              }}
                            >
                              لا توجد مناطق
                            </div>

                            <div
                              style={{
                                marginTop:
                                  4,
                                fontSize:
                                  12,
                              }}
                            >
                              أضف أول منطقة
                              للمحافظة.
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display:
                                "grid",
                              gap: 8,
                            }}
                          >
                            {item.areas.map(
                              (
                                area,
                              ) => (
                                <div
                                  key={
                                    area._id
                                  }
                                  style={{
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "minmax(0,1fr) auto",
                                    alignItems:
                                      "center",
                                    gap: 10,
                                    padding: 11,
                                    border:
                                      `1px solid ${BORDER}`,
                                    borderRadius:
                                      13,
                                    background:
                                      area.isActive
                                        ? "#FFFDFC"
                                        : "#FAFAFA",
                                  }}
                                >
                                  <div
                                    style={{
                                      minWidth:
                                        0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        alignItems:
                                          "center",
                                        gap: 8,
                                        flexWrap:
                                          "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width:
                                            10,
                                          height:
                                            10,
                                          borderRadius:
                                            "50%",
                                          background:
                                            area.isActive
                                              ? ORANGE
                                              : "#CBD5E1",
                                          flexShrink:
                                            0,
                                        }}
                                      />

                                      <strong
                                        style={{
                                          color:
                                            TEXT,
                                          fontSize:
                                            14,
                                        }}
                                      >
                                        {
                                          area.name
                                        }
                                      </strong>

                                      <span
                                        style={{
                                          padding:
                                            "4px 8px",
                                          borderRadius:
                                            999,
                                          background:
                                            area.isActive
                                              ? ORANGE_LIGHT
                                              : "#F8FAFC",
                                          color:
                                            area.isActive
                                              ? ORANGE_DARK
                                              : MUTED,
                                          fontSize:
                                            10,
                                          fontWeight:
                                            900,
                                          border:
                                            area.isActive
                                              ? `1px solid ${ORANGE_BORDER}`
                                              : `1px solid ${BORDER}`,
                                        }}
                                      >
                                        {area.isActive
                                          ? "مفعلة"
                                          : "متوقفة"}
                                      </span>
                                    </div>
                                  </div>

                                  {canManageLocations(
                                    currentRole,
                                  ) && (
                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        gap: 7,
                                        flexWrap:
                                          "wrap",
                                        justifyContent:
                                          "flex-end",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        disabled={
                                          saving
                                        }
                                        onClick={() =>
                                          setConfirmState(
                                            {
                                              type:
                                                "toggle-area",
                                              governorate:
                                                item,
                                              area,
                                              title:
                                                area.isActive
                                                  ? "إيقاف المنطقة"
                                                  : "تفعيل المنطقة",
                                              text:
                                                area.isActive
                                                  ? `هل تريد إيقاف منطقة "${area.name}"؟`
                                                  : `هل تريد تفعيل منطقة "${area.name}"؟`,
                                            },
                                          )
                                        }
                                        style={{
                                          ...softButton,
                                          minHeight:
                                            36,
                                          padding:
                                            "0 10px",
                                        }}
                                      >
                                        <Power
                                          size={
                                            15
                                          }
                                        />
                                        {area.isActive
                                          ? "إيقاف"
                                          : "تفعيل"}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          saving
                                        }
                                        onClick={() => {
                                          setEditingArea(
                                            {
                                              governorateId:
                                                item._id,
                                              area,
                                            },
                                          );
                                          setEditingAreaName(
                                            area.name,
                                          );
                                        }}
                                        style={{
                                          ...softButton,
                                          minHeight:
                                            36,
                                          padding:
                                            "0 10px",
                                        }}
                                      >
                                        <Edit3
                                          size={
                                            15
                                          }
                                        />
                                        تعديل
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          saving
                                        }
                                        onClick={() =>
                                          setConfirmState(
                                            {
                                              type:
                                                "delete-area",
                                              governorate:
                                                item,
                                              area,
                                              title:
                                                "حذف المنطقة",
                                              text:
                                                `سيتم حذف منطقة "${area.name}" من محافظة "${item.name}".`,
                                            },
                                          )
                                        }
                                        style={{
                                          minHeight:
                                            36,
                                          padding:
                                            "0 10px",
                                          border:
                                            `1px solid ${ORANGE_BORDER}`,
                                          borderRadius:
                                            11,
                                          background:
                                            "#FFF9F4",
                                          color:
                                            ORANGE_DARK,
                                          fontWeight:
                                            900,
                                          cursor:
                                            "pointer",
                                          display:
                                            "inline-flex",
                                          alignItems:
                                            "center",
                                          justifyContent:
                                            "center",
                                          gap: 6,
                                        }}
                                      >
                                        <Trash2
                                          size={
                                            15
                                          }
                                        />
                                        حذف
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              },
            )}
          </div>
        )}

        {/* EDIT MODAL */}
        {editingArea && (
          <Modal
            title="تعديل اسم المنطقة"
            onClose={() => {
              if (!saving) {
                setEditingArea(null);
              }
            }}
          >
            <div
              style={{
                color: MUTED,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              تعديل منطقة{" "}
              <strong
                style={{
                  color: TEXT,
                }}
              >
                {editingArea.area.name}
              </strong>
            </div>

            <input
              autoFocus
              value={editingAreaName}
              onChange={(event) =>
                setEditingAreaName(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveAreaEdit();
                }
              }}
              disabled={saving}
              style={inputStyle}
            />

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 9,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setEditingArea(null)
                }
                disabled={saving}
                style={{
                  ...softButton,
                  minHeight: 45,
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() =>
                  void saveAreaEdit()
                }
                disabled={saving}
                style={{
                  ...primaryButton,
                  minHeight: 45,
                }}
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="premium-spin"
                  />
                ) : (
                  <Check size={17} />
                )}
                حفظ التعديل
              </button>
            </div>
          </Modal>
        )}

        {/* CONFIRM MODAL */}
        {confirmState && (
          <Modal
            title={confirmState.title}
            onClose={() => {
              if (!saving) {
                setConfirmState(
                  null,
                );
              }
            }}
            warning
          >
            <div
              style={{
                color: TEXT,
                fontSize: 14,
                lineHeight: 1.9,
                whiteSpace:
                  "pre-line",
              }}
            >
              {confirmState.text}
            </div>

            {confirmState.type.includes(
              "delete",
            ) && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: 12,
                  background:
                    ORANGE_LIGHT,
                  border:
                    `1px solid ${ORANGE_BORDER}`,
                  color:
                    ORANGE_DARK,
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.8,
                }}
              >
                هذا الإجراء يحذف البيانات من النظام
                ولا يمكن التراجع عنه.
              </div>
            )}

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: 9,
                marginTop: 19,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setConfirmState(
                    null,
                  )
                }
                disabled={saving}
                style={{
                  ...softButton,
                  minHeight: 46,
                  background:
                    "#FFFFFF",
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() =>
                  void executeConfirm()
                }
                disabled={saving}
                style={{
                  ...primaryButton,
                  minHeight: 46,
                }}
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="premium-spin"
                  />
                ) : (
                  <Check size={17} />
                )}

                {confirmState.type.includes(
                  "delete",
                )
                  ? "نعم، تنفيذ الحذف"
                  : "نعم، تنفيذ التغيير"}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: number;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: 17,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: ORANGE_LIGHT,
            border:
              `1px solid ${ORANGE_BORDER}`,
            color: ORANGE,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              color: MUTED,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 3,
              color: ORANGE_DARK,
              fontSize: 24,
              fontWeight: 950,
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  warning = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background:
          "rgba(31,41,55,.56)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) =>
          event.stopPropagation()
        }
        style={{
          width: "100%",
          maxWidth: 470,
          background: "#FFFFFF",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow:
            "0 30px 90px rgba(0,0,0,.25)",
        }}
      >
        <div
          style={{
            padding: 21,
            background:
              warning
                ? "linear-gradient(135deg,#E87516,#F59E0B)"
                : "linear-gradient(135deg,#E87516,#F59E0B)",
            color: "#FFFFFF",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  background:
                    "rgba(255,255,255,.18)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {warning ? (
                  <AlertTriangle
                    size={22}
                  />
                ) : (
                  <Edit3 size={21} />
                )}
              </div>

              <h3
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 950,
                }}
              >
                {title}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                border: 0,
                background:
                  "rgba(255,255,255,.15)",
                color: "#FFFFFF",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              aria-label="إغلاق"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 21,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
