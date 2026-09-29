import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CircleAlert,
  Loader2,
  MapPinned,
  RefreshCw,
  Save,
  Search,
  Store,
  X,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { HomeBackButton } from "../components/HomeBackButton";

interface Establishment {
  _id: string;
  name: string;
  type: "restaurant" | "shop";
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  governorateId?: string | { _id: string; name?: string };
  areaId?: string;
}

interface FormState {
  establishmentId: string;
  latitude: string;
  longitude: string;
}

function getGovernorateName(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    "name" in value
  ) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" ? name : "";
  }

  return "";
}

export default function EstablishmentLocations() {
  const [rows, setRows] = useState<Establishment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    establishmentId: "",
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) =>
      row.name.toLowerCase().includes(query),
    );
  }, [rows, search]);

  const selectedEstablishment = useMemo(
    () =>
      rows.find((row) => row._id === selectedId) || null,
    [rows, selectedId],
  );

  const locatedCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.latitude != null &&
          row.longitude != null,
      ).length,
    [rows],
  );

  const missingCount = rows.length - locatedCount;

  async function loadEstablishments() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/establishments");
      const data = response.data;

      const establishments = Array.isArray(data)
        ? data
        : Array.isArray(data?.establishments)
          ? data.establishments
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setRows(establishments);

      setSelectedId((current) => {
        if (
          current &&
          establishments.some(
            (item: Establishment) => item._id === current,
          )
        ) {
          return current;
        }

        return establishments[0]?._id || "";
      });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر تحميل المنشآت.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEstablishments();
  }, []);

  useEffect(() => {
    if (!selectedEstablishment) {
      setForm({
        establishmentId: "",
        latitude: "",
        longitude: "",
      });
      return;
    }

    setForm({
      establishmentId: selectedEstablishment._id,
      latitude:
        selectedEstablishment.latitude != null
          ? String(selectedEstablishment.latitude)
          : "",
      longitude:
        selectedEstablishment.longitude != null
          ? String(selectedEstablishment.longitude)
          : "",
    });
  }, [selectedEstablishment]);

  function validate() {
    if (!form.establishmentId) {
      return "اختر المنشأة أولًا.";
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return "خط العرض يجب أن يكون بين -90 و 90.";
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return "خط الطول يجب أن يكون بين -180 و 180.";
    }

    return "";
  }

  async function saveLocation() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const validationError = validate();

      if (validationError) {
        setError(validationError);
        return;
      }

      const response = await api.patch(
        `/establishments/${form.establishmentId}`,
        {
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        },
      );

      const updated =
        response.data?.establishment ||
        response.data?.data ||
        response.data;

      if (updated?._id) {
        setRows((current) =>
          current.map((row) =>
            row._id === updated._id
              ? {
                  ...row,
                  latitude: updated.latitude,
                  longitude: updated.longitude,
                }
              : row,
          ),
        );
      } else {
        await loadEstablishments();
      }

      setMessage("تم حفظ موقع المنشأة بنجاح.");
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر حفظ موقع المنشأة.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearLocation() {
    if (!form.establishmentId) return;

    if (
      !window.confirm(
        "هل تريد إزالة إحداثيات المنشأة؟",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/establishments/${form.establishmentId}`,
        {
          latitude: null,
          longitude: null,
        },
      );

      const updated =
        response.data?.establishment ||
        response.data?.data ||
        response.data;

      setForm((current) => ({
        ...current,
        latitude: "",
        longitude: "",
      }));

      setRows((current) =>
        current.map((row) =>
          row._id === form.establishmentId
            ? {
                ...row,
                latitude: updated?.latitude ?? null,
                longitude: updated?.longitude ?? null,
              }
            : row,
        ),
      );

      setMessage("تمت إزالة موقع المنشأة.");
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "تعذر إزالة موقع المنشأة.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="premium-page" dir="rtl">
      <div className="premium-page-shell">
        <section className="premium-page-intro">
          <div>
            <HomeBackButton />
            <span className="premium-page-kicker">
              المواقع والتوزيع
            </span>
            <h1>مواقع المنشآت</h1>
            <p>
              إدارة إحداثيات المطاعم والمحلات لاستخدامها في
              التوزيع والتسعير الجغرافي.
            </p>
          </div>

          <div className="premium-page-icon">
            <MapPinned size={28} />
          </div>
        </section>

        <section className="premium-stat-grid compact">
          <div className="premium-stat-card">
            <div className="premium-stat-icon">
              <Store size={20} />
            </div>
            <span>إجمالي المنشآت</span>
            <strong>{rows.length}</strong>
          </div>

          <div className="premium-stat-card">
            <div className="premium-stat-icon success">
              <Check size={20} />
            </div>
            <span>مواقع محددة</span>
            <strong>{locatedCount}</strong>
          </div>

          <div className="premium-stat-card">
            <div className="premium-stat-icon danger">
              <CircleAlert size={20} />
            </div>
            <span>بدون موقع</span>
            <strong>{missingCount}</strong>
          </div>
        </section>

        {(message || error) && (
          <div className={error ? "premium-error" : "premium-success"}>
            {error || message}
          </div>
        )}

        <section className="premium-panel">
          <div className="premium-section-heading">
            <div>
              <span>إحداثيات المنشأة</span>
              <h2>تحديد موقع المنشأة</h2>
              <p>
                ابحث عن المنشأة ثم أدخل خط العرض وخط الطول.
              </p>
            </div>

            <button
              type="button"
              className="premium-button ghost"
              disabled={busy || loading}
              onClick={() => void loadEstablishments()}
            >
              <RefreshCw size={17} />
              تحديث
            </button>
          </div>

          <div className="premium-search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ابحث باسم المطعم أو المحل..."
            />
          </div>

          <div className="premium-form-grid">
            <label className="premium-field">
              <span>المنشأة</span>
              <select
                value={selectedId}
                disabled={loading || busy}
                onChange={(event) =>
                  setSelectedId(event.target.value)
                }
              >
                <option value="">اختر المنشأة</option>
                {filteredRows.map((row) => (
                  <option key={row._id} value={row._id}>
                    {row.name} —{" "}
                    {row.type === "restaurant"
                      ? "مطعم"
                      : "محل"}
                  </option>
                ))}
              </select>
            </label>

            <label className="premium-field">
              <span>خط العرض</span>
              <input
                type="number"
                step="any"
                min="-90"
                max="90"
                value={form.latitude}
                disabled={busy || !form.establishmentId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    latitude: event.target.value,
                  }))
                }
                placeholder="33.3150"
              />
            </label>

            <label className="premium-field">
              <span>خط الطول</span>
              <input
                type="number"
                step="any"
                min="-180"
                max="180"
                value={form.longitude}
                disabled={busy || !form.establishmentId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    longitude: event.target.value,
                  }))
                }
                placeholder="44.3650"
              />
            </label>
          </div>

          {selectedEstablishment && (
            <div className="premium-location-preview">
              <div className="premium-location-preview-icon">
                <MapPinned size={22} />
              </div>

              <div>
                <span>المنشأة المحددة</span>
                <strong>{selectedEstablishment.name}</strong>
                <small>
                  {getGovernorateName(
                    selectedEstablishment.governorateId,
                  ) || "المحافظة غير محددة"}
                </small>
              </div>

              <div className="premium-location-coords">
                <div>
                  <span>Latitude</span>
                  <strong>
                    {selectedEstablishment.latitude ?? "—"}
                  </strong>
                </div>
                <div>
                  <span>Longitude</span>
                  <strong>
                    {selectedEstablishment.longitude ?? "—"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="premium-form-actions">
            <button
              type="button"
              className="premium-button primary"
              disabled={busy || !form.establishmentId}
              onClick={() => void saveLocation()}
            >
              {busy ? (
                <Loader2 size={17} className="premium-spin" />
              ) : (
                <Save size={17} />
              )}
              {busy ? "جارٍ الحفظ..." : "حفظ الموقع"}
            </button>

            <button
              type="button"
              className="premium-button danger"
              disabled={
                busy ||
                !form.establishmentId ||
                (
                  selectedEstablishment?.latitude == null &&
                  selectedEstablishment?.longitude == null
                )
              }
              onClick={() => void clearLocation()}
            >
              <X size={17} />
              إزالة الموقع
            </button>
          </div>
        </section>

        <section className="premium-panel">
          <div className="premium-section-heading">
            <div>
              <span>المتابعة</span>
              <h2>حالة مواقع المنشآت</h2>
              <p>
                تعرف بسرعة على المنشآت التي تحتاج إلى تحديد
                موقعها.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="premium-state-card">
              <Loader2 size={28} className="premium-spin" />
              <span>جارٍ تحميل المنشآت...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="premium-state-card muted">
              <Store size={30} />
              <h3>لا توجد منشآت</h3>
              <p>لم يتم العثور على منشآت حاليًا.</p>
            </div>
          ) : (
            <div className="premium-establishment-grid">
              {rows.map((row) => {
                const hasLocation =
                  row.latitude != null &&
                  row.longitude != null;

                return (
                  <article
                    className="premium-establishment-card"
                    key={row._id}
                  >
                    <div className="premium-establishment-top">
                      <div className="premium-rule-icon">
                        <Store size={19} />
                      </div>

                      <span
                        className={`premium-status-pill ${
                          hasLocation
                            ? "success"
                            : "neutral"
                        }`}
                      >
                        {hasLocation
                          ? "الموقع محدد"
                          : "بدون موقع"}
                      </span>
                    </div>

                    <h3>{row.name}</h3>
                    <p>
                      {row.type === "restaurant"
                        ? "مطعم"
                        : "محل"}
                    </p>

                    <div className="premium-establishment-coords">
                      <div>
                        <span>خط العرض</span>
                        <strong>
                          {row.latitude ?? "غير محدد"}
                        </strong>
                      </div>

                      <div>
                        <span>خط الطول</span>
                        <strong>
                          {row.longitude ?? "غير محدد"}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="premium-button ghost full"
                      disabled={busy}
                      onClick={() => {
                        setSelectedId(row._id);
                        window.scrollTo({
                          top: 0,
                          behavior: "smooth",
                        });
                      }}
                    >
                      <MapPinned size={16} />
                      تعديل الموقع
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
