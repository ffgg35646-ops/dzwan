import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { dzwanConfirm, dzwanPrompt } from "../lib/message";

type Captain = {
  _id: string;
  fullName?: string;
  name?: string;
  phone?: string;
};

type CaptainDocument = {
  _id: string;
  captainId?: Captain | string;
  documentType?: string;
  documentNumber?: string;
  fileUrl?: string;
  expiresAt?: string | null;
  status?: "pending" | "approved" | "rejected" | string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
};

const REQUIRED_TYPES: Record<string, string> = {
  id_front: "الهوية الأمامية",
  id_back: "الهوية الخلفية",
  residence_front: "السكن الأمامي",
  residence_back: "السكن الخلفي",
};

function unwrapList<T>(value: any, keys: string[]): T[] {
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }

  if (Array.isArray(value)) return value;

  return [];
}

function captainName(value: Captain | string | undefined) {
  if (!value) return "—";

  if (typeof value === "string") return value;

  return value.fullName || value.name || value._id;
}

function documentLabel(type?: string) {
  return REQUIRED_TYPES[type || ""] || type || "وثيقة";
}

function statusLabel(status?: string) {
  if (status === "approved") return "معتمدة";
  if (status === "rejected") return "مرفوضة";
  if (status === "pending") return "قيد المراجعة";
  return status || "غير معروف";
}

function statusStyle(status?: string): React.CSSProperties {
  if (status === "approved") {
    return {
      background: "#ECFDF5",
      color: "#047857",
      borderColor: "#A7F3D0",
    };
  }

  if (status === "rejected") {
    return {
      background: "#FEF2F2",
      color: "#B91C1C",
      borderColor: "#FECACA",
    };
  }

  return {
    background: "#FFF7ED",
    color: "#C2410C",
    borderColor: "#FED7AA",
  };
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E2E8F0",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 8px 30px rgba(15, 23, 42, .05)",
};

export default function CaptainDocuments() {
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [selectedCaptain, setSelectedCaptain] = useState("");
  const [documents, setDocuments] = useState<CaptainDocument[]>([]);
  const [search, setSearch] = useState("");

  const [loadingCaptains, setLoadingCaptains] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function loadCaptains() {
    try {
      setLoadingCaptains(true);
      setError("");

      const response = await api.get("/captains");

      const rows = unwrapList<Captain>(
        response.data,
        ["captains", "data", "items"],
      );

      setCaptains(rows);

      if (!selectedCaptain && rows.length > 0) {
        setSelectedCaptain(String(rows[0]._id));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingCaptains(false);
    }
  }

  async function loadDocuments(captainId = selectedCaptain) {
    if (!captainId) {
      setDocuments([]);
      return;
    }

    try {
      setLoadingDocuments(true);
      setError("");

      const response = await api.get(
        `/captain-documents/captain/${captainId}`,
      );

      setDocuments(
        unwrapList<CaptainDocument>(
          response.data,
          ["documents", "data", "items"],
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function review(
    id: string,
    status: "approved" | "rejected",
  ) {
    let reason = "";

    if (status === "rejected") {
      reason =
        (await dzwanPrompt("اكتب سبب رفض الوثيقة:"))?.trim() || "";

      if (!reason) {
        window.alert("يجب كتابة سبب الرفض.");
        return;
      }
    }

    try {
      setBusyId(id);
      setError("");

      await api.patch(`/captain-documents/${id}/review`, {
        status,
        reason,
      });

      await loadDocuments();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId("");
    }
  }

  useEffect(() => {
    void loadCaptains();
  }, []);

  useEffect(() => {
    if (selectedCaptain) {
      void loadDocuments(selectedCaptain);
    }
  }, [selectedCaptain]);

  const selectedCaptainData = useMemo(
    () =>
      captains.find(
        (captain) => String(captain._id) === String(selectedCaptain),
      ),
    [captains, selectedCaptain],
  );

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return documents;

    return documents.filter((doc) =>
      [
        documentLabel(doc.documentType),
        doc.documentNumber || "",
        statusLabel(doc.status),
        doc.rejectionReason || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [documents, search]);

  return (
    <div dir="rtl" style={{ padding: 28, maxWidth: 1250, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ color: "#E87516", fontSize: 12, fontWeight: 800 }}>
            CAPTAIN DOCUMENT CONTROL
          </div>

          <h1
            style={{
              margin: "6px 0",
              color: "#0F172A",
              fontSize: 28,
            }}
          >
            مستندات الكباتن
          </h1>

          <p style={{ margin: 0, color: "#64748B" }}>
            مراجعة واعتماد وثائق الهوية والسكن قبل السماح للكابتن بالعمل.
          </p>
        </div>

        <button
          onClick={() => {
            void loadCaptains();
            void loadDocuments();
          }}
          style={{
            border: "1px solid #CBD5E1",
            background: "#fff",
            color: "#0F172A",
            borderRadius: 12,
            padding: "11px 16px",
            fontWeight: 800,
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

      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 13,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          ...card,
          display: "grid",
          gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 7,
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            اختر الكابتن
          </label>

          <select
            value={selectedCaptain}
            onChange={(e) => setSelectedCaptain(e.target.value)}
            disabled={loadingCaptains}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              border: "1px solid #CBD5E1",
              borderRadius: 12,
              background: "#fff",
              color: "#0F172A",
            }}
          >
            <option value="">
              {loadingCaptains ? "جاري التحميل..." : "اختر كابتن"}
            </option>

            {captains.map((captain) => (
              <option key={captain._id} value={captain._id}>
                {captainName(captain)} — {captain.phone || "بدون هاتف"}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 15,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              color: "#64748B",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            الكابتن المحدد
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 18,
              color: "#0F172A",
              fontWeight: 900,
            }}
          >
            {captainName(selectedCaptainData)}
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#64748B",
              fontSize: 13,
            }}
          >
            عدد الوثائق: {documents.length}
          </div>
        </div>
      </div>

      <div style={card}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
            }}
          >
            <Search
              size={17}
              style={{
                position: "absolute",
                right: 13,
                top: 12,
                color: "#94A3B8",
              }}
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الوثائق..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 40px 12px 14px",
                border: "1px solid #CBD5E1",
                borderRadius: 12,
                background: "#fff",
              }}
            />
          </div>

          <div
            style={{
              minWidth: 95,
              textAlign: "center",
              padding: "10px 14px",
              borderRadius: 12,
              background: "#FFF7ED",
              color: "#C2410C",
              fontWeight: 900,
            }}
          >
            {filteredDocuments.length}
          </div>
        </div>

        {loadingDocuments ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#64748B",
            }}
          >
            جاري تحميل الوثائق...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div
            style={{
              padding: 42,
              textAlign: "center",
              color: "#64748B",
            }}
          >
            <FileCheck2 size={42} style={{ marginBottom: 10 }} />
            <div style={{ fontWeight: 800 }}>
              لا توجد وثائق لهذا الكابتن.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            {filteredDocuments.map((doc) => (
              <div
                key={doc._id}
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  padding: 16,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 15,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#0F172A",
                        fontSize: 16,
                      }}
                    >
                      {documentLabel(doc.documentType)}
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        color: "#64748B",
                        fontSize: 13,
                      }}
                    >
                      رقم الوثيقة: {doc.documentNumber || "—"}
                    </div>

                    {doc.expiresAt && (
                      <div
                        style={{
                          marginTop: 4,
                          color: "#64748B",
                          fontSize: 13,
                        }}
                      >
                        الانتهاء:{" "}
                        {new Date(doc.expiresAt).toLocaleDateString("ar-IQ-u-nu-latn")}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      border: "1px solid",
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontWeight: 800,
                      ...statusStyle(doc.status),
                    }}
                  >
                    {doc.status === "approved" ? (
                      <CheckCircle2 size={15} />
                    ) : doc.status === "rejected" ? (
                      <XCircle size={15} />
                    ) : (
                      <ShieldCheck size={15} />
                    )}

                    {statusLabel(doc.status)}
                  </div>
                </div>

                {doc.rejectionReason && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 11,
                      borderRadius: 11,
                      background: "#FEF2F2",
                      color: "#991B1B",
                      fontSize: 13,
                    }}
                  >
                    سبب الرفض: {doc.rejectionReason}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 9,
                    flexWrap: "wrap",
                    marginTop: 14,
                  }}
                >
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        textDecoration: "none",
                        border: "1px solid #CBD5E1",
                        borderRadius: 11,
                        padding: "9px 13px",
                        color: "#0F172A",
                        fontWeight: 800,
                      }}
                    >
                      فتح الوثيقة
                    </a>
                  )}

                  <button
                    disabled={busyId === doc._id}
                    onClick={() => void review(doc._id, "approved")}
                    style={{
                      border: 0,
                      borderRadius: 11,
                      padding: "9px 13px",
                      background: "#047857",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: busyId === doc._id ? "not-allowed" : "pointer",
                    }}
                  >
                    اعتماد
                  </button>

                  <button
                    disabled={busyId === doc._id}
                    onClick={() => void review(doc._id, "rejected")}
                    style={{
                      border: 0,
                      borderRadius: 11,
                      padding: "9px 13px",
                      background: "#B91C1C",
                      color: "#fff",
                      fontWeight: 800,
                      cursor: busyId === doc._id ? "not-allowed" : "pointer",
                    }}
                  >
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
