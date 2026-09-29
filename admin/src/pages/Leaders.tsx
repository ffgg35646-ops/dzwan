import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";
import { canManageLeaders } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";
import { dzwanConfirm } from "../lib/message";

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
  updatedAt?: string;
}

interface CaptainSearchResult {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: "captain";
  status: string;
  avatarUrl?: string | null;

  governorateId?:
    | {
        _id: string;
        name: string;
      }
    | string
    | null;

  areaId?: string | null;
}

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

const roleLabels: Record<LeaderRole, string> = {
  governorate_leader: "قائد محافظة",
  area_leader: "قائد مناطق",
};

const statusLabels: Record<LeaderStatus, string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
  inactive: "غير نشط",
};

function idOf(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(value._id || "");
}

function nameOfGovernorate(value: any): string {
  if (!value) return "غير محددة";

  if (typeof value === "string") {
    return value;
  }

  return value.name || "غير محددة";
}

function statusClass(status: LeaderStatus) {
  switch (status) {
    case "active":
      return {
        background: "#ecfdf3",
        color: "#15803d",
        border: "#bbf7d0",
      };

    case "pending":
      return {
        background: "#fff7ed",
        color: "#c2410c",
        border: "#fed7aa",
      };

    case "suspended":
      return {
        background: "#fff1f2",
        color: "#be123c",
        border: "#fecdd3",
      };

    case "rejected":
      return {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "#fecaca",
      };

    default:
      return {
        background: "#f3f4f6",
        color: "#4b5563",
        border: "#e5e7eb",
      };
  }
}

export default function Leaders() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [currentRole, setCurrentRole] =
    useState<string | undefined>();

  const [search, setSearch] = useState("");

  type LeaderFilter =
    | "all"
    | "active"
    | "governorates"
    | "areas";

  const [leaderFilter, setLeaderFilter] =
    useState<LeaderFilter>("all");

  const [openId, setOpenId] =
    useState<string | null>(null);

  // =====================================================
  // CREATE / EDIT
  // =====================================================

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  // =====================================================
  // CAPTAIN -> LEADER
  // =====================================================

  const [showConversion, setShowConversion] =
    useState(false);

  const [captainSearch, setCaptainSearch] =
    useState("");

  const [captainResults, setCaptainResults] =
    useState<CaptainSearchResult[]>([]);

  const [selectedCaptain, setSelectedCaptain] =
    useState<CaptainSearchResult | null>(null);

  const [captainSearching, setCaptainSearching] =
    useState(false);

  const [captainConverting, setCaptainConverting] =
    useState(false);

  const [conversionRole, setConversionRole] =
    useState<LeaderRole>("area_leader");

  const [conversionGovernorateId, setConversionGovernorateId] =
    useState("");

  const [conversionAreaIds, setConversionAreaIds] =
    useState<string[]>([]);

  // =====================================================
  // LOCATIONS
  // =====================================================

  const governorates = useMemo(
    () =>
      locations.filter(
        (location) => location.isActive,
      ),
    [locations],
  );

  const selectedLocation = useMemo(
    () =>
      governorates.find(
        (location) =>
          location._id === form.governorateId,
      ),
    [governorates, form.governorateId],
  );

  const activeAreas =
    selectedLocation?.areas.filter(
      (area) => area.isActive,
    ) ?? [];

  const conversionLocation = useMemo(
    () =>
      governorates.find(
        (location) =>
          location._id ===
          conversionGovernorateId,
      ),
    [governorates, conversionGovernorateId],
  );

  const conversionAreas =
    conversionLocation?.areas.filter(
      (area) => area.isActive,
    ) ?? [];

  // =====================================================
  // FILTERED LEADERS
  // =====================================================

  const filteredLeaders = useMemo(() => {
    let result = leaders;

    // Card filter
    if (leaderFilter === "active") {
      result = result.filter(
        (leader) =>
          leader.status === "active",
      );
    }

    if (leaderFilter === "governorates") {
      result = result.filter(
        (leader) =>
          leader.role ===
          "governorate_leader",
      );
    }

    if (leaderFilter === "areas") {
      result = result.filter(
        (leader) =>
          leader.role ===
          "area_leader",
      );
    }

    // Text search
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return result;
    }

    return result.filter((leader) => {
      const governorate =
        nameOfGovernorate(
          leader.governorateId,
        ).toLowerCase();

      const areas =
        leader.areas
          ?.map((area) => area.name)
          .join(" ")
          .toLowerCase() || "";

      return (
        leader.fullName
          .toLowerCase()
          .includes(value) ||
        leader.phone
          .toLowerCase()
          .includes(value) ||
        (leader.email || "")
          .toLowerCase()
          .includes(value) ||
        governorate.includes(value) ||
        areas.includes(value)
      );
    });
  }, [
    leaders,
    search,
    leaderFilter,
  ]);

  // =====================================================
  // STATS
  // =====================================================

  const stats = useMemo(
    () => ({
      total: leaders.length,

      active: leaders.filter(
        (item) => item.status === "active",
      ).length,

      governorates: leaders.filter(
        (item) =>
          item.role === "governorate_leader",
      ).length,

      areas: leaders.filter(
        (item) =>
          item.role === "area_leader",
      ).length,
    }),
    [leaders],
  );

  // =====================================================
  // LOAD
  // =====================================================

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

  // =====================================================
  // CREATE / EDIT
  // =====================================================

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEdit(leader: Leader) {
    const existingAreaIds =
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
      areaIds: existingAreaIds,
    });

    setMessage("");
    setError("");
    setShowForm(true);
    setOpenId(leader._id);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({
      ...emptyForm,
    });
  }

  function toggleFormArea(id: string) {
    setForm((current) => ({
      ...current,

      areaIds:
        current.areaIds.includes(id)
          ? current.areaIds.filter(
              (areaId) =>
                areaId !== id,
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
      setMessage("");

      if (editingId) {
        const payload: Record<string, any> = {
          fullName:
            form.fullName.trim(),

          phone:
            form.phone.trim(),

          email:
            form.email.trim()
              ? form.email
                  .trim()
                  .toLowerCase()
              : null,

          governorateId:
            form.governorateId,

          areaIds:
            form.role ===
            "area_leader"
              ? form.areaIds
              : [],
        };

        if (form.password) {
          payload.password =
            form.password;
        }

        await api.patch(
          `/leaders/${editingId}`,
          payload,
        );

        setMessage(
          "تم تعديل بيانات القائد بنجاح.",
        );
      } else {
        await api.post(
          "/leaders",
          {
            role: form.role,

            fullName:
              form.fullName.trim(),

            phone:
              form.phone.trim(),

            email:
              form.email.trim()
                ? form.email
                    .trim()
                    .toLowerCase()
                : undefined,

            password:
              form.password,

            governorateId:
              form.governorateId,

            areaIds:
              form.role ===
              "area_leader"
                ? form.areaIds
                : [],
          },
        );

        setMessage(
          "تم إنشاء القائد وتفعيله بنجاح.",
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm({
        ...emptyForm,
      });

      await loadAll();
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message;

      setError(
        typeof serverMessage ===
          "string" &&
        serverMessage.trim()
          ? serverMessage
          : getApiErrorMessage(
              err,
              "تعذر حفظ بيانات القائد.",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // DELETE
  // =====================================================

  async function deleteLeader(
    leader: Leader,
  ) {
    if (
      !canManageLeaders(currentRole)
    ) {
      setError(
        "ليس لديك صلاحية لحذف القادة.",
      );
      return;
    }

    const confirmed = await dzwanConfirm(
      `هل تريد حذف القائد "${leader.fullName}"؟`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.delete(
        `/leaders/${leader._id}`,
      );

      if (
        openId === leader._id
      ) {
        setOpenId(null);
      }

      setMessage(
        "تم حذف القائد بنجاح.",
      );

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

  // =====================================================
  // CAPTAIN SEARCH
  // =====================================================

  async function searchCaptains(
    value: string,
  ) {
    setCaptainSearch(value);
    setSelectedCaptain(null);

    const q = value.trim();

    if (!q) {
      setCaptainResults([]);
      return;
    }

    try {
      setCaptainSearching(true);
      setError("");

      const response =
        await api.get(
          "/leaders/captains/search",
          {
            params: { q },
          },
        );

      setCaptainResults(
        Array.isArray(
          response.data?.captains,
        )
          ? response.data.captains
          : [],
      );
    } catch (err: any) {
      setCaptainResults([]);

      setError(
        getApiErrorMessage(
          err,
          "تعذر البحث عن الكباتن.",
        ),
      );
    } finally {
      setCaptainSearching(false);
    }
  }

  // =====================================================
  // CONVERSION
  // =====================================================

  function openConversion() {
    setCaptainSearch("");
    setCaptainResults([]);
    setSelectedCaptain(null);

    setConversionRole(
      "area_leader",
    );

    setConversionGovernorateId("");
    setConversionAreaIds([]);

    setError("");
    setMessage("");
    setShowConversion(true);
  }

  function closeConversion() {
    if (captainConverting) return;

    setShowConversion(false);

    setCaptainSearch("");
    setCaptainResults([]);
    setSelectedCaptain(null);

    setConversionGovernorateId("");
    setConversionAreaIds([]);
  }

  function toggleConversionArea(
    id: string,
  ) {
    setConversionAreaIds(
      (current) =>
        current.includes(id)
          ? current.filter(
              (areaId) =>
                areaId !== id,
            )
          : [
              ...current,
              id,
            ],
    );
  }

  async function convertCaptain() {
    if (!selectedCaptain) {
      setError(
        "اختر الكابتن أولًا.",
      );
      return;
    }

    if (!conversionGovernorateId) {
      setError(
        "اختر المحافظة.",
      );
      return;
    }

    if (
      conversionRole ===
        "area_leader" &&
      conversionAreaIds.length === 0
    ) {
      setError(
        "اختر منطقة واحدة على الأقل.",
      );
      return;
    }

    try {
      setCaptainConverting(true);
      setError("");
      setMessage("");

      await api.post(
        "/leaders/captains/convert",
        {
          captainId:
            selectedCaptain._id,

          role: conversionRole,

          governorateId:
            conversionGovernorateId,

          areaIds:
            conversionRole ===
            "area_leader"
              ? conversionAreaIds
              : [],
        },
      );

      setShowConversion(false);

      setCaptainSearch("");
      setCaptainResults([]);
      setSelectedCaptain(null);

      setConversionGovernorateId("");
      setConversionAreaIds([]);

      setMessage(
        "تم تحويل الكابتن إلى Leader بنجاح.",
      );

      await loadAll();
    } catch (err: any) {
      const serverMessage =
        err?.response?.data?.message;

      setError(
        typeof serverMessage ===
          "string" &&
        serverMessage.trim()
          ? serverMessage
          : getApiErrorMessage(
              err,
              "تعذر تحويل الكابتن إلى Leader.",
            ),
      );
    } finally {
      setCaptainConverting(false);
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      style={{
        direction: "rtl",
        width: "100%",
        maxWidth: 1500,
        margin: "0 auto",
        padding: "8px 0 40px",
      }}
    >
      <HomeBackButton />

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 900,
              color: "#f28c28",
              marginBottom: 8,
            }}
          >
            <Shield size={15} />
            الإدارة التشغيلية
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.2,
              fontWeight: 950,
              color: "#111827",
            }}
          >
            القادة
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#6b7280",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            إدارة قادة المحافظات وقادة المناطق وربطهم بالنطاق التشغيلي.
          </p>
        </div>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={openConversion}
            disabled={
              !canManageLeaders(
                currentRole,
              )
            }
            style={{
              minWidth: 205,
              height: 52,
              padding: "0 20px",
              border: 0,
              borderRadius: 15,
              background: "#f28c28",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer",
              boxShadow:
                "0 8px 20px rgba(242,140,40,.18)",
              opacity:
                canManageLeaders(
                  currentRole,
                )
                  ? 1
                  : 0.5,
            }}
          >
            <UserRound size={19} />
            تحويل كابتن إلى Leader
          </button>

          <button
            type="button"
            onClick={openCreate}
            disabled={
              !canManageLeaders(
                currentRole,
              )
            }
            style={{
              minWidth: 165,
              height: 52,
              padding: "0 20px",
              border: 0,
              borderRadius: 15,
              background: "#f5b400",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer",
              boxShadow:
                "0 8px 20px rgba(245,180,0,.18)",
              opacity:
                canManageLeaders(
                  currentRole,
                )
                  ? 1
                  : 0.5,
            }}
          >
            <Plus size={20} />
            إضافة Leader
          </button>
        </div>
      </div>

      {/* =================================================
          MESSAGES
      ================================================= */}

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: "13px 16px",
            borderRadius: 14,
            border:
              "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            marginBottom: 18,
            padding: "13px 16px",
            borderRadius: 14,
            border:
              "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#15803d",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(210px,1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          {
            key: "all" as const,
            label: "إجمالي القادة",
            value: stats.total,
            icon: UserRound,
            background: "#fffaf3",
            border: "#fde3bb",
            iconBackground: "#fff0dc",
            iconColor: "#f28c28",
          },
          {
            key: "active" as const,
            label: "نشط",
            value: stats.active,
            icon: Check,
            background: "#f6fff8",
            border: "#d8f3df",
            iconBackground: "#eaf9ee",
            iconColor: "#15803d",
          },
          {
            key: "governorates" as const,
            label: "قادة محافظات",
            value: stats.governorates,
            icon: Shield,
            background: "#fffdf3",
            border: "#f8e9ad",
            iconBackground: "#fff7d6",
            iconColor: "#b77900",
          },
          {
            key: "areas" as const,
            label: "قادة مناطق",
            value: stats.areas,
            icon: UserRound,
            background: "#fff8f1",
            border: "#f7dfcb",
            iconBackground: "#fff0e4",
            iconColor: "#d66a0b",
          },
        ].map((item) => {
          const Icon = item.icon;
          const selected =
            leaderFilter === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() =>
                setLeaderFilter(item.key)
              }
              style={{
                minWidth: 0,
                width: "100%",
                border: selected
                  ? `2px solid ${item.iconColor}`
                  : `1px solid ${item.border}`,
                background: selected
                  ? "#fff8f0"
                  : item.background,
                borderRadius: 18,
                padding: 18,
                display: "flex",
                alignItems: "center",
                gap: 13,
                textAlign: "right",
                cursor: "pointer",
                boxSizing: "border-box",
                boxShadow: selected
                  ? `0 8px 22px ${item.iconColor}22`
                  : "none",
                transition:
                  "all .18s ease",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  borderRadius: 14,
                  background:
                    item.iconBackground,
                  color: item.iconColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={19} />
              </div>

              <div>
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    marginTop: 3,
                    color: "#111827",
                    fontSize: 23,
                    fontWeight: 950,
                  }}
                >
                  {item.value}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* =================================================
          MAIN LIST
      ================================================= */}

      <section
        style={{
          background: "#fff",
          border:
            "1px solid #e9e4df",
          borderRadius: 22,
          boxShadow:
            "0 8px 28px rgba(38,30,22,.055)",
        }}
      >
        {/* LIST HEADER */}
        <div
          style={{
            padding:
              "18px 20px",
            borderBottom:
              "1px solid #eee8e3",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#111827",
                fontSize: 17,
                fontWeight: 950,
              }}
            >
              قائمة القادة
            </div>

            <div
              style={{
                marginTop: 4,
                color: "#8a817a",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {filteredLeaders.length} قائد
            </div>
          </div>

          <div
            style={{
              position: "relative",
              width:
                "min(100%, 360px)",
            }}
          >
            <Search
              size={17}
              style={{
                position:
                  "absolute",
                right: 14,
                top: 15,
                color: "#a49a92",
              }}
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value,
                )
              }
              placeholder="ابحث باسم القائد أو الهاتف أو الإيميل..."
              style={{
                width: "100%",
                height: 46,
                boxSizing:
                  "border-box",
                border:
                  "1px solid #e4ddd7",
                borderRadius: 13,
                background:
                  "#faf8f6",
                padding:
                  "0 42px 0 14px",
                outline: "none",
                color:
                  "#1f2937",
                fontSize: 13,
                fontWeight: 700,
              }}
            />
          </div>
        </div>

        {/* LIST */}
        {loading ? (
          <div
            style={{
              padding: 70,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 10,
              color: "#8a817a",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            <Loader2
              size={19}
              className="premium-spin"
            />
            جاري تحميل القادة...
          </div>
        ) : filteredLeaders.length ===
          0 ? (
          <div
            style={{
              padding:
                "70px 20px",
              textAlign:
                "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin:
                  "0 auto 12px",
                borderRadius: 17,
                background:
                  "#fff5e8",
                color:
                  "#f28c28",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
              }}
            >
              <Shield size={24} />
            </div>

            <div
              style={{
                color: "#1f2937",
                fontSize: 16,
                fontWeight: 950,
              }}
            >
              لا يوجد قادة
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#8a817a",
                fontSize: 13,
              }}
            >
              استخدم أحد زري الإضافة أو التحويل من أعلى الصفحة.
            </div>
          </div>
        ) : (
          <div>
            {filteredLeaders.map(
              (leader) => {
                const open =
                  openId ===
                  leader._id;

                const status =
                  statusClass(
                    leader.status,
                  );

                return (
                  <div
                    key={leader._id}
                    style={{
                      borderBottom:
                        "1px solid #f0ebe7",
                    }}
                  >
                    {/* ROW */}
                    <div
                      style={{
                        minHeight: 78,
                        padding:
                          "12px 18px",
                        display: "grid",
                        gridTemplateColumns:
                          "42px minmax(0,1.5fr) minmax(130px,1fr) minmax(120px,.8fr) auto",
                        alignItems:
                          "center",
                        gap: 13,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenId(
                            open
                              ? null
                              : leader._id,
                          )
                        }
                        style={{
                          width: 38,
                          height: 38,
                          border: 0,
                          borderRadius: 12,
                          background:
                            "#f7f4f1",
                          color:
                            "#72685f",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          cursor:
                            "pointer",
                        }}
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

                      <div
                        style={{
                          minWidth: 0,
                          display: "flex",
                          alignItems:
                            "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            borderRadius: 14,
                            background:
                              "#fff3e4",
                            color:
                              "#f28c28",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                          }}
                        >
                          <Shield
                            size={19}
                          />
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                              color:
                                "#111827",
                              fontSize: 14,
                              fontWeight: 950,
                            }}
                          >
                            {
                              leader.fullName
                            }
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                              color:
                                "#8a817a",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {
                              roleLabels[
                                leader.role
                              ]
                            }
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#827970",
                            fontSize: 11,
                            fontWeight: 800,
                            marginBottom: 3,
                          }}
                        >
                          المحافظة
                        </div>

                        <div
                          style={{
                            color:
                              "#374151",
                            fontSize: 13,
                            fontWeight: 850,
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {nameOfGovernorate(
                            leader.governorateId,
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          width:
                            "fit-content",
                          border:
                            `1px solid ${status.border}`,
                          background:
                            status.background,
                          color:
                            status.color,
                          borderRadius:
                            999,
                          padding:
                            "7px 11px",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {
                          statusLabels[
                            leader.status
                          ]
                        }
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "flex-end",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              leader,
                            )
                          }
                          disabled={
                            saving ||
                            !canManageLeaders(
                              currentRole,
                            )
                          }
                          title="تعديل"
                          style={{
                            width: 40,
                            height: 40,
                            border:
                              "1px solid #f5d9b9",
                            borderRadius: 12,
                            background:
                              "#fff8ef",
                            color:
                              "#d66a0b",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            cursor:
                              "pointer",
                          }}
                        >
                          <Edit3
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteLeader(
                              leader,
                            )
                          }
                          disabled={
                            saving ||
                            !canManageLeaders(
                              currentRole,
                            )
                          }
                          title="حذف"
                          style={{
                            width: 40,
                            height: 40,
                            border:
                              "1px solid #fecaca",
                            borderRadius: 12,
                            background:
                              "#fff5f5",
                            color:
                              "#dc2626",
                            display: "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            cursor:
                              "pointer",
                          }}
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    </div>

                    {/* DETAILS */}
                    {open && (
                      <div
                        style={{
                          margin:
                            "0 18px 16px 18px",
                          padding: 17,
                          borderRadius: 16,
                          background:
                            "#faf8f6",
                          border:
                            "1px solid #eee6df",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(4,minmax(0,1fr))",
                            gap: 12,
                          }}
                        >
                          {[
                            {
                              label:
                                "الهاتف",
                              value:
                                leader.phone,
                            },
                            {
                              label:
                                "الإيميل",
                              value:
                                leader.email ||
                                "غير مضاف",
                            },
                            {
                              label:
                                "نوع القائد",
                              value:
                                roleLabels[
                                  leader.role
                                ],
                            },
                            {
                              label:
                                "المحافظة",
                              value:
                                nameOfGovernorate(
                                  leader.governorateId,
                                ),
                            },
                          ].map(
                            (item) => (
                              <div
                                key={
                                  item.label
                                }
                                style={{
                                  background:
                                    "#fff",
                                  border:
                                    "1px solid #eee6df",
                                  borderRadius:
                                    13,
                                  padding:
                                    "12px 13px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 11,
                                    color:
                                      "#8a817a",
                                    fontWeight: 800,
                                  }}
                                >
                                  {
                                    item.label
                                  }
                                </div>

                                <div
                                  style={{
                                    marginTop: 5,
                                    fontSize: 13,
                                    color:
                                      "#27303b",
                                    fontWeight: 900,
                                    wordBreak:
                                      "break-word",
                                  }}
                                >
                                  {
                                    item.value
                                  }
                                </div>
                              </div>
                            ),
                          )}
                        </div>

                        <div
                          style={{
                            marginTop: 12,
                            background:
                              "#fff",
                            border:
                              "1px solid #eee6df",
                            borderRadius: 13,
                            padding:
                              "12px 13px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color:
                                "#8a817a",
                              fontWeight: 800,
                            }}
                          >
                            نطاق المناطق
                          </div>

                          <div
                            style={{
                              marginTop: 6,
                              color:
                                "#27303b",
                              fontSize: 13,
                              fontWeight: 900,
                            }}
                          >
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
                          </div>
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

      {/* =================================================
          CREATE / EDIT MODAL
      ================================================= */}

      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background:
              "rgba(17,24,39,.50)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 22,
              boxShadow:
                "0 24px 70px rgba(0,0,0,.20)",
            }}
          >
            <div
              style={{
                padding:
                  "18px 20px",
                borderBottom:
                  "1px solid #eee7e2",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 950,
                    color:
                      "#111827",
                  }}
                >
                  {editingId
                    ? "تعديل Leader"
                    : "إضافة Leader"}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color:
                      "#8a817a",
                    fontWeight: 700,
                  }}
                >
                  القائد الذي ينشئه الأدمن يكون نشطًا مباشرة.
                </div>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                style={{
                  width: 38,
                  height: 38,
                  border: 0,
                  borderRadius: 11,
                  background:
                    "#f6f4f2",
                  color:
                    "#6b625a",
                  cursor:
                    "pointer",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 20,
              }}
            >
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 14,
                }}
              >
                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom: 7,
                      color:
                        "#4b5563",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    نوع المسؤولية
                  </span>

                  <select
                    value={
                      form.role
                    }
                    disabled={
                      Boolean(
                        editingId,
                      )
                    }
                    onChange={(
                      e,
                    ) => {
                      const role =
                        e.target.value as LeaderRole;

                      setForm(
                        (
                          current,
                        ) => ({
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
                    style={{
                      width: "100%",
                      height: 46,
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 12px",
                      fontSize: 13,
                      fontWeight: 800,
                      outline: "none",
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
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom: 7,
                      color:
                        "#4b5563",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    اسم القائد
                  </span>

                  <input
                    value={
                      form.fullName
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          fullName:
                            e.target.value,
                        }),
                      )
                    }
                    placeholder="مثال: محمد أحمد"
                    style={{
                      width:
                        "100%",
                      height: 46,
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </label>

                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom: 7,
                      color:
                        "#4b5563",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    رقم الهاتف
                  </span>

                  <input
                    value={
                      form.phone
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          phone:
                            e.target.value,
                        }),
                      )
                    }
                    placeholder="07xxxxxxxxx"
                    style={{
                      width:
                        "100%",
                      height: 46,
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </label>

                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom: 7,
                      color:
                        "#4b5563",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    البريد الإلكتروني
                  </span>

                  <input
                    type="email"
                    value={
                      form.email
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          email:
                            e.target.value,
                        }),
                      )
                    }
                    placeholder="leader@example.com"
                    style={{
                      width:
                        "100%",
                      height: 46,
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </label>

                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom: 7,
                      color:
                        "#4b5563",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {editingId
                      ? "كلمة مرور جديدة"
                      : "كلمة المرور"}
                  </span>

                  <input
                    type="password"
                    value={
                      form.password
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          password:
                            e.target.value,
                        }),
                      )
                    }
                    placeholder={
                      editingId
                        ? "اختياري"
                        : "6 أحرف أو أكثر"
                    }
                    style={{
                      width:
                        "100%",
                      height: 46,
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 12px",
                      fontSize: 13,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </label>

                <label>
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom: 7,
                      color:
                        "#4b5563",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    المحافظة
                  </span>

                  <select
                    value={
                      form.governorateId
                    }
                    onChange={(
                      e,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,
                          governorateId:
                            e.target.value,
                          areaIds: [],
                        }),
                      )
                    }
                    style={{
                      width:
                        "100%",
                      height: 46,
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 12px",
                      fontSize: 13,
                      fontWeight: 800,
                      outline: "none",
                    }}
                  >
                    <option value="">
                      اختر المحافظة
                    </option>

                    {governorates.map(
                      (
                        location,
                      ) => (
                        <option
                          key={
                            location._id
                          }
                          value={
                            location._id
                          }
                        >
                          {
                            location.name
                          }
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
                    marginTop: 14,
                    padding: 13,
                    borderRadius: 13,
                    background:
                      "#fff9e8",
                    border:
                      "1px solid #f5e3a6",
                    color:
                      "#8a6500",
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.8,
                  }}
                >
                  قائد المحافظة يرى جميع المناطق والمنشآت والطلبات التابعة للمحافظة.
                </div>
              )}

              {form.role ===
                "area_leader" && (
                <div
                  style={{
                    marginTop: 14,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 9,
                      color:
                        "#374151",
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    المناطق
                  </div>

                  {!form.governorateId ? (
                    <div
                      style={{
                        padding: 13,
                        borderRadius: 13,
                        background:
                          "#faf8f6",
                        color:
                          "#8a817a",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      اختر المحافظة أولًا.
                    </div>
                  ) : activeAreas.length ===
                    0 ? (
                    <div
                      style={{
                        padding: 13,
                        borderRadius: 13,
                        background:
                          "#fff5f5",
                        color:
                          "#b91c1c",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      لا توجد مناطق مفعلة.
                    </div>
                  ) : (
                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "repeat(2,minmax(0,1fr))",
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
                                toggleFormArea(
                                  area._id,
                                )
                              }
                              style={{
                                minHeight: 44,
                                borderRadius: 12,
                                border:
                                  checked
                                    ? "2px solid #f28c28"
                                    : "1px solid #e2dad3",
                                background:
                                  checked
                                    ? "#fff5ea"
                                    : "#fff",
                                color:
                                  checked
                                    ? "#d66a0b"
                                    : "#4b5563",
                                cursor:
                                  "pointer",
                                fontSize: 12,
                                fontWeight: 850,
                              }}
                            >
                              {checked
                                ? "✓ "
                                : ""}
                              {
                                area.name
                              }
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
                  marginTop: 20,
                  display: "flex",
                  gap: 10,
                  justifyContent:
                    "flex-start",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    void saveLeader()
                  }
                  disabled={saving}
                  style={{
                    minWidth: 170,
                    height: 48,
                    border: 0,
                    borderRadius: 13,
                    background:
                      "#f5b400",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 950,
                    cursor:
                      "pointer",
                  }}
                >
                  {saving ? (
                    <Loader2
                      size={17}
                      className="premium-spin"
                    />
                  ) : editingId ? (
                    <>
                      <Check
                        size={17}
                      />
                      حفظ التعديل
                    </>
                  ) : (
                    <>
                      <Plus
                        size={18}
                      />
                      إنشاء القائد
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  style={{
                    minWidth: 110,
                    height: 48,
                    border:
                      "1px solid #ddd5ce",
                    borderRadius: 13,
                    background:
                      "#fff",
                    color:
                      "#655d56",
                    fontSize: 13,
                    fontWeight: 900,
                    cursor:
                      "pointer",
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          CAPTAIN -> LEADER MODAL
      ================================================= */}

      {showConversion && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 130,
            background:
              "rgba(17,24,39,.50)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding: 18,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 650,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 22,
              boxShadow:
                "0 24px 70px rgba(0,0,0,.20)",
            }}
          >
            <div
              style={{
                padding:
                  "18px 20px",
                borderBottom:
                  "1px solid #eee7e2",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 950,
                    color:
                      "#111827",
                  }}
                >
                  تحويل كابتن إلى Leader
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color:
                      "#8a817a",
                    fontWeight: 700,
                  }}
                >
                  نفس حساب الكابتن يتحول إلى Leader بدون إنشاء حساب جديد.
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeConversion
                }
                disabled={
                  captainConverting
                }
                style={{
                  width: 38,
                  height: 38,
                  border: 0,
                  borderRadius: 11,
                  background:
                    "#f6f4f2",
                  color:
                    "#6b625a",
                  cursor:
                    "pointer",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: 20,
              }}
            >
              {/* SEARCH */}
              <label>
                <span
                  style={{
                    display:
                      "block",
                    marginBottom: 7,
                    color:
                      "#4b5563",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  البحث عن الكابتن
                </span>

                <div
                  style={{
                    position:
                      "relative",
                  }}
                >
                  <Search
                    size={17}
                    style={{
                      position:
                        "absolute",
                      right: 14,
                      top: 14,
                      color:
                        "#9b9189",
                    }}
                  />

                  <input
                    autoFocus
                    value={
                      captainSearch
                    }
                    onChange={(
                      e,
                    ) =>
                      void searchCaptains(
                        e.target.value,
                      )
                    }
                    placeholder="اكتب الاسم أو الإيميل..."
                    style={{
                      width:
                        "100%",
                      height: 46,
                      boxSizing:
                        "border-box",
                      border:
                        "1px solid #ddd5ce",
                      borderRadius: 13,
                      background:
                        "#faf8f6",
                      padding:
                        "0 42px 0 42px",
                      fontSize: 13,
                      fontWeight: 750,
                      outline:
                        "none",
                    }}
                  />

                  {captainSearching && (
                    <Loader2
                      size={17}
                      className="premium-spin"
                      style={{
                        position:
                          "absolute",
                        left: 13,
                        top: 14,
                        color:
                          "#f28c28",
                      }}
                    />
                  )}
                </div>
              </label>

              {/* RESULTS */}
              {!selectedCaptain &&
                captainSearch.trim() && (
                  <div
                    style={{
                      marginTop: 9,
                      border:
                        "1px solid #e7dfd8",
                      borderRadius: 14,
                      overflow:
                        "hidden",
                      background:
                        "#fff",
                    }}
                  >
                    {captainResults.length >
                    0 ? (
                      captainResults.map(
                        (
                          captain,
                        ) => (
                          <button
                            key={
                              captain._id
                            }
                            type="button"
                            onClick={() => {
                              setSelectedCaptain(
                                captain,
                              );

                              const governorateId =
                                idOf(
                                  captain.governorateId,
                                );

                              setConversionGovernorateId(
                                governorateId,
                              );

                              setConversionAreaIds(
                                [],
                              );

                              setCaptainResults(
                                [],
                              );
                            }}
                            style={{
                              width:
                                "100%",
                              minHeight:
                                60,
                              padding:
                                "11px 14px",
                              border: 0,
                              borderBottom:
                                "1px solid #f0ebe7",
                              background:
                                "#fff",
                              textAlign:
                                "right",
                              cursor:
                                "pointer",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 950,
                                color:
                                  "#111827",
                              }}
                            >
                              {
                                captain.fullName
                              }
                            </div>

                            <div
                              style={{
                                marginTop: 4,
                                color:
                                  "#8a817a",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {captain.email ||
                                "بدون إيميل"}{" "}
                              •{" "}
                              {
                                captain.phone
                              }
                            </div>
                          </button>
                        ),
                      )
                    ) : captainSearching ? (
                      <div
                        style={{
                          padding:
                            18,
                          textAlign:
                            "center",
                          color:
                            "#8a817a",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        جاري البحث...
                      </div>
                    ) : (
                      <div
                        style={{
                          padding:
                            18,
                          textAlign:
                            "center",
                          color:
                            "#8a817a",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        لا توجد نتائج.
                      </div>
                    )}
                  </div>
                )}

              {/* SELECTED CAPTAIN */}
              {selectedCaptain && (
                <>
                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      border:
                        "1px solid #f4d8b7",
                      borderRadius: 15,
                      background:
                        "#fff8f0",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color:
                            "#d66a0b",
                          fontWeight: 900,
                        }}
                      >
                        الكابتن المختار
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 15,
                          color:
                            "#111827",
                          fontWeight: 950,
                        }}
                      >
                        {
                          selectedCaptain.fullName
                        }
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          color:
                            "#8a817a",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {selectedCaptain.email ||
                          "بدون إيميل"}{" "}
                        •{" "}
                        {
                          selectedCaptain.phone
                        }
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCaptain(
                          null,
                        );
                        setCaptainSearch(
                          "",
                        );
                        setCaptainResults(
                          [],
                        );
                      }}
                      style={{
                        border: 0,
                        background:
                          "#fff",
                        borderRadius: 10,
                        padding:
                          "8px 11px",
                        color:
                          "#d66a0b",
                        fontSize: 11,
                        fontWeight: 900,
                        cursor:
                          "pointer",
                      }}
                    >
                      تغيير
                    </button>
                  </div>

                  {/* ROLE */}
                  <div
                    style={{
                      marginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 8,
                        color:
                          "#4b5563",
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      نوع المسؤولية
                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {[
                        {
                          value:
                            "area_leader" as const,
                          label:
                            "قائد مناطق",
                        },
                        {
                          value:
                            "governorate_leader" as const,
                          label:
                            "قائد محافظة",
                        },
                      ].map(
                        (item) => {
                          const active =
                            conversionRole ===
                            item.value;

                          return (
                            <button
                              key={
                                item.value
                              }
                              type="button"
                              onClick={() => {
                                setConversionRole(
                                  item.value,
                                );

                                if (
                                  item.value ===
                                  "governorate_leader"
                                ) {
                                  setConversionAreaIds(
                                    [],
                                  );
                                }
                              }}
                              style={{
                                height: 44,
                                borderRadius: 12,
                                border:
                                  active
                                    ? "2px solid #f28c28"
                                    : "1px solid #ddd5ce",
                                background:
                                  active
                                    ? "#fff5ea"
                                    : "#fff",
                                color:
                                  active
                                    ? "#d66a0b"
                                    : "#5f5750",
                                fontSize: 12,
                                fontWeight: 900,
                                cursor:
                                  "pointer",
                              }}
                            >
                              {item.label}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* GOVERNORATE */}
                  <div
                    style={{
                      marginTop: 14,
                    }}
                  >
                    <label>
                      <span
                        style={{
                          display:
                            "block",
                          marginBottom: 7,
                          color:
                            "#4b5563",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        المحافظة
                      </span>

                      <select
                        value={
                          conversionGovernorateId
                        }
                        onChange={(
                          e,
                        ) => {
                          setConversionGovernorateId(
                            e.target.value,
                          );
                          setConversionAreaIds(
                            [],
                          );
                        }}
                        style={{
                          width:
                            "100%",
                          height: 46,
                          border:
                            "1px solid #ddd5ce",
                          borderRadius: 13,
                          background:
                            "#faf8f6",
                          padding:
                            "0 12px",
                          fontSize: 13,
                          fontWeight: 800,
                          outline:
                            "none",
                        }}
                      >
                        <option value="">
                          اختر المحافظة
                        </option>

                        {governorates.map(
                          (
                            location,
                          ) => (
                            <option
                              key={
                                location._id
                              }
                              value={
                                location._id
                              }
                            >
                              {
                                location.name
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>

                  {/* AREAS */}
                  {conversionRole ===
                    "area_leader" &&
                    conversionGovernorateId && (
                      <div
                        style={{
                          marginTop: 14,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 8,
                            color:
                              "#4b5563",
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          المناطق
                        </div>

                        {conversionAreas.length ===
                        0 ? (
                          <div
                            style={{
                              padding: 13,
                              borderRadius: 13,
                              background:
                                "#faf8f6",
                              color:
                                "#8a817a",
                              fontSize: 12,
                              fontWeight: 750,
                            }}
                          >
                            لا توجد مناطق مفعلة في المحافظة.
                          </div>
                        ) : (
                          <div
                            style={{
                              display:
                                "grid",
                              gridTemplateColumns:
                                "repeat(2,minmax(0,1fr))",
                              gap: 8,
                            }}
                          >
                            {conversionAreas.map(
                              (
                                area,
                              ) => {
                                const active =
                                  conversionAreaIds.includes(
                                    area._id,
                                  );

                                return (
                                  <button
                                    key={
                                      area._id
                                    }
                                    type="button"
                                    onClick={() =>
                                      toggleConversionArea(
                                        area._id,
                                      )
                                    }
                                    style={{
                                      minHeight:
                                        44,
                                      borderRadius:
                                        12,
                                      border:
                                        active
                                          ? "2px solid #f28c28"
                                          : "1px solid #ddd5ce",
                                      background:
                                        active
                                          ? "#fff5ea"
                                          : "#fff",
                                      color:
                                        active
                                          ? "#d66a0b"
                                          : "#5f5750",
                                      fontSize:
                                        12,
                                      fontWeight:
                                        850,
                                      cursor:
                                        "pointer",
                                    }}
                                  >
                                    <span
                                      style={{
                                        display:
                                          "flex",
                                        alignItems:
                                          "center",
                                        justifyContent:
                                          "space-between",
                                        padding:
                                          "0 11px",
                                      }}
                                    >
                                      {
                                        area.name
                                      }

                                      {active && (
                                        <Check
                                          size={
                                            16
                                          }
                                        />
                                      )}
                                    </span>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {/* ACTIONS */}
                  <div
                    style={{
                      display:
                        "flex",
                      gap: 9,
                      marginTop: 20,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        void convertCaptain()
                      }
                      disabled={
                        captainConverting
                      }
                      style={{
                        flex: 1,
                        height: 48,
                        border: 0,
                        borderRadius: 13,
                        background:
                          "#f28c28",
                        color: "#fff",
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 950,
                        cursor:
                          "pointer",
                      }}
                    >
                      {captainConverting ? (
                        <Loader2
                          size={
                            17
                          }
                          className="premium-spin"
                        />
                      ) : (
                        <Check
                          size={
                            17
                          }
                        />
                      )}
                      تحويل إلى Leader
                    </button>

                    <button
                      type="button"
                      onClick={
                        closeConversion
                      }
                      disabled={
                        captainConverting
                      }
                      style={{
                        minWidth: 105,
                        height: 48,
                        border:
                          "1px solid #ddd5ce",
                        borderRadius:
                          13,
                        background:
                          "#fff",
                        color:
                          "#655d56",
                        fontSize: 13,
                        fontWeight:
                          900,
                        cursor:
                          "pointer",
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
