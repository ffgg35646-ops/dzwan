import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  async function load() {
    const response = await api.get(
      "/completion/audit",
    );
    setLogs(response.data.logs || []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="admin-page">
      <h1>سجل العمليات الإدارية</h1>

      <button onClick={load}>
        🔄 تحديث السجل
      </button>

      {logs.map((log) => (
        <div
          className="admin-card"
          key={log._id}
        >
          <strong>{log.action}</strong>
          <div>
            الكيان: {log.entityType}
          </div>
          <div>
            الوصف: {log.description || "-"}
          </div>
          <div>
            الوقت:{" "}
            {new Date(
              log.createdAt,
            ).toLocaleString("ar-IQ-u-nu-latn")}
          </div>
        </div>
      ))}
    </div>
  );
}
