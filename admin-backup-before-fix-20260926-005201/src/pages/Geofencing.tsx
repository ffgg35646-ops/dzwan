import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Area = {
  _id: string;
  name: string;
  isActive?: boolean;
  captainsEnabled?: boolean;
};

type Governorate = {
  _id: string;
  name: string;
  isActive?: boolean;
  captainsEnabled?: boolean;
  areas?: Area[];
};

type CoverageRow = {
  _id: string;
  sourceGovernorateId: any;
  sourceAreaId: any;
  targetGovernorateId: any;
  targetAreaId: any;
  isActive?: boolean;
};

type WorkArea = {
  _id: string;
  governorateId: any;
  areaId: any;
  isActive?: boolean;
};

type Captain = {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  governorateId: any;
  areaId: any;
  status?: string;
};

function unwrap(value: any) {
  return value?.data ?? value;
}

function toId(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?._id ?? value?.id ?? "");
}

function toName(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?.name ?? "");
}

function getLocations(value: any): Governorate[] {
  const x = unwrap(value);

  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.locations)) return x.locations;
  if (Array.isArray(x?.data)) return x.data;

  return [];
}

export default function Geofencing() {
  const [locations, setLocations] = useState<Governorate[]>([]);
  const [coverageRows, setCoverageRows] = useState<CoverageRow[]>([]);

  const [tab, setTab] = useState<"default" | "captain">("default");

  const [sourceGovernorateId, setSourceGovernorateId] = useState("");
  const [sourceAreaId, setSourceAreaId] = useState("");

  const [targetGovernorateId, setTargetGovernorateId] = useState("");
  const [targetAreaId, setTargetAreaId] = useState("");

  const [pendingTargets, setPendingTargets] = useState<
    { governorateId: string; areaId: string }[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [captainQuery, setCaptainQuery] = useState("");
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);
  const [captainWorkAreas, setCaptainWorkAreas] = useState<WorkArea[]>([]);
  const [captainLoading, setCaptainLoading] = useState(false);

  const sourceGovernorate = useMemo(
    () =>
      locations.find(
        (item) => String(item._id) === String(sourceGovernorateId),
      ) || null,
    [locations, sourceGovernorateId],
  );

  const sourceAreas = sourceGovernorate?.areas || [];

  const targetGovernorate = useMemo(
    () =>
      locations.find(
        (item) => String(item._id) === String(targetGovernorateId),
      ) || null,
    [locations, targetGovernorateId],
  );

  const targetAreas = targetGovernorate?.areas || [];

  function findGovernorateName(id: any) {
    const key = toId(id);
    return toName(locations.find((item) => String(item._id) === key));
  }

  function findAreaName(governorateId: any, areaId: any) {
    const governorate = locations.find(
      (item) => String(item._id) === toId(governorateId),
    );

    const area = governorate?.areas?.find(
      (item) => String(item._id) === toId(areaId),
    );

    return area?.name || toName(areaId) || "منطقة غير محددة";
  }

  function showError(value: any) {
    const url = value?.config?.url || value?.response?.config?.url || "";
    const status = value?.response?.status || "";

    console.error("COVERAGE PAGE API ERROR:", {
      url,
      status,
      response: value?.response?.data,
    });

    setError(
      `${status ? `HTTP ${status} - ` : ""}${url ? `${url} - ` : ""}` +
        (
          value?.response?.data?.message ||
          value?.message ||
          "حدث خطأ غير متوقع."
        ),
    );
  }

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [locationsResponse, coverageResponse] = await Promise.all([
        api.get("/locations"),
        api.get("/captain-work-areas/coverage/default"),
      ]);

      setLocations(getLocations(locationsResponse));

      const coverageData = unwrap(coverageResponse);
      setCoverageRows(
        Array.isArray(coverageData)
          ? coverageData
          : Array.isArray(coverageData?.rows)
            ? coverageData.rows
            : [],
      );
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function saveDefaultCoverage() {
    if (!sourceGovernorateId || !sourceAreaId) {
      setError("اختر المحافظة والمنطقة المصدر أولًا.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.put("/captain-work-areas/coverage/default", {
        sourceGovernorateId,
        sourceAreaId,
        targets: pendingTargets,
      });

      setMessage("تم حفظ النظام الافتراضي بنجاح.");
      await loadAll();

      setPendingTargets([]);
      setTargetGovernorateId("");
      setTargetAreaId("");
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
  }

  function addPendingTarget() {
    if (!targetGovernorateId || !targetAreaId) {
      setError("اختر المحافظة والمنطقة المستهدفة.");
      return;
    }

    const exists = pendingTargets.some(
      (item) =>
        item.governorateId === targetGovernorateId &&
        item.areaId === targetAreaId,
    );

    if (exists) {
      setError("هذه المنطقة مضافة بالفعل.");
      return;
    }

    setPendingTargets((current) => [
      ...current,
      {
        governorateId: targetGovernorateId,
        areaId: targetAreaId,
      },
    ]);

    setError("");
  }

  function removePendingTarget(governorateId: string, areaId: string) {
    setPendingTargets((current) =>
      current.filter(
        (item) =>
          item.governorateId !== governorateId ||
          item.areaId !== areaId,
      ),
    );
  }

  function editCoverage(
    sourceGovId: string,
    sourceAreaIdValue: string,
  ) {
    const rows = coverageRows.filter(
      (row) =>
        toId(row.sourceGovernorateId) === sourceGovId &&
        toId(row.sourceAreaId) === sourceAreaIdValue &&
        row.isActive !== false,
    );

    setSourceGovernorateId(sourceGovId);
    setSourceAreaId(sourceAreaIdValue);

    setPendingTargets(
      rows.map((row) => ({
        governorateId: toId(row.targetGovernorateId),
        areaId: toId(row.targetAreaId),
      })),
    );

    setMessage("تم تحميل التغطية للتعديل.");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const groupedDefaultCoverage = useMemo(() => {
    const map = new Map<
      string,
      {
        sourceGovernorateId: string;
        sourceAreaId: string;
        targets: { governorateId: string; areaId: string }[];
      }
    >();

    for (const row of coverageRows) {
      if (row.isActive === false) continue;

      const sourceGovernorateIdValue = toId(row.sourceGovernorateId);
      const sourceAreaIdValue = toId(row.sourceAreaId);
      const key = `${sourceGovernorateIdValue}:${sourceAreaIdValue}`;

      if (!map.has(key)) {
        map.set(key, {
          sourceGovernorateId: sourceGovernorateIdValue,
          sourceAreaId: sourceAreaIdValue,
          targets: [],
        });
      }

      map.get(key)!.targets.push({
        governorateId: toId(row.targetGovernorateId),
        areaId: toId(row.targetAreaId),
      });
    }

    return Array.from(map.values());
  }, [coverageRows, locations]);

  async function searchCaptains(value: string) {
    const query = value.trim();

    if (!query) {
      setCaptains([]);
      setCaptainLoading(false);
      setSelectedCaptain(null);
      setCaptainWorkAreas([]);
      return;
    }

    setCaptainLoading(true);
    setError("");

    try {
      const response = await api.get(
        "/captain-work-areas/coverage/captains",
        {
          params: { q: query },
        },
      );

      const data = unwrap(response);

      setCaptains(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.captains)
            ? data.captains
            : [],
      );
    } catch (err) {
      showError(err);
      setCaptains([]);
    } finally {
      setCaptainLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchCaptains(captainQuery);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [captainQuery]);

  async function openCaptain(captain: Captain) {
    setSelectedCaptain(captain);
    setCaptainWorkAreas([]);
    setError("");
    setMessage("");

    try {
      const response = await api.get(
        `/captain-work-areas/coverage/captains/${captain._id}`,
      );

      const data = unwrap(response);

      setSelectedCaptain(data?.captain || captain);
      setCaptainWorkAreas(
        Array.isArray(data?.workAreas) ? data.workAreas : [],
      );
    } catch (err) {
      showError(err);
    }
  }

  const selectedCaptainSourceGovId = toId(
    selectedCaptain?.governorateId,
  );

  const selectedCaptainSourceAreaId = toId(
    selectedCaptain?.areaId,
  );

  const allowedCaptainAreas = useMemo(() => {
    const result = [
      {
        governorateId: selectedCaptainSourceGovId,
        areaId: selectedCaptainSourceAreaId,
      },
      ...coverageRows
        .filter(
          (row) =>
            row.isActive !== false &&
            toId(row.sourceGovernorateId) === selectedCaptainSourceGovId &&
            toId(row.sourceAreaId) === selectedCaptainSourceAreaId,
        )
        .map((row) => ({
          governorateId: toId(row.targetGovernorateId),
          areaId: toId(row.targetAreaId),
        })),
    ];

    return result.filter(
      (item, index, array) =>
        item.governorateId &&
        item.areaId &&
        array.findIndex(
          (x) =>
            x.governorateId === item.governorateId &&
            x.areaId === item.areaId,
        ) === index,
    );
  }, [
    coverageRows,
    selectedCaptainSourceGovId,
    selectedCaptainSourceAreaId,
  ]);

  const captainAreaKey = (governorateId: any, areaId: any) =>
    `${toId(governorateId)}:${toId(areaId)}`;

  async function addCaptainArea(
    governorateId: string,
    areaId: string,
  ) {
    if (!selectedCaptain) return;

    setError("");
    setMessage("");

    try {
      await api.post(
        `/captain-work-areas/coverage/captains/${selectedCaptain._id}/areas`,
        { governorateId, areaId },
      );

      const response = await api.get(
        `/captain-work-areas/coverage/captains/${selectedCaptain._id}`,
      );

      const data = unwrap(response);
      setCaptainWorkAreas(
        Array.isArray(data?.workAreas) ? data.workAreas : [],
      );

      setMessage("تمت إضافة منطقة العمل للكابتن.");
    } catch (err) {
      showError(err);
    }
  }

  async function removeCaptainArea(workAreaId: string) {
    if (!selectedCaptain) return;

    setError("");
    setMessage("");

    try {
      await api.delete(
        `/captain-work-areas/coverage/captains/${selectedCaptain._id}/areas/${workAreaId}`,
      );

      setCaptainWorkAreas((current) =>
        current.filter((item) => item._id !== workAreaId),
      );

      setMessage("تم حذف منطقة العمل للكابتن.");
    } catch (err) {
      showError(err);
    }
  }

  async function applyCaptainDefault() {
    if (!selectedCaptain) return;

    setError("");
    setMessage("");

    try {
      await api.post(
        `/captain-work-areas/coverage/captains/${selectedCaptain._id}/apply-default`,
      );

      const response = await api.get(
        `/captain-work-areas/coverage/captains/${selectedCaptain._id}`,
      );

      const data = unwrap(response);

      setCaptainWorkAreas(
        Array.isArray(data?.workAreas) ? data.workAreas : [],
      );

      setMessage("تم تطبيق النظام الافتراضي على الكابتن.");
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div dir="rtl" style={{ padding: 24 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0 }}>المناطق الجغرافية للكباتن</h1>
        <p style={{ marginTop: 8, color: "#64748b" }}>
          تحديد مناطق العمل الافتراضية والمخصصة للكابتن.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("default")}
          style={{
            padding: "11px 18px",
            borderRadius: 10,
            border: "1px solid #dbe2ea",
            background: tab === "default" ? "#0f172a" : "#fff",
            color: tab === "default" ? "#fff" : "#0f172a",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          النظام الافتراضي
        </button>

        <button
          type="button"
          onClick={() => setTab("captain")}
          style={{
            padding: "11px 18px",
            borderRadius: 10,
            border: "1px solid #dbe2ea",
            background: tab === "captain" ? "#0f172a" : "#fff",
            color: tab === "captain" ? "#fff" : "#0f172a",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          نظام الكابتن المخصص
        </button>
      </div>

      {message ? (
        <div
          style={{
            background: "#ecfdf5",
            color: "#047857",
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            background: "#fef2f2",
            color: "#b91c1c",
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div>جاري تحميل البيانات...</div>
      ) : tab === "default" ? (
        <>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 22,
            }}
          >
            <h2 style={{ marginTop: 0 }}>النظام الافتراضي</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: 12,
              }}
            >
              <select
                value={sourceGovernorateId}
                onChange={(event) => {
                  setSourceGovernorateId(event.target.value);
                  setSourceAreaId("");
                }}
                style={selectStyle}
              >
                <option value="">اختر المحافظة المصدر</option>
                {locations.map((location) => (
                  <option key={location._id} value={location._id}>
                    {location.name}
                  </option>
                ))}
              </select>

              <select
                value={sourceAreaId}
                onChange={(event) =>
                  setSourceAreaId(event.target.value)
                }
                disabled={!sourceGovernorateId}
                style={selectStyle}
              >
                <option value="">اختر المنطقة المصدر</option>
                {sourceAreas.map((area) => (
                  <option key={area._id} value={area._id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                marginTop: 18,
                borderTop: "1px solid #eef2f7",
                paddingTop: 18,
              }}
            >
              <h3>المناطق المسموح بها افتراضيًا</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(220px,1fr))",
                  gap: 12,
                }}
              >
                <select
                  value={targetGovernorateId}
                  onChange={(event) => {
                    setTargetGovernorateId(event.target.value);
                    setTargetAreaId("");
                  }}
                  style={selectStyle}
                >
                  <option value="">اختر المحافظة المستهدفة</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
                </select>

                <select
                  value={targetAreaId}
                  onChange={(event) =>
                    setTargetAreaId(event.target.value)
                  }
                  disabled={!targetGovernorateId}
                  style={selectStyle}
                >
                  <option value="">اختر المنطقة المستهدفة</option>
                  {targetAreas.map((area) => (
                    <option key={area._id} value={area._id}>
                      {area.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={addPendingTarget}
                  style={primaryButton}
                >
                  + إضافة منطقة أخرى
                </button>
              </div>

              <div style={{ marginTop: 14 }}>
                {pendingTargets.length === 0 ? (
                  <div style={emptyStyle}>
                    لم تتم إضافة مناطق مستهدفة بعد.
                  </div>
                ) : (
                  pendingTargets.map((item) => (
                    <div
                      key={`${item.governorateId}:${item.areaId}`}
                      style={rowStyle}
                    >
                      <span>
                        {findGovernorateName(item.governorateId)} -{" "}
                        {findAreaName(
                          item.governorateId,
                          item.areaId,
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removePendingTarget(
                            item.governorateId,
                            item.areaId,
                          )
                        }
                        style={dangerButton}
                      >
                        حذف
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                type="button"
                onClick={() => void saveDefaultCoverage()}
                disabled={saving}
                style={{
                  ...primaryButton,
                  marginTop: 16,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "جاري الحفظ..." : "حفظ النظام الافتراضي"}
              </button>

              <div
                style={{
                  marginTop: 10,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                منطقة المصدر نفسها تظل منطقة أساسية للكابتن تلقائيًا.
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
            }}
          >
            <h2 style={{ marginTop: 0 }}>التغطيات المحفوظة</h2>

            {groupedDefaultCoverage.length === 0 ? (
              <div style={emptyStyle}>
                لا توجد تغطيات افتراضية محفوظة.
              </div>
            ) : (
              groupedDefaultCoverage.map((group) => (
                <div key={`${group.sourceGovernorateId}:${group.sourceAreaId}`} style={cardStyle}>
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>
                    المصدر:{" "}
                    {findGovernorateName(group.sourceGovernorateId)} -{" "}
                    {findAreaName(
                      group.sourceGovernorateId,
                      group.sourceAreaId,
                    )}
                  </div>

                  {group.targets.map((target) => (
                    <div
                      key={`${target.governorateId}:${target.areaId}`}
                      style={{
                        padding: "8px 0",
                        borderTop: "1px solid #eef2f7",
                      }}
                    >
                      📍 {findGovernorateName(target.governorateId)} -{" "}
                      {findAreaName(
                        target.governorateId,
                        target.areaId,
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      editCoverage(
                        group.sourceGovernorateId,
                        group.sourceAreaId,
                      )
                    }
                    style={{
                      ...secondaryButton,
                      marginTop: 12,
                    }}
                  >
                    تعديل هذه التغطية
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              marginBottom: 22,
            }}
          >
            <h2 style={{ marginTop: 0 }}>نظام الكابتن المخصص</h2>

            <div>
              <input
                value={captainQuery}
                onChange={(event) =>
                  setCaptainQuery(event.target.value)
                }
                placeholder="ابحث بالاسم أو البريد أو ID..."
                style={{
                  ...inputStyle,
                  width: "100%",
                  boxSizing: "border-box",
                }}
                autoComplete="off"
              />

              {captainLoading ? (
                <div
                  style={{
                    marginTop: 8,
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  جاري البحث...
                </div>
              ) : null}
            </div>

            {captains.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                {captains.map((captain) => (
                  <button
                    key={captain._id}
                    type="button"
                    onClick={() => void openCaptain(captain)}
                    style={{
                      width: "100%",
                      textAlign: "right",
                      background:
                        selectedCaptain?._id === captain._id
                          ? "#eff6ff"
                          : "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 8,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {captain.fullName}
                    </div>

                    <div
                      style={{
                        color: "#64748b",
                        marginTop: 4,
                        fontSize: 13,
                      }}
                    >
                      {captain.email || "بدون بريد"} •{" "}
                      {captain._id}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {selectedCaptain ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {selectedCaptain.fullName}
              </h2>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 18,
                }}
              >
                <div>
                  <strong>المحافظة المصدر:</strong>{" "}
                  {findGovernorateName(selectedCaptain.governorateId)}
                </div>

                <div style={{ marginTop: 6 }}>
                  <strong>المنطقة المصدر:</strong>{" "}
                  {findAreaName(
                    selectedCaptain.governorateId,
                    selectedCaptain.areaId,
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => void applyCaptainDefault()}
                  style={secondaryButton}
                >
                  تطبيق النظام الافتراضي
                </button>
              </div>

              <h3>مناطق العمل الحالية</h3>

              {captainWorkAreas.length === 0 ? (
                <div style={emptyStyle}>
                  لا توجد مناطق عمل مفعّلة لهذا الكابتن.
                </div>
              ) : (
                captainWorkAreas.map((workArea) => (
                  <div key={workArea._id} style={rowStyle}>
                    <span>
                      📍{" "}
                      {findGovernorateName(workArea.governorateId)} -{" "}
                      {findAreaName(
                        workArea.governorateId,
                        workArea.areaId,
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        void removeCaptainArea(workArea._id)
                      }
                      style={dangerButton}
                    >
                      حذف
                    </button>
                  </div>
                ))
              )}

              <div
                style={{
                  marginTop: 22,
                  borderTop: "1px solid #eef2f7",
                  paddingTop: 18,
                }}
              >
                <h3>إضافة منطقة للكابتن</h3>

                {allowedCaptainAreas.length === 0 ? (
                  <div style={emptyStyle}>
                    لا توجد مناطق مسموحة لهذا الكابتن في النظام الافتراضي.
                  </div>
                ) : (
                  allowedCaptainAreas.map((item) => {
                    const key = captainAreaKey(
                      item.governorateId,
                      item.areaId,
                    );

                    const alreadyAdded = captainWorkAreas.some(
                      (workArea) =>
                        captainAreaKey(
                          workArea.governorateId,
                          workArea.areaId,
                        ) === key &&
                        workArea.isActive !== false,
                    );

                    return (
                      <div key={key} style={rowStyle}>
                        <span>
                          {findGovernorateName(item.governorateId)} -{" "}
                          {findAreaName(
                            item.governorateId,
                            item.areaId,
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() =>
                            void addCaptainArea(
                              item.governorateId,
                              item.areaId,
                            )
                          }
                          style={{
                            ...primaryButton,
                            opacity: alreadyAdded ? 0.45 : 1,
                          }}
                        >
                          {alreadyAdded ? "مفعّلة" : "إضافة"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  marginTop: 16,
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                الكابتن لا يستطيع إضافة منطقة خارج التغطية الافتراضية الخاصة
                بمنطقته الأصلية.
              </div>
            </div>
          ) : (
            <div style={emptyStyle}>
              ابحث عن كابتن واختره لعرض مناطقه وتعديلها.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: "100%",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  border: "0",
  borderRadius: 10,
  padding: "11px 16px",
  background: "#0f172a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 16px",
  background: "#fff",
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerButton: React.CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 9,
  padding: "8px 12px",
  background: "#fff",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 700,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: 11,
  marginBottom: 8,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  marginBottom: 12,
};

const emptyStyle: React.CSSProperties = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 10,
  padding: 16,
  color: "#64748b",
};
