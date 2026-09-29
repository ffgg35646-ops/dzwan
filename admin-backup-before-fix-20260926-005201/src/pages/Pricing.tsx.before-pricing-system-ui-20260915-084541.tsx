import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import "./Pricing.css";

type PricingType =
  | "default"
  | "governorate"
  | "area"
  | "area_to_area"
  | "establishment"
  | "establishment_type"
  | "geofence_to_geofence";

interface LocationArea {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface LocationItem {
  _id: string;
  name: string;
  isActive?: boolean;
  areas?: LocationArea[];
}

interface EstablishmentItem {
  _id: string;
  name: string;
  type: "restaurant" | "shop";
  status?: string;
  governorateId?: string | { _id: string; name?: string };
  areaId?: string | { _id: string; name?: string };
}

interface GeofenceItem {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface PricingRule {
  _id: string;
  name: string;
  type: PricingType;
  amount: number;

  governorateId?: string | { _id: string; name?: string } | null;
  areaId?: string | { _id: string; name?: string } | null;

  fromGovernorateId?: string | { _id: string; name?: string } | null;
  fromAreaId?: string | { _id: string; name?: string } | null;

  toGovernorateId?: string | { _id: string; name?: string } | null;
  toAreaId?: string | { _id: string; name?: string } | null;

  establishmentId?: string | { _id: string; name?: string } | null;
  establishmentType?: "restaurant" | "shop" | null;

  fromGeofenceId?: string | { _id: string; name?: string } | null;
  toGeofenceId?: string | { _id: string; name?: string } | null;

  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

interface PricingForm {
  name: string;
  type: PricingType;
  amount: string;
  priority: string;

  governorateId: string;
  areaId: string;

  fromGovernorateId: string;
  fromAreaId: string;
  toGovernorateId: string;
  toAreaId: string;

  establishmentId: string;
  establishmentType: "" | "restaurant" | "shop";

  fromGeofenceId: string;
  toGeofenceId: string;

  startsAt: string;
  endsAt: string;
}

const emptyForm: PricingForm = {
  name: "",
  type: "default",
  amount: "",
  priority: "0",

  governorateId: "",
  areaId: "",

  fromGovernorateId: "",
  fromAreaId: "",
  toGovernorateId: "",
  toAreaId: "",

  establishmentId: "",
  establishmentType: "",

  fromGeofenceId: "",
  toGeofenceId: "",

  startsAt: "",
  endsAt: "",
};

const typeLabels: Record<PricingType, string> = {
  default: "السعر الأساسي",
  governorate: "حسب المحافظة",
  area: "حسب المنطقة",
  area_to_area: "منطقة إلى منطقة",
  establishment: "منشأة محددة",
  establishment_type: "نوع منشأة",
  geofence_to_geofence: "منطقة جغرافية إلى منطقة جغرافية",
};

function idOf(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return typeof id === "string" ? id : "";
  }

  return "";
}

function unwrapArray<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const object = payload as Record<string, unknown>;

  const candidates = [
    object.data,
    object.items,
    object.results,
    object.locations,
    object.establishments,
    object.geofences,
    object.rules,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      Array.isArray((candidate as Record<string, unknown>).items)
    ) {
      return (candidate as Record<string, unknown>)
        .items as T[];
    }
  }

  return [];
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );

  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getRuleSummary(row: PricingRule) {
  switch (row.type) {
    case "default":
      return "تطبق كقاعدة أساسية عند عدم وجود قاعدة أكثر تخصيصًا.";

    case "governorate":
      return "تطبق على المحافظة المحددة.";

    case "area":
      return "تطبق على المنطقة المحددة.";

    case "area_to_area":
      return "تطبق على مسار منطقة إلى منطقة محدد.";

    case "establishment":
      return "تطبق على منشأة محددة.";

    case "establishment_type":
      return `تطبق على جميع ${
        row.establishmentType === "restaurant"
          ? "المطاعم"
          : "المحلات"
      }.`;

    case "geofence_to_geofence":
      return "تطبق بين منطقتين جغرافيتين محددتين.";

    default:
      return "";
  }
}

export default function Pricing() {
  const [rows, setRows] = useState<PricingRule[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [establishments, setEstablishments] = useState<
    EstablishmentItem[]
  >([]);
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);

  const [form, setForm] = useState<PricingForm>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const governorates = useMemo(
    () =>
      locations.filter(
        (item) => item.isActive !== false,
      ),
    [locations],
  );

  const selectedGovernorate = useMemo(
    () =>
      governorates.find(
        (item) => item._id === form.governorateId,
      ),
    [governorates, form.governorateId],
  );

  const selectedFromGovernorate = useMemo(
    () =>
      governorates.find(
        (item) =>
          item._id === form.fromGovernorateId,
      ),
    [governorates, form.fromGovernorateId],
  );

  const selectedToGovernorate = useMemo(
    () =>
      governorates.find(
        (item) => item._id === form.toGovernorateId,
      ),
    [governorates, form.toGovernorateId],
  );

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [
        pricingResponse,
        locationsResponse,
        establishmentsResponse,
        geofencesResponse,
      ] = await Promise.all([
        api.get("/pricing"),
        api.get("/locations"),
        api.get("/establishments"),
        api.get("/geofences"),
      ]);

      setRows(
        unwrapArray<PricingRule>(
          pricingResponse.data,
        ),
      );

      setLocations(
        unwrapArray<LocationItem>(
          locationsResponse.data,
        ),
      );

      setEstablishments(
        unwrapArray<EstablishmentItem>(
          establishmentsResponse.data,
        ),
      );

      setGeofences(
        unwrapArray<GeofenceItem>(
          geofencesResponse.data,
        ),
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "تعذر تحميل بيانات التسعير.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setEditingIsActive(true);
  }

  function updateField<K extends keyof PricingForm>(
    field: K,
    value: PricingForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function editRule(row: PricingRule) {
    setEditingId(row._id);
    setEditingIsActive(row.isActive);

    setForm({
      name: row.name || "",
      type: row.type,
      amount: String(row.amount ?? ""),
      priority: String(row.priority ?? 0),

      governorateId: idOf(row.governorateId),
      areaId: idOf(row.areaId),

      fromGovernorateId: idOf(
        row.fromGovernorateId,
      ),
      fromAreaId: idOf(row.fromAreaId),
      toGovernorateId: idOf(
        row.toGovernorateId,
      ),
      toAreaId: idOf(row.toAreaId),

      establishmentId: idOf(row.establishmentId),
      establishmentType:
        row.establishmentType || "",

      fromGeofenceId: idOf(row.fromGeofenceId),
      toGeofenceId: idOf(row.toGeofenceId),

      startsAt: toDateTimeLocal(row.startsAt),
      endsAt: toDateTimeLocal(row.endsAt),
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "اسم قاعدة التسعير مطلوب.";
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      return "رسوم التوصيل يجب أن تكون رقمًا صحيحًا أو عشريًا أكبر من أو يساوي صفر.";
    }

    const priority = Number(form.priority);

    if (!Number.isInteger(priority)) {
      return "الأولوية يجب أن تكون رقمًا صحيحًا.";
    }

    if (form.startsAt && form.endsAt) {
      const starts = new Date(form.startsAt);
      const ends = new Date(form.endsAt);

      if (
        Number.isNaN(starts.getTime()) ||
        Number.isNaN(ends.getTime())
      ) {
        return "التاريخ المدخل غير صحيح.";
      }

      if (ends <= starts) {
        return "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.";
      }
    }

    if (form.type === "governorate") {
      if (!form.governorateId) {
        return "اختر المحافظة.";
      }
    }

    if (form.type === "area") {
      if (!form.governorateId) {
        return "اختر المحافظة.";
      }

      if (!form.areaId) {
        return "اختر المنطقة.";
      }
    }

    if (form.type === "area_to_area") {
      if (
        !form.fromGovernorateId ||
        !form.fromAreaId ||
        !form.toGovernorateId ||
        !form.toAreaId
      ) {
        return "يجب تحديد محافظة ومنطقة البداية ومحافظة ومنطقة النهاية.";
      }
    }

    if (form.type === "establishment") {
      if (!form.establishmentId) {
        return "اختر المنشأة.";
      }
    }

    if (form.type === "establishment_type") {
      if (!form.establishmentType) {
        return "اختر نوع المنشأة.";
      }
    }

    if (form.type === "geofence_to_geofence") {
      if (
        !form.fromGeofenceId ||
        !form.toGeofenceId
      ) {
        return "اختر منطقة جغرافية للبداية وأخرى للنهاية.";
      }
    }

    return "";
  }

  function buildPayload() {
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      amount: Number(form.amount),
      priority: Number(form.priority),
      startsAt: toIsoOrNull(form.startsAt),
      endsAt: toIsoOrNull(form.endsAt),
      isActive: editingId ? editingIsActive : true,
    };

    if (
      form.type === "governorate" ||
      form.type === "area"
    ) {
      payload.governorateId =
        form.governorateId || null;
    }

    if (form.type === "area") {
      payload.areaId = form.areaId || null;
    }

    if (form.type === "area_to_area") {
      payload.fromGovernorateId =
        form.fromGovernorateId || null;

      payload.fromAreaId =
        form.fromAreaId || null;

      payload.toGovernorateId =
        form.toGovernorateId || null;

      payload.toAreaId =
        form.toAreaId || null;
    }

    if (form.type === "establishment") {
      payload.establishmentId =
        form.establishmentId || null;
    }

    if (form.type === "establishment_type") {
      payload.establishmentType =
        form.establishmentType || null;
    }

    if (
      form.type === "geofence_to_geofence"
    ) {
      payload.fromGeofenceId =
        form.fromGeofenceId || null;

      payload.toGeofenceId =
        form.toGeofenceId || null;
    }

    return payload;
  }

  async function saveRule() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const validationError = validateForm();

      if (validationError) {
        setError(validationError);
        return;
      }

      const payload = buildPayload();

      if (editingId) {
        const response = await api.patch(
          `/pricing/${editingId}`,
          payload,
        );

        const updated = response.data;

        setRows((current) =>
          current.map((item) => {
            const next =
              updated?.data ||
              updated?.rule ||
              updated;

            return next?._id === item._id
              ? next
              : item;
          }),
        );

        setMessage(
          "تم تعديل قاعدة التسعير بنجاح.",
        );
      } else {
        const response = await api.post(
          "/pricing",
          payload,
        );

        const created =
          response.data?.data ||
          response.data?.rule ||
          response.data;

        if (created?._id) {
          setRows((current) => [
            created,
            ...current,
          ]);
        } else {
          await loadAll();
        }

        setMessage(
          "تمت إضافة قاعدة التسعير بنجاح.",
        );
      }

      resetForm();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "تعذر حفظ قاعدة التسعير.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleRule(row: PricingRule) {
    const action = row.isActive
      ? "تعطيل"
      : "تفعيل";

    if (
      !window.confirm(
        `هل تريد ${action} قاعدة "${row.name}"؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/pricing/${row._id}`,
        {
          isActive: !row.isActive,
        },
      );

      const updated =
        response.data?.data ||
        response.data?.rule ||
        response.data;

      setRows((current) =>
        current.map((item) =>
          item._id === row._id
            ? {
                ...item,
                ...(updated || {}),
                isActive: !row.isActive,
              }
            : item,
        ),
      );

      setMessage(
        row.isActive
          ? "تم تعطيل القاعدة."
          : "تم تفعيل القاعدة.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "تعذر تعديل حالة القاعدة.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(row: PricingRule) {
    if (
      !window.confirm(
        `سيتم حذف قاعدة "${row.name}" نهائيًا. هل أنت متأكد؟`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await api.delete(
        `/pricing/${row._id}`,
      );

      setRows((current) =>
        current.filter(
          (item) => item._id !== row._id,
        ),
      );

      if (editingId === row._id) {
        resetForm();
      }

      setMessage(
        "تم حذف قاعدة التسعير بنجاح.",
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "تعذر حذف قاعدة التسعير.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function onTypeChange(type: PricingType) {
    setForm((current) => ({
      ...current,
      type,
      governorateId: "",
      areaId: "",
      fromGovernorateId: "",
      fromAreaId: "",
      toGovernorateId: "",
      toAreaId: "",
      establishmentId: "",
      establishmentType: "",
      fromGeofenceId: "",
      toGeofenceId: "",
    }));
  }

  return (
    <div dir="rtl" className="pricing-page">
      <div className="page-header">
        <div>
          <button
            type="button"
            className="btn"
            onClick={() =>
              window.history.back()
            }
          >
            <ArrowRight size={17} />
            العودة إلى الرئيسية
          </button>

          <h1>
            {editingId
              ? "تعديل قاعدة التسعير"
              : "التسعير المخصص"}
          </h1>

          <p>
            إدارة أسعار التوصيل حسب المحافظة
            والمنطقة والمنشأة والمسار والمنطقة
            الجغرافية، مع التحكم في الأولوية
            والفترة الزمنية.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => void loadAll()}
          disabled={busy || loading}
        >
          <RefreshCw size={17} />
          تحديث البيانات
        </button>
      </div>

      {(message || error) && (
        <section className="panel">
          {message && (
            <div className="status status-active">
              {message}
            </div>
          )}

          {error && (
            <div className="status status-inactive">
              {error}
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <div className="page-section-title">
          <div>
            <h2>
              {editingId
                ? "تعديل قاعدة التسعير"
                : "إضافة قاعدة جديدة"}
            </h2>

            <p>
              يتم إرسال السعر إلى الخادم ويُطبق
              النظام القاعدة المناسبة تلقائيًا.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="btn"
              onClick={resetForm}
              disabled={busy}
            >
              <X size={17} />
              إلغاء التعديل
            </button>
          )}
        </div>

        <div className="form-grid">
          <label>
            اسم القاعدة
            <input
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value,
                )
              }
              placeholder="مثال: سعر مطاعم المنطقة الشمالية"
            />
          </label>

          <label>
            نوع القاعدة
            <select
              value={form.type}
              onChange={(event) =>
                onTypeChange(
                  event.target.value as PricingType,
                )
              }
            >
              <option value="default">
                السعر الأساسي
              </option>

              <option value="governorate">
                حسب المحافظة
              </option>

              <option value="area">
                حسب المنطقة
              </option>

              <option value="area_to_area">
                منطقة إلى منطقة
              </option>

              <option value="establishment">
                منشأة محددة
              </option>

              <option value="establishment_type">
                نوع منشأة
              </option>

              <option value="geofence_to_geofence">
                منطقة جغرافية إلى منطقة جغرافية
              </option>
            </select>
          </label>

          <label>
            رسوم التوصيل
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) =>
                updateField(
                  "amount",
                  event.target.value,
                )
              }
              placeholder="5"
            />
          </label>

          <label>
            الأولوية
            <input
              type="number"
              step="1"
              value={form.priority}
              onChange={(event) =>
                updateField(
                  "priority",
                  event.target.value,
                )
              }
              placeholder="0"
            />
          </label>

          {form.type ===
            "governorate" && (
            <label>
              المحافظة
              <select
                value={form.governorateId}
                onChange={(event) => {
                  updateField(
                    "governorateId",
                    event.target.value,
                  );
                  updateField("areaId", "");
                }}
              >
                <option value="">
                  اختر المحافظة
                </option>

                {governorates.map(
                  (governorate) => (
                    <option
                      key={governorate._id}
                      value={governorate._id}
                    >
                      {governorate.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}

          {form.type === "area" && (
            <>
              <label>
                المحافظة
                <select
                  value={form.governorateId}
                  onChange={(event) => {
                    updateField(
                      "governorateId",
                      event.target.value,
                    );
                    updateField("areaId", "");
                  }}
                >
                  <option value="">
                    اختر المحافظة
                  </option>

                  {governorates.map(
                    (governorate) => (
                      <option
                        key={governorate._id}
                        value={governorate._id}
                      >
                        {governorate.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                المنطقة
                <select
                  value={form.areaId}
                  onChange={(event) =>
                    updateField(
                      "areaId",
                      event.target.value,
                    )
                  }
                  disabled={!selectedGovernorate}
                >
                  <option value="">
                    اختر المنطقة
                  </option>

                  {(
                    selectedGovernorate?.areas ||
                    []
                  )
                    .filter(
                      (area) =>
                        area.isActive !== false,
                    )
                    .map((area) => (
                      <option
                        key={area._id}
                        value={area._id}
                      >
                        {area.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}

          {form.type ===
            "area_to_area" && (
            <>
              <label>
                محافظة البداية
                <select
                  value={
                    form.fromGovernorateId
                  }
                  onChange={(event) => {
                    updateField(
                      "fromGovernorateId",
                      event.target.value,
                    );
                    updateField(
                      "fromAreaId",
                      "",
                    );
                  }}
                >
                  <option value="">
                    اختر محافظة البداية
                  </option>

                  {governorates.map(
                    (governorate) => (
                      <option
                        key={governorate._id}
                        value={governorate._id}
                      >
                        {governorate.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                منطقة البداية
                <select
                  value={form.fromAreaId}
                  onChange={(event) =>
                    updateField(
                      "fromAreaId",
                      event.target.value,
                    )
                  }
                  disabled={
                    !selectedFromGovernorate
                  }
                >
                  <option value="">
                    اختر منطقة البداية
                  </option>

                  {(
                    selectedFromGovernorate?.areas ||
                    []
                  )
                    .filter(
                      (area) =>
                        area.isActive !== false,
                    )
                    .map((area) => (
                      <option
                        key={area._id}
                        value={area._id}
                      >
                        {area.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                محافظة النهاية
                <select
                  value={
                    form.toGovernorateId
                  }
                  onChange={(event) => {
                    updateField(
                      "toGovernorateId",
                      event.target.value,
                    );
                    updateField(
                      "toAreaId",
                      "",
                    );
                  }}
                >
                  <option value="">
                    اختر محافظة النهاية
                  </option>

                  {governorates.map(
                    (governorate) => (
                      <option
                        key={governorate._id}
                        value={governorate._id}
                      >
                        {governorate.name}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                منطقة النهاية
                <select
                  value={form.toAreaId}
                  onChange={(event) =>
                    updateField(
                      "toAreaId",
                      event.target.value,
                    )
                  }
                  disabled={
                    !selectedToGovernorate
                  }
                >
                  <option value="">
                    اختر منطقة النهاية
                  </option>

                  {(
                    selectedToGovernorate?.areas ||
                    []
                  )
                    .filter(
                      (area) =>
                        area.isActive !== false,
                    )
                    .map((area) => (
                      <option
                        key={area._id}
                        value={area._id}
                      >
                        {area.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}

          {form.type ===
            "establishment" && (
            <label>
              المنشأة
              <select
                value={form.establishmentId}
                onChange={(event) =>
                  updateField(
                    "establishmentId",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  اختر المنشأة
                </option>

                {establishments.map(
                  (establishment) => (
                    <option
                      key={establishment._id}
                      value={establishment._id}
                    >
                      {establishment.name} —{" "}
                      {establishment.type ===
                      "restaurant"
                        ? "مطعم"
                        : "محل"}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}

          {form.type ===
            "establishment_type" && (
            <label>
              نوع المنشأة
              <select
                value={form.establishmentType}
                onChange={(event) =>
                  updateField(
                    "establishmentType",
                    event.target.value as
                      | ""
                      | "restaurant"
                      | "shop",
                  )
                }
              >
                <option value="">
                  اختر النوع
                </option>
                <option value="restaurant">
                  مطاعم
                </option>
                <option value="shop">
                  محلات
                </option>
              </select>
            </label>
          )}

          {form.type ===
            "geofence_to_geofence" && (
            <>
              <label>
                المنطقة الجغرافية للبداية
                <select
                  value={form.fromGeofenceId}
                  onChange={(event) =>
                    updateField(
                      "fromGeofenceId",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    اختر المنطقة الجغرافية
                  </option>

                  {geofences
                    .filter(
                      (item) =>
                        item.isActive !== false,
                    )
                    .map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                المنطقة الجغرافية للنهاية
                <select
                  value={form.toGeofenceId}
                  onChange={(event) =>
                    updateField(
                      "toGeofenceId",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    اختر المنطقة الجغرافية
                  </option>

                  {geofences
                    .filter(
                      (item) =>
                        item.isActive !== false,
                    )
                    .map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}

          <label>
            بداية سريان القاعدة
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) =>
                updateField(
                  "startsAt",
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            نهاية سريان القاعدة
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) =>
                updateField(
                  "endsAt",
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void saveRule()}
          >
            {editingId ? (
              <>
                <Edit3 size={17} />
                حفظ التعديل
              </>
            ) : (
              <>
                <Plus size={17} />
                إضافة قاعدة
              </>
            )}
          </button>

          {editingId && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={resetForm}
            >
              إلغاء
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="page-section-title">
          <div>
            <h2>قواعد التسعير الحالية</h2>
            <p>
              يتم عرض حالة كل قاعدة وفترتها
              وأولويتها ونوعها.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            جاري تحميل قواعد التسعير...
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            لا توجد قواعد تسعير حاليًا.
          </div>
        ) : (
          <div className="cards-grid">
            {rows.map((row) => (
              <article
                className="data-card"
                key={row._id}
              >
                <div className="data-card-header">
                  <div>
                    <strong>
                      {row.name}
                    </strong>

                    <p>
                      {getRuleSummary(row)}
                    </p>
                  </div>

                  <span
                    className={
                      row.isActive
                        ? "status status-active"
                        : "status status-inactive"
                    }
                  >
                    {row.isActive
                      ? "مفعلة"
                      : "متوقفة"}
                  </span>
                </div>

                <div className="data-card-body pricing-rule-body">
                  <div className="pricing-main-amount">
                    <span>رسوم التوصيل</span>
                    <strong>
                      {Number(row.amount || 0).toFixed(2)}
                    </strong>
                  </div>

                  <div>
                    <span>نوع القاعدة</span>
                    <strong>
                      {
                        typeLabels[
                          row.type
                        ]
                      }
                    </strong>
                  </div>

                  <div>
                    <span>الأولوية</span>
                    <strong>
                      {row.priority}
                    </strong>
                  </div>

                  <div>
                    <span>بداية السريان</span>
                    <strong>
                      {row.startsAt
                        ? new Date(
                            row.startsAt,
                          ).toLocaleString(
                            "ar-EG",
                          )
                        : "بدون تحديد"}
                    </strong>
                  </div>

                  <div>
                    <span>نهاية السريان</span>
                    <strong>
                      {row.endsAt
                        ? new Date(
                            row.endsAt,
                          ).toLocaleString(
                            "ar-EG",
                          )
                        : "بدون تحديد"}
                    </strong>
                  </div>
                </div>

                <div className="data-card-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      editRule(row)
                    }
                  >
                    <Edit3 size={16} />
                    تعديل
                  </button>

                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() =>
                      void toggleRule(
                        row,
                      )
                    }
                  >
                    {row.isActive
                      ? "تعطيل"
                      : "تفعيل"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() =>
                      void removeRule(
                        row,
                      )
                    }
                  >
                    <Trash2 size={16} />
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
