import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Filter,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";

type AuditRow = {
  _id?: string;
  actorId?: any;
  actorRole?: string | null;
  action?: string;
  entityType?: string;
  entityId?: any;
  description?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  before?: any;
  after?: any;
};

function unwrapRows(value: any): AuditRow[] {
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.logs)) return value.logs;
  if (Array.isArray(value?.audits)) return value.audits;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value)) return value;
  return [];
}

function actorName(row: AuditRow) {
  if (typeof row.actorId === "object" && row.actorId) {
    return (
      row.actorId.fullName ||
      row.actorId.email ||
      String(row.actorId._id || "")
    );
  }

  return "غير معروف";
}

function actorEmail(row: AuditRow) {
  if (typeof row.actorId === "object" && row.actorId) {
    return row.actorId.email || "";
  }

  return "";
}

function entityIdText(row: AuditRow) {
  if (!row.entityId) return "";

  if (typeof row.entityId === "object") {
    return String(
      row.entityId._id ||
        row.entityId.id ||
        row.entityId.toString?.() ||
        "",
    );
  }

  return String(row.entityId);
}

function formatDate(value?: string) {
  if (!value) return "غير مسجل";

  try {
    return new Date(value).toLocaleString("ar-IQ-u-nu-latn", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function prettyValue(value: any) {
  if (value === null || value === undefined) {
    return "لا توجد بيانات";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 8px 30px rgba(15, 23, 42, .05)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

function InfoBox({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        background: "#F8FAFC",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: 13,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#64748B",
          fontSize: 11,
          fontWeight: 800,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#0F172A",
          fontWeight: 800,
          fontSize: 13,
          lineHeight: 1.7,
          wordBreak: "break-word",
          fontFamily: mono ? "monospace" : undefined,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function JsonDetails({
  title,
  value,
  tone,
}: {
  title: string;
  value: any;
  tone: "before" | "after";
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    !(
      typeof value === "object" &&
      Object.keys(value || {}).length === 0
    );

  if (!hasValue) return null;

  const toneStyle =
    tone === "before"
      ? {
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          color: "#9A3412",
        }
      : {
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          color: "#166534",
        };

  return (
    <details
      style={{
        marginTop: 10,
        borderRadius: 14,
        overflow: "hidden",
        ...toneStyle,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          listStyle: "none",
          padding: "12px 14px",
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span>{title}</span>
        <ChevronDown size={17} />
      </summary>

      <pre
        style={{
          margin: 0,
          padding: 14,
          background: "rgba(255,255,255,.65)",
          color: "#0F172A",
          fontSize: 12,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          direction: "ltr",
          textAlign: "left",
          borderTop: "1px solid rgba(148,163,184,.25)",
        }}
      >
        {prettyValue(value)}
      </pre>
    </details>
  );
}

export default function SecurityLog() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/audit-logs", {
        params: {
          limit: 250,
          ...(actionFilter.trim()
            ? { action: actionFilter.trim() }
            : {}),
          ...(entityFilter.trim()
            ? { entityType: entityFilter.trim() }
            : {}),
        },
      });

      setLogs(unwrapRows(response.data));
    } catch (err) {
      setError(getApiErrorMessage(err));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const action = actionFilter.trim().toLowerCase();
    const entity = entityFilter.trim().toLowerCase();

    return logs.filter((row) => {
      const rowAction = String(row.action || "").toLowerCase();
      const rowEntity = String(row.entityType || "").toLowerCase();

      return (
        (!action || rowAction.includes(action)) &&
        (!entity || rowEntity.includes(entity))
      );
    });
  }, [logs, actionFilter, entityFilter]);

  return (
    <div
      dir="rtl"
      style={{
        padding: 28,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              color: "#E87516",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: ".04em",
            }}
          >
            SECURITY & AUDIT
          </div>

          <h1
            style={{
              margin: "7px 0",
              color: "#0F172A",
              fontSize: 30,
            }}
          >
            سجل الأمان والعمليات الإدارية
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748B",
              lineHeight: 1.8,
            }}
          >
            متابعة العمليات الحساسة والتغييرات التي تمت داخل النظام.
          </p>
        </div>

        <button
          onClick={() => void load()}
          type="button"
          style={{
            border: "1px solid #CBD5E1",
            background: "#fff",
            color: "#0F172A",
            borderRadius: 13,
            padding: "11px 16px",
            fontWeight: 900,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <RefreshCw size={17} />
          تحديث
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 14,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* Filters */}
      <div
        style={{
          ...card,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          alignItems: "end",
        }}
      >
        <label>
          <div
            style={{
              marginBottom: 7,
              fontWeight: 900,
              color: "#0F172A",
            }}
          >
            العملية
          </div>

          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="مثال: admin.user"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: "1px solid #CBD5E1",
              borderRadius: 12,
              outline: "none",
            }}
          />
        </label>

        <label>
          <div
            style={{
              marginBottom: 7,
              fontWeight: 900,
              color: "#0F172A",
            }}
          >
            نوع السجل
          </div>

          <input
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="مثال: User / Captain / Order"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: "1px solid #CBD5E1",
              borderRadius: 12,
              outline: "none",
            }}
          />
        </label>

        <button
          onClick={() => void load()}
          type="button"
          style={{
            border: 0,
            borderRadius: 12,
            padding: "12px 16px",
            background: "#0F172A",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 46,
          }}
        >
          <Filter size={16} />
          تطبيق الفلاتر
        </button>
      </div>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            ...card,
            padding: 17,
          }}
        >
          <div style={{ color: "#64748B", fontSize: 12 }}>
            إجمالي السجلات الظاهرة
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#0F172A",
              fontSize: 24,
              fontWeight: 950,
            }}
          >
            {filtered.length}
          </div>
        </div>

        <div
          style={{
            ...card,
            padding: 17,
          }}
        >
          <div style={{ color: "#64748B", fontSize: 12 }}>
            آخر نشاط
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#0F172A",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            {filtered[0]?.createdAt
              ? formatDate(filtered[0].createdAt)
              : "لا يوجد"}
          </div>
        </div>
      </div>

      {/* Logs */}
      <div style={card}>
        {loading ? (
          <div
            style={{
              padding: 45,
              color: "#64748B",
              textAlign: "center",
            }}
          >
            جاري تحميل سجل الأمان...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 55,
              textAlign: "center",
              color: "#64748B",
            }}
          >
            <ShieldCheck
              size={45}
              style={{
                marginBottom: 10,
                color: "#94A3B8",
              }}
            />

            <div
              style={{
                fontWeight: 900,
                color: "#0F172A",
                marginBottom: 6,
              }}
            >
              لا توجد سجلات مطابقة
            </div>

            <div style={{ fontSize: 13 }}>
              عند تنفيذ عملية إدارية مسجلة ستظهر هنا.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filtered.map((row, index) => {
              const entityId = entityIdText(row);
              const name = actorName(row);
              const email = actorEmail(row);

              return (
                <article
                  key={
                    row._id ||
                    `${row.createdAt}-${index}`
                  }
                  style={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 18,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  {/* Main row */}
                  <div
                    style={{
                      padding: 17,
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(260px, 1.4fr) minmax(220px, 1fr) minmax(180px, .8fr)",
                      gap: 16,
                      alignItems: "center",
                    }}
                  >
                    {/* Action */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          flex: "0 0 auto",
                          width: 42,
                          height: 42,
                          borderRadius: 13,
                          display: "grid",
                          placeItems: "center",
                          background: "#FFF7ED",
                          color: "#E87516",
                        }}
                      >
                        <ShieldAlert size={20} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <span
                            style={{
                              color: "#0F172A",
                              fontWeight: 950,
                              fontSize: 15,
                            }}
                          >
                            {row.action || "عملية إدارية"}
                          </span>

                          <span
                            style={{
                              ...badgeStyle,
                              background: "#EFF6FF",
                              color: "#1D4ED8",
                            }}
                          >
                            {row.entityType || "غير محدد"}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            color: "#64748B",
                            fontSize: 12,
                            wordBreak: "break-word",
                          }}
                        >
                          {entityId
                            ? `المعرف: ${entityId}`
                            : "لا يوجد معرف للعنصر"}
                        </div>
                      </div>
                    </div>

                    {/* Actor */}
                    <div>
                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: 11,
                          fontWeight: 800,
                          marginBottom: 5,
                        }}
                      >
                        المنفذ
                      </div>

                      <div
                        style={{
                          color: "#0F172A",
                          fontWeight: 900,
                        }}
                      >
                        {name}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          marginTop: 5,
                        }}
                      >
                        {row.actorRole ? (
                          <span
                            style={{
                              ...badgeStyle,
                              background: "#F1F5F9",
                              color: "#475569",
                            }}
                          >
                            {row.actorRole}
                          </span>
                        ) : null}

                        {email ? (
                          <span
                            style={{
                              color: "#64748B",
                              fontSize: 11,
                              wordBreak: "break-word",
                            }}
                          >
                            {email}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Time */}
                    <div
                      style={{
                        textAlign: "left",
                        direction: "rtl",
                      }}
                    >
                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: 11,
                          fontWeight: 800,
                          marginBottom: 5,
                        }}
                      >
                        وقت العملية
                      </div>

                      <div
                        style={{
                          color: "#0F172A",
                          fontWeight: 900,
                          fontSize: 12,
                        }}
                      >
                        {formatDate(row.createdAt)}
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                          color: "#64748B",
                          fontSize: 11,
                        }}
                      >
                        {row.ip || "IP غير مسجل"}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      padding: "0 17px 16px",
                    }}
                  >
                    <div
                      style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: 14,
                        padding: 13,
                      }}
                    >
                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: 11,
                          fontWeight: 800,
                          marginBottom: 5,
                        }}
                      >
                        وصف العملية
                      </div>

                      <div
                        style={{
                          color: "#334155",
                          fontWeight: 700,
                          lineHeight: 1.8,
                        }}
                      >
                        {row.description ||
                          "لا يوجد وصف إضافي."}
                      </div>
                    </div>

                    <JsonDetails
                      title="البيانات قبل التعديل"
                      value={row.before}
                      tone="before"
                    />

                    <JsonDetails
                      title="البيانات بعد التعديل"
                      value={row.after}
                      tone="after"
                    />

                    <details
                      style={{
                        marginTop: 10,
                        border: "1px solid #E2E8F0",
                        borderRadius: 14,
                        background: "#fff",
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          listStyle: "none",
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontWeight: 900,
                          color: "#475569",
                        }}
                      >
                        <span>معلومات تقنية</span>
                        <ChevronDown size={17} />
                      </summary>

                      <div
                        style={{
                          borderTop: "1px solid #E2E8F0",
                          padding: 14,
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 10,
                        }}
                      >
                        <InfoBox
                          label="عنوان IP"
                          value={
                            row.ip || "غير مسجل"
                          }
                          mono
                        />

                        <InfoBox
                          label="المعرف"
                          value={
                            row._id || "غير مسجل"
                          }
                          mono
                        />

                        <div
                          style={{
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            borderRadius: 14,
                            padding: 13,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              color: "#64748B",
                              fontSize: 11,
                              fontWeight: 800,
                              marginBottom: 6,
                            }}
                          >
                            المتصفح
                          </div>

                          <div
                            style={{
                              color: "#334155",
                              fontSize: 11,
                              lineHeight: 1.7,
                              wordBreak: "break-word",
                            }}
                          >
                            {row.userAgent ||
                              "غير مسجل"}
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
