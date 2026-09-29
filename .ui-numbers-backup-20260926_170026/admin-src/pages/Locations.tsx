import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Plus,
  MapPinned,
  Pencil,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Layers3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageLocations } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";

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

  const [showGovernorateForm, setShowGovernorateForm] =
    useState(false);
  const [showAreaForm, setShowAreaForm] =
    useState<string | null>(null);

  const [governorateName, setGovernorateName] =
    useState("");
  const [areaName, setAreaName] = useState("");
  const [search, setSearch] = useState("");

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
        getApiErrorMessage(
          err,
          "تعذر تحميل المحافظات والمناطق.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCurrentRole() {
      try {
        const response = await api.get("/auth/me");
        setCurrentRole(response.data?.user?.role);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error("Role loading error:", err);
        }
      }
    }

    void loadCurrentRole();
  }, []);

  useEffect(() => {
    void loadLocations();
  }, []);

  async function addGovernorate(event: FormEvent) {
    event.preventDefault();

    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة المحافظات والمناطق.",
      );
      return;
    }

    const name = governorateName.trim();

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
      await loadLocations();
    } catch (err: any) {
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

    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية لإدارة المحافظات والمناطق.",
      );
      return;
    }

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
        { name },
      );

      setAreaName("");
      setShowAreaForm(null);
      await loadLocations();
    } catch (err: any) {
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
    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية لتغيير حالة المحافظة.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.patch(`/locations/${item._id}`, {
        isActive: !item.isActive,
      });

      await loadLocations();
    } catch (err: any) {
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
    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية لتغيير حالة المنطقة.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/locations/${governorateId}/areas/${area._id}`,
        {
          isActive: !area.isActive,
        },
      );

      await loadLocations();
    } catch (err: any) {
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
    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية حذف المحافظات.",
      );
      return;
    }

    if (
      !window.confirm(
        `هل أنت متأكد من حذف محافظة "${item.name}"؟`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.delete(`/locations/${item._id}`);
      await loadLocations();
    } catch (err: any) {
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
    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية حذف المناطق.",
      );
      return;
    }

    if (
      !window.confirm(
        `هل أنت متأكد من حذف منطقة "${area.name}"؟`,
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.delete(
        `/locations/${governorateId}/areas/${area._id}`,
      );

      await loadLocations();
    } catch (err: any) {
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

  async function editArea(
    governorateId: string,
    area: Area,
  ) {
    if (!canManageLocations(currentRole)) {
      setError(
        "ليس لديك صلاحية تعديل المناطق.",
      );
      return;
    }

    const value = window.prompt(
      "اسم المنطقة:",
      area.name,
    );

    if (!value?.trim()) return;

    try {
      setSaving(true);
      setError("");

      await api.patch(
        `/locations/${governorateId}/areas/${area._id}`,
        {
          name: value.trim(),
        },
      );

      await loadLocations();
    } catch (err: any) {
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

  const filteredGovernorates = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return governorates;

    return governorates.filter((item) => {
      if (item.name.toLowerCase().includes(q)) {
        return true;
      }

      return item.areas.some((area) =>
        area.name.toLowerCase().includes(q),
      );
    });
  }, [governorates, search]);

  const totalAreas = governorates.reduce(
    (sum, item) => sum + item.areas.length,
    0,
  );

  const activeGovernorates =
    governorates.filter(
      (item) => item.isActive,
    ).length;

  const activeAreas = governorates.reduce(
    (sum, item) =>
      sum +
      item.areas.filter(
        (area) => area.isActive,
      ).length,
    0,
  );

  return (
    <div
      className="admin-app locations-redesign"
      dir="rtl"
    >
      <style>{`
        .locations-redesign {
          --loc-primary: #2563eb;
          --loc-primary-soft: #eff6ff;
          --loc-text: #111827;
          --loc-muted: #64748b;
          --loc-border: #e5e7eb;
          --loc-bg: #f8fafc;
        }

        .locations-shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 8px 0 48px;
        }

        .locations-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          padding: 26px;
          border: 1px solid var(--loc-border);
          border-radius: 26px;
          background:
            linear-gradient(135deg, #fff 0%, #f8fafc 55%, #eef5ff 100%);
          box-shadow: 0 18px 45px rgba(15, 23, 42, .07);
        }

        .locations-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border-radius: 999px;
          background: var(--loc-primary-soft);
          color: var(--loc-primary);
          font-size: 11px;
          font-weight: 900;
        }

        .locations-hero h1 {
          margin: 12px 0 0;
          color: var(--loc-text);
          font-size: 30px;
          line-height: 1.2;
          font-weight: 950;
        }

        .locations-hero p {
          max-width: 760px;
          margin: 10px 0 0;
          color: var(--loc-muted);
          font-size: 13px;
          line-height: 1.9;
          font-weight: 650;
        }

        .locations-primary {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          padding: 0 18px;
          border: 0;
          border-radius: 14px;
          background: var(--loc-primary);
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(37, 99, 235, .22);
        }

        .locations-error {
          margin-top: 16px;
          padding: 13px 15px;
          border: 1px solid #fecdd3;
          border-radius: 14px;
          background: #fff1f2;
          color: #be123c;
          font-size: 12px;
          font-weight: 850;
        }

        .locations-add-card {
          margin-top: 16px;
          padding: 18px;
          border: 1px solid #bfdbfe;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 12px 30px rgba(15, 23, 42, .06);
        }

        .locations-add-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .locations-add-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: var(--loc-primary-soft);
          color: var(--loc-primary);
        }

        .locations-add-head h2 {
          margin: 0;
          color: var(--loc-text);
          font-size: 15px;
          font-weight: 950;
        }

        .locations-add-head p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 11px;
          font-weight: 650;
        }

        .locations-form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
        }

        .locations-input {
          width: 100%;
          min-height: 46px;
          box-sizing: border-box;
          padding: 0 14px;
          border: 1px solid #d1d5db;
          border-radius: 13px;
          outline: none;
          background: #f9fafb;
          color: var(--loc-text);
          font-size: 13px;
          font-weight: 700;
        }

        .locations-input:focus {
          border-color: #93c5fd;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, .08);
        }

        .locations-save {
          min-height: 46px;
          padding: 0 17px;
          border: 0;
          border-radius: 13px;
          background: #111827;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }

        .locations-save:disabled,
        .locations-primary:disabled,
        .locations-action:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .locations-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .locations-stat {
          padding: 16px;
          border: 1px solid var(--loc-border);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, .045);
        }

        .locations-stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .locations-stat-label {
          color: #6b7280;
          font-size: 11px;
          font-weight: 800;
        }

        .locations-stat-icon {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #f8fafc;
          color: var(--loc-primary);
        }

        .locations-stat strong {
          display: block;
          margin-top: 9px;
          color: var(--loc-text);
          font-size: 24px;
          font-weight: 950;
        }

        .locations-board {
          margin-top: 16px;
          padding: 18px;
          border: 1px solid var(--loc-border);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, .05);
        }

        .locations-board-head {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 14px;
          flex-wrap: wrap;
        }

        .locations-board-title h2 {
          margin: 0;
          color: var(--loc-text);
          font-size: 18px;
          font-weight: 950;
        }

        .locations-board-title p {
          margin: 5px 0 0;
          color: #6b7280;
          font-size: 11px;
          font-weight: 650;
        }

        .locations-search {
          position: relative;
          width: min(420px, 100%);
        }

        .locations-search svg {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .locations-search input {
          width: 100%;
          min-height: 44px;
          box-sizing: border-box;
          padding: 0 41px 0 14px;
          border: 1px solid #d1d5db;
          border-radius: 13px;
          outline: none;
          background: #f9fafb;
          color: var(--loc-text);
          font-size: 12px;
          font-weight: 700;
        }

        .locations-list {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }

        .locations-governorate {
          overflow: hidden;
          border: 1px solid var(--loc-border);
          border-radius: 19px;
          background: #fff;
        }

        .locations-governorate.open {
          border-color: #bfdbfe;
          background: #f8fbff;
        }

        .locations-gov-row {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 13px;
        }

        .locations-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 38px;
          padding: 0 10px;
          border: 1px solid #e5e7eb;
          border-radius: 11px;
          background: #fff;
          color: #475569;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .locations-action.icon {
          width: 38px;
          min-width: 38px;
          padding: 0;
        }

        .locations-action.danger {
          border-color: #fecdd3;
          background: #fff1f2;
          color: #be123c;
        }

        .locations-gov-avatar {
          width: 44px;
          min-width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: var(--loc-primary-soft);
          color: var(--loc-primary);
        }

        .locations-governorate.open .locations-gov-avatar {
          background: #dbeafe;
        }

        .locations-gov-content {
          flex: 1;
          min-width: 0;
        }

        .locations-gov-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .locations-gov-title strong {
          color: var(--loc-text);
          font-size: 14px;
          font-weight: 950;
        }

        .locations-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 950;
        }

        .locations-status.active {
          background: #ecfdf5;
          color: #047857;
        }

        .locations-status.off {
          background: #f1f5f9;
          color: #64748b;
        }

        .locations-gov-meta {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
          font-weight: 750;
        }

        .locations-areas {
          padding: 0 13px 13px;
        }

        .locations-areas-card {
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
        }

        .locations-areas-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .locations-areas-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--loc-text);
          font-size: 13px;
          font-weight: 950;
        }

        .locations-areas-sub {
          margin-top: 5px;
          color: #6b7280;
          font-size: 10px;
          font-weight: 650;
        }

        .locations-area-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 39px;
          padding: 0 12px;
          border: 1px solid #bfdbfe;
          border-radius: 11px;
          background: var(--loc-primary-soft);
          color: var(--loc-primary);
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .locations-area-form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 9px;
          margin-top: 12px;
          padding: 11px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #f8fafc;
        }

        .locations-area-list {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .locations-area-row {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 9px 10px;
          border: 1px solid #eef2f7;
          border-radius: 13px;
          background: #f8fafc;
        }

        .locations-area-dot {
          width: 30px;
          height: 30px;
          min-width: 30px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #ecfdf5;
          color: #047857;
        }

        .locations-area-dot.off {
          background: #f1f5f9;
          color: #64748b;
        }

        .locations-area-name {
          flex: 1;
          min-width: 0;
          color: #1f2937;
          font-size: 12px;
          font-weight: 900;
        }

        .locations-empty,
        .locations-loading {
          min-height: 230px;
          display: grid;
          place-items: center;
          margin-top: 18px;
          padding: 24px;
          border: 1px dashed #cbd5e1;
          border-radius: 17px;
          background: #f8fafc;
          color: #64748b;
          text-align: center;
          font-size: 12px;
          font-weight: 800;
        }

        .locations-empty-inner {
          display: grid;
          justify-items: center;
          gap: 7px;
        }

        .locations-empty-inner strong {
          color: var(--loc-text);
          font-size: 15px;
          font-weight: 950;
        }

        .locations-empty-inner span {
          color: #64748b;
          font-size: 11px;
          font-weight: 650;
        }

        .location-spin {
          animation: locationsSpin .8s linear infinite;
        }

        @keyframes locationsSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .locations-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .locations-hero {
            flex-direction: column;
          }

          .locations-primary {
            width: 100%;
          }
        }

        @media (max-width: 620px) {
          .locations-shell {
            padding-left: 10px;
            padding-right: 10px;
          }

          .locations-stats {
            grid-template-columns: 1fr 1fr;
          }

          .locations-form,
          .locations-area-form {
            grid-template-columns: 1fr;
          }

          .locations-gov-row {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .locations-gov-content {
            min-width: calc(100% - 105px);
          }

          .locations-action {
            flex: 1 1 auto;
          }

          .locations-area-row {
            flex-wrap: wrap;
          }

          .locations-area-name {
            min-width: 120px;
          }
        }
      `}</style>

      <main className="admin-main">
        <div className="admin-content">
          <HomeBackButton />

          <div className="locations-shell">
            <section className="locations-hero">
              <div>
                <span className="locations-kicker">
                  <MapPinned size={14} />
                  إدارة التغطية
                </span>

                <h1>
                  المحافظات والمناطق
                </h1>

                <p>
                  إدارة مناطق عمل زاجل ديلفري من مكان واحد.
                  أضف محافظة ثم أضف مناطقها، وتحكم في التفعيل
                  والتعطيل والحذف والتعديل بسهولة.
                </p>
              </div>

              <button
                type="button"
                className="locations-primary"
                disabled={saving}
                onClick={() => {
                  setShowGovernorateForm(
                    (value) => !value,
                  );
                  setGovernorateName("");
                  setError("");
                }}
              >
                <Plus size={17} />
                إضافة محافظة
              </button>
            </section>

            {error && (
              <div className="locations-error">
                {error}
              </div>
            )}

            {showGovernorateForm && (
              <section className="locations-add-card">
                <div className="locations-add-head">
                  <div className="locations-add-icon">
                    <MapPinned size={19} />
                  </div>

                  <div>
                    <h2>
                      إضافة محافظة جديدة
                    </h2>
                    <p>
                      اكتب اسم المحافظة ثم احفظها مباشرة.
                    </p>
                  </div>
                </div>

                <form
                  className="locations-form"
                  onSubmit={addGovernorate}
                >
                  <input
                    className="locations-input"
                    value={governorateName}
                    onChange={(event) =>
                      setGovernorateName(
                        event.target.value,
                      )
                    }
                    placeholder="مثال: البصرة"
                    autoFocus
                    disabled={saving}
                  />

                  <button
                    className="locations-save"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2
                        size={15}
                        className="location-spin"
                      />
                    ) : (
                      <Plus size={15} />
                    )}
                    حفظ المحافظة
                  </button>
                </form>
              </section>
            )}

            <section className="locations-stats">
              <div className="locations-stat">
                <div className="locations-stat-top">
                  <span className="locations-stat-label">
                    إجمالي المحافظات
                  </span>
                  <span className="locations-stat-icon">
                    <MapPinned size={16} />
                  </span>
                </div>
                <strong>
                  {governorates.length}
                </strong>
              </div>

              <div className="locations-stat">
                <div className="locations-stat-top">
                  <span className="locations-stat-label">
                    المحافظات النشطة
                  </span>
                  <span className="locations-stat-icon">
                    <CheckCircle2 size={16} />
                  </span>
                </div>
                <strong>
                  {activeGovernorates}
                </strong>
              </div>

              <div className="locations-stat">
                <div className="locations-stat-top">
                  <span className="locations-stat-label">
                    إجمالي المناطق
                  </span>
                  <span className="locations-stat-icon">
                    <Layers3 size={16} />
                  </span>
                </div>
                <strong>
                  {totalAreas}
                </strong>
              </div>

              <div className="locations-stat">
                <div className="locations-stat-top">
                  <span className="locations-stat-label">
                    المناطق النشطة
                  </span>
                  <span className="locations-stat-icon">
                    <CheckCircle2 size={16} />
                  </span>
                </div>
                <strong>
                  {activeAreas}
                </strong>
              </div>
            </section>

            <section className="locations-board">
              <div className="locations-board-head">
                <div className="locations-board-title">
                  <h2>
                    قائمة المحافظات
                  </h2>
                  <p>
                    افتح المحافظة لإضافة وإدارة مناطقها.
                  </p>
                </div>

                <div className="locations-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                    placeholder="ابحث عن محافظة أو منطقة..."
                  />
                </div>
              </div>

              {loading ? (
                <div className="locations-loading">
                  <Loader2
                    size={23}
                    className="location-spin"
                  />
                  جاري تحميل المحافظات...
                </div>
              ) : filteredGovernorates.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-inner">
                    <MapPinned
                      size={29}
                      color="#94a3b8"
                    />
                    <strong>
                      لا توجد نتائج
                    </strong>
                    <span>
                      أضف محافظة جديدة أو غيّر كلمة البحث.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="locations-list">
                  {filteredGovernorates.map(
                    (item) => {
                      const isOpen =
                        openId === item._id;

                      const activeAreaCount =
                        item.areas.filter(
                          (area) =>
                            area.isActive,
                        ).length;

                      return (
                        <article
                          className={`locations-governorate ${
                            isOpen ? "open" : ""
                          }`}
                          key={item._id}
                        >
                          <div className="locations-gov-row">
                            <button
                              type="button"
                              className="locations-action icon"
                              disabled={saving}
                              onClick={() =>
                                setOpenId(
                                  isOpen
                                    ? null
                                    : item._id,
                                )
                              }
                              title={
                                isOpen
                                  ? "إغلاق"
                                  : "فتح"
                              }
                            >
                              {isOpen ? (
                                <ChevronUp
                                  size={16}
                                />
                              ) : (
                                <ChevronDown
                                  size={16}
                                />
                              )}
                            </button>

                            <div className="locations-gov-avatar">
                              <MapPinned size={19} />
                            </div>

                            <div className="locations-gov-content">
                              <div className="locations-gov-title">
                                <strong>
                                  {item.name}
                                </strong>

                                <span
                                  className={`locations-status ${
                                    item.isActive
                                      ? "active"
                                      : "off"
                                  }`}
                                >
                                  {item.isActive
                                    ? "نشطة"
                                    : "متوقفة"}
                                </span>
                              </div>

                              <div className="locations-gov-meta">
                                <span>
                                  {item.areas.length} منطقة
                                </span>
                                <span>•</span>
                                <span>
                                  {activeAreaCount} نشطة
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="locations-action"
                              disabled={saving}
                              onClick={() =>
                                void toggleGovernorate(
                                  item,
                                )
                              }
                            >
                              <Power size={14} />
                              {item.isActive
                                ? "تعطيل"
                                : "تفعيل"}
                            </button>

                            <button
                              type="button"
                              className="locations-action icon danger"
                              disabled={saving}
                              onClick={() =>
                                void deleteGovernorate(
                                  item,
                                )
                              }
                              title="حذف المحافظة"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {isOpen && (
                            <div className="locations-areas">
                              <div className="locations-areas-card">
                                <div className="locations-areas-head">
                                  <div>
                                    <div className="locations-areas-title">
                                      <Layers3
                                        size={16}
                                        color="#2563eb"
                                      />
                                      مناطق {item.name}
                                    </div>

                                    <div className="locations-areas-sub">
                                      جميع المناطق التابعة لهذه المحافظة.
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="locations-area-add"
                                    disabled={saving}
                                    onClick={() => {
                                      setShowAreaForm(
                                        showAreaForm ===
                                          item._id
                                          ? null
                                          : item._id,
                                      );
                                      setAreaName("");
                                      setError("");
                                    }}
                                  >
                                    <Plus size={14} />
                                    إضافة منطقة
                                  </button>
                                </div>

                                {showAreaForm ===
                                  item._id && (
                                  <form
                                    className="locations-area-form"
                                    onSubmit={(
                                      event,
                                    ) =>
                                      void addArea(
                                        event,
                                        item._id,
                                      )
                                    }
                                  >
                                    <input
                                      className="locations-input"
                                      value={areaName}
                                      onChange={(
                                        event,
                                      ) =>
                                        setAreaName(
                                          event.target
                                            .value,
                                        )
                                      }
                                      placeholder="مثال: العشار"
                                      autoFocus
                                      disabled={saving}
                                    />

                                    <button
                                      type="submit"
                                      className="locations-save"
                                      disabled={saving}
                                    >
                                      {saving ? (
                                        <Loader2
                                          size={15}
                                          className="location-spin"
                                        />
                                      ) : (
                                        <Plus size={15} />
                                      )}
                                      حفظ المنطقة
                                    </button>
                                  </form>
                                )}

                                {item.areas.length ===
                                0 ? (
                                  <div className="locations-empty">
                                    <div className="locations-empty-inner">
                                      <Layers3
                                        size={25}
                                        color="#94a3b8"
                                      />
                                      <strong>
                                        لا توجد مناطق بعد
                                      </strong>
                                      <span>
                                        اضغط «إضافة منطقة» لإنشاء أول منطقة.
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="locations-area-list">
                                    {item.areas.map(
                                      (area) => (
                                        <div
                                          className="locations-area-row"
                                          key={
                                            area._id
                                          }
                                        >
                                          <div
                                            className={`locations-area-dot ${
                                              area.isActive
                                                ? ""
                                                : "off"
                                            }`}
                                          >
                                            {area.isActive ? (
                                              <CheckCircle2
                                                size={
                                                  15
                                                }
                                              />
                                            ) : (
                                              <XCircle
                                                size={
                                                  15
                                                }
                                              />
                                            )}
                                          </div>

                                          <div className="locations-area-name">
                                            {area.name}
                                          </div>

                                          <span
                                            className={`locations-status ${
                                              area.isActive
                                                ? "active"
                                                : "off"
                                            }`}
                                          >
                                            {area.isActive
                                              ? "نشطة"
                                              : "متوقفة"}
                                          </span>

                                          <button
                                            type="button"
                                            className="locations-action icon"
                                            disabled={saving}
                                            onClick={() =>
                                              void toggleArea(
                                                item._id,
                                                area,
                                              )
                                            }
                                            title={
                                              area.isActive
                                                ? "تعطيل"
                                                : "تفعيل"
                                            }
                                          >
                                            <Power
                                              size={
                                                14
                                              }
                                            />
                                          </button>

                                          <button
                                            type="button"
                                            className="locations-action icon"
                                            disabled={saving}
                                            onClick={() =>
                                              void editArea(
                                                item._id,
                                                area,
                                              )
                                            }
                                            title="تعديل"
                                          >
                                            <Pencil
                                              size={
                                                14
                                              }
                                            />
                                          </button>

                                          <button
                                            type="button"
                                            className="locations-action icon danger"
                                            disabled={saving}
                                            onClick={() =>
                                              void deleteArea(
                                                item._id,
                                                area,
                                              )
                                            }
                                            title="حذف"
                                          >
                                            <Trash2
                                              size={
                                                14
                                              }
                                            />
                                          </button>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
