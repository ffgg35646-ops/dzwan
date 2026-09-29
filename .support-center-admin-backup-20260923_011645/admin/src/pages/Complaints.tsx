import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Complaint = {
  _id?: string;
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  status?: string;
  amount?: number | null;
  resolution?: string | null;
  createdAt?: string;
  orderId?: any;
  captainId?: any;
  establishmentId?: any;
  order?: any;
  captain?: any;
  establishment?: any;
};

const categoryLabels: Record<string, string> = {
  captain_establishment: "مشكلة بين الكابتن والمنشأة",
  order: "مشكلة في الطلب",
  delivery: "مشكلة أثناء التوصيل",
  amount: "مشكلة في المبلغ",
  delivery_proof: "مشكلة في إثبات التوصيل",
};

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_review: "قيد المراجعة",
  resolved: "تم الحل",
  rejected: "مرفوضة",
  closed: "مغلقة",
};

function complaintId(item: Complaint) {
  return String(item._id || item.id || "");
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ar-IQ");
}

function valueName(value: any) {
  if (!value) return "—";

  return (
    value.fullName ||
    value.name ||
    value.displayName ||
    value.email ||
    value.phone ||
    "—"
  );
}

function money(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number.toLocaleString("ar-IQ");
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 12,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Complaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selected, setSelected] =
    useState<Complaint | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [status, setStatus] = useState("open");
  const [resolution, setResolution] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadComplaints() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/ops/complaints");

      setComplaints(
        Array.isArray(response.data?.complaints)
          ? response.data.complaints
          : [],
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "تعذر تحميل الشكاوى.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function openComplaint(item: Complaint) {
    const id = complaintId(item);

    if (!id) return;

    try {
      setDetailsLoading(true);
      setError("");

      const response = await api.get(
        `/requirements/complaints/${id}`,
      );

      const complaint =
        response.data?.complaint || item;

      setSelected(complaint);
      setStatus(complaint.status || "open");
      setResolution(
        complaint.resolution || "",
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "تعذر تحميل تفاصيل الشكوى.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function saveComplaint() {
    if (!selected) return;

    const id = complaintId(selected);

    if (!id) return;

    try {
      setSaving(true);
      setError("");

      const response = await api.patch(
        `/ops/complaints/${id}`,
        {
          status,
          resolution,
        },
      );

      const updated =
        response.data?.complaint || {
          ...selected,
          status,
          resolution,
        };

      setSelected(updated);

      setComplaints((current) =>
        current.map((item) =>
          complaintId(item) === id
            ? {
                ...item,
                ...updated,
              }
            : item,
        ),
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "تعذر حفظ التحديث.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <div>
        <h1 style={{ margin: 0 }}>
          الشكاوى والمشاكل
        </h1>

        <p
          style={{
            marginTop: 8,
            color: "#64748b",
          }}
        >
          مراجعة الشكاوى المرتبطة بالكباتن والمنشآت والطلبات.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: selected
            ? "minmax(320px, 0.85fr) minmax(0, 1.5fr)"
            : "1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom:
                "1px solid #e2e8f0",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <strong>
              الشكاوى ({complaints.length})
            </strong>

            <button
              type="button"
              onClick={loadComplaints}
              disabled={loading}
              style={{
                border:
                  "1px solid #cbd5e1",
                background: "#fff",
                borderRadius: 8,
                padding: "7px 12px",
                cursor: "pointer",
              }}
            >
              تحديث
            </button>
          </div>

          {loading ? (
            <div style={{ padding: 24 }}>
              جاري تحميل الشكاوى...
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ padding: 24 }}>
              لا توجد شكاوى مسجلة.
            </div>
          ) : (
            complaints.map((item) => {
              const id = complaintId(item);

              const active =
                !!selected &&
                complaintId(selected) === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    openComplaint(item)
                  }
                  style={{
                    width: "100%",
                    textAlign: "right",
                    border: 0,
                    borderBottom:
                      "1px solid #f1f5f9",
                    background: active
                      ? "#eff6ff"
                      : "#fff",
                    padding: 16,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: 12,
                    }}
                  >
                    <strong>
                      {item.title ||
                        "بدون عنوان"}
                    </strong>

                    <span>
                      {statusLabels[
                        item.status || ""
                      ] ||
                        item.status ||
                        "—"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    {categoryLabels[
                      item.category || ""
                    ] ||
                      item.category ||
                      "—"}
                  </div>

                  <div
                    style={{
                      marginTop: 7,
                      color: "#94a3b8",
                      fontSize: 12,
                    }}
                  >
                    {formatDate(
                      item.createdAt,
                    )}
                  </div>
                </button>
              );
            })
          )}
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 20,
          }}
        >
          {!selected ? (
            <div
              style={{
                color: "#64748b",
              }}
            >
              اختر شكوى لعرض تفاصيلها.
            </div>
          ) : detailsLoading ? (
            <div>
              جاري تحميل التفاصيل...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 18,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {selected.title ||
                    "شكوى"}
                </h2>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748b",
                  }}
                >
                  {categoryLabels[
                    selected.category ||
                      ""
                  ] ||
                    selected.category ||
                    "—"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <Info
                  label="الحالة"
                  value={
                    statusLabels[
                      selected.status ||
                        ""
                    ] ||
                      selected.status ||
                      "—"
                  }
                />

                <Info
                  label="تاريخ الشكوى"
                  value={formatDate(
                    selected.createdAt,
                  )}
                />

                <Info
                  label="رقم الطلب"
                  value={
                    selected.order
                      ?.orderNumber ||
                    String(
                      selected.orderId ||
                        "—",
                    )
                  }
                />

                <Info
                  label="المبلغ"
                  value={money(
                    selected.amount,
                  )}
                />

                <Info
                  label="مقدم الشكوى"
                  value={valueName(
                    selected.openedBy,
                  )}
                />

                <Info
                  label="هاتف مقدم الشكوى"
                  value={
                    selected.openedBy?.phone ||
                    "—"
                  }
                />

                <Info
                  label="الطرف الآخر"
                  value={valueName(
                    selected.againstUser,
                  )}
                />

                <Info
                  label="الكابتن"
                  value={valueName(
                    selected.captain,
                  )}
                />

                <Info
                  label="المنشأة"
                  value={valueName(
                    selected.establishment,
                  )}
                />
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 7,
                  }}
                >
                  وصف المشكلة
                </div>

                <div
                  style={{
                    whiteSpace:
                      "pre-wrap",
                    background:
                      "#f8fafc",
                    borderRadius: 10,
                    padding: 14,
                    lineHeight: 1.8,
                  }}
                >
                  {selected.description ||
                    "—"}
                </div>
              </div>

              <div
                style={{
                  borderTop:
                    "1px solid #e2e8f0",
                  paddingTop: 18,
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                  }}
                >
                  بيانات الطلب المرتبط
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <Info
                    label="حالة الطلب"
                    value={
                      selected.order
                        ?.status || "—"
                    }
                  />

                  <Info
                    label="قيمة الطلب"
                    value={money(
                      selected.order
                        ?.subtotal,
                    )}
                  />

                  <Info
                    label="أجرة التوصيل"
                    value={money(
                      selected.order
                        ?.deliveryFee,
                    )}
                  />

                  <Info
                    label="الإجمالي"
                    value={money(
                      selected.order
                        ?.total,
                    )}
                  />

                  <Info
                    label="اسم العميل"
                    value={
                      selected.order
                        ?.customerName ||
                      selected.order
                        ?.customer?.fullName ||
                      selected.order
                        ?.customer?.name ||
                      "—"
                    }
                  />

                  <Info
                    label="هاتف العميل"
                    value={
                      selected.order
                        ?.customerPhone ||
                      selected.order
                        ?.customer?.phone ||
                      "—"
                    }
                  />

                  <Info
                    label="العنوان"
                    value={
                      selected.order
                        ?.deliveryAddress ||
                      selected.order
                        ?.customerAddress ||
                      selected.order
                        ?.address ||
                      "—"
                    }
                  />

                  <Info
                    label="وقت إنشاء الطلب"
                    value={formatDate(
                      selected.order
                        ?.createdAt,
                    )}
                  />
                </div>

                <details
                  style={{
                    marginTop: 14,
                  }}
                >
                  <summary
                    style={{
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    عرض بيانات الطلب كاملة
                  </summary>

                  <pre
                    style={{
                      marginTop: 10,
                      overflow: "auto",
                      background:
                        "#0f172a",
                      color: "#e2e8f0",
                      padding: 14,
                      borderRadius: 10,
                      direction: "ltr",
                      textAlign: "left",
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(
                      selected.order ||
                        {},
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>

              <div
                style={{
                  borderTop:
                    "1px solid #e2e8f0",
                  paddingTop: 18,
                  display: "grid",
                  gap: 10,
                }}
              >
                <label>
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    حالة الشكوى
                  </div>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value,
                      )
                    }
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid #cbd5e1",
                    }}
                  >
                    <option value="open">
                      مفتوحة
                    </option>
                    <option value="in_review">
                      قيد المراجعة
                    </option>
                    <option value="resolved">
                      تم الحل
                    </option>
                    <option value="rejected">
                      مرفوضة
                    </option>
                    <option value="closed">
                      مغلقة
                    </option>
                  </select>
                </label>

                <label>
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    قرار / حل الشكوى
                  </div>

                  <textarea
                    value={resolution}
                    onChange={(e) =>
                      setResolution(
                        e.target.value,
                      )
                    }
                    rows={5}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid #cbd5e1",
                      resize: "vertical",
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={saveComplaint}
                  disabled={saving}
                  style={{
                    padding:
                      "11px 18px",
                    border: 0,
                    borderRadius: 9,
                    background:
                      "#0f172a",
                    color: "#fff",
                    cursor:
                      "pointer",
                  }}
                >
                  {saving
                    ? "جاري الحفظ..."
                    : "حفظ التحديث"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
