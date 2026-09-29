import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Captain = {
  _id: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  gmail?: string;
  status?: string;
  createdAt?: string;
  approvedAt?: string | null;
  governorateId?: any;
  areaId?: any;
  governorate?: any;
  area?: any;
  shift?: any;
  currentShift?: any;
  rating?: number;
  averageRating?: number;
  ordersCount?: number;
  completedOrders?: number;
  online?: boolean;
  isOnline?: boolean;
  operationalEnabled?: boolean;
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
  rejected: "مرفوض",
  pending: "قيد المراجعة",
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("ar-IQ-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function getStatusClass(status?: string) {
  if (status === "active") return "captain-profile-status active";
  if (status === "suspended") return "captain-profile-status suspended";
  return "captain-profile-status";
}

export default function CaptainProfiles() {
  const navigate = useNavigate();

  const [captains, setCaptains] = useState<Captain[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "suspended">(
    "all",
  );

  async function loadCaptains() {
    try {
      setLoading(true);

      const response = await api.get("/captains");

      const rows = Array.isArray(response.data?.captains)
        ? response.data.captains
        : [];

      // هذه الصفحة منفصلة عن طلبات التسجيل.
      // نعرض الكباتن الذين أصبح لهم حساب فعليًا فقط.
      setCaptains(
        rows.filter(
          (captain: Captain) =>
            captain.status === "active" ||
            captain.status === "suspended",
        ),
      );
    } catch (error) {
      console.error("Failed to load captain profiles:", error);
      setCaptains([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCaptains();
  }, []);

  async function changeStatus(captain: Captain, status: "active" | "suspended") {
    const captainId = String(captain._id);

    setBusyId(captainId);

    try {
      await api.patch(`/captains/${captainId}`, {
        status,
      });

      await loadCaptains();
    } catch (error: any) {
      console.error("Captain status update failed:", error);

      window.alert(
        error?.response?.data?.message ||
          "تعذر تغيير حالة الكابتن.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const filteredCaptains = useMemo(() => {
    const query = search.trim().toLowerCase();

    return captains.filter((captain) => {
      const matchesFilter =
        filter === "all" || captain.status === filter;

      if (!matchesFilter) return false;

      if (!query) return true;

      const text = [
        captain.fullName,
        captain.name,
        captain.phone,
        captain.email,
        captain.gmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [captains, filter, search]);

  const activeCount = captains.filter(
    (captain) => captain.status === "active",
  ).length;

  const suspendedCount = captains.filter(
    (captain) => captain.status === "suspended",
  ).length;

  return (
    <div className="captain-profiles-page" dir="rtl">
      <div className="captain-profiles-header">
        <div>
          <div className="captain-profiles-kicker">
            إدارة الكباتن
          </div>

          <h1>ملفات الكباتن</h1>

          <p>
            ملف مستقل لكل كابتن تمت الموافقة على حسابه.
          </p>
        </div>

        <div className="captain-profiles-summary">
          <div className="captain-profile-stat">
            <span>الإجمالي</span>
            <strong>{captains.length}</strong>
          </div>

          <div className="captain-profile-stat">
            <span>نشط</span>
            <strong>{activeCount}</strong>
          </div>

          <div className="captain-profile-stat">
            <span>موقوف</span>
            <strong>{suspendedCount}</strong>
          </div>
        </div>
      </div>

      <div className="captain-profiles-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو Gmail..."
        />

        <div className="captain-profile-filters">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            الكل
          </button>

          <button
            type="button"
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
          >
            النشطون
          </button>

          <button
            type="button"
            className={filter === "suspended" ? "active" : ""}
            onClick={() => setFilter("suspended")}
          >
            الموقوفون
          </button>
        </div>
      </div>

      {loading ? (
        <div className="captain-profiles-empty">
          جاري تحميل ملفات الكباتن...
        </div>
      ) : filteredCaptains.length === 0 ? (
        <div className="captain-profiles-empty">
          لا توجد ملفات كباتن مطابقة.
        </div>
      ) : (
        <div className="captain-profiles-grid">
          {filteredCaptains.map((captain) => {
            const id = String(captain._id);
            const name =
              captain.fullName ||
              captain.name ||
              "كابتن بدون اسم";

            const email =
              captain.email ||
              captain.gmail ||
              "—";

            const rating =
              captain.averageRating ??
              captain.rating;

            const orders =
              captain.completedOrders ??
              captain.ordersCount;

            const shift =
              captain.currentShift ||
              captain.shift;

            const isBusy = busyId === id;
            const isActive = captain.status === "active";

            return (
              <article
                key={id}
                className="captain-profile-card"
              >
                <div className="captain-profile-card-top">
                  <div className="captain-profile-avatar">
                    {name.slice(0, 1)}
                  </div>

                  <div className="captain-profile-card-heading">
                    <h3>{name}</h3>

                    <span className={getStatusClass(captain.status)}>
                      {statusLabels[captain.status || ""] ||
                        captain.status ||
                        "غير معروف"}
                    </span>
                  </div>
                </div>

                <div className="captain-profile-info">
                  <div>
                    <span>الهاتف</span>
                    <strong>{captain.phone || "—"}</strong>
                  </div>

                  <div>
                    <span>Gmail</span>
                    <strong>{email}</strong>
                  </div>

                  <div>
                    <span>تاريخ التسجيل</span>
                    <strong>{formatDate(captain.createdAt)}</strong>
                  </div>

                  <div>
                    <span>الشفت</span>
                    <strong>
                      {shift
                        ? `${shift.startTime || "—"} - ${shift.endTime || "—"}`
                        : "غير محدد"}
                    </strong>
                  </div>

                  <div>
                    <span>الطلبات</span>
                    <strong>
                      {orders ?? "—"}
                    </strong>
                  </div>

                  <div>
                    <span>التقييم</span>
                    <strong>
                      {rating != null
                        ? `★ ${Number(rating).toFixed(1)}`
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="captain-profile-card-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() =>
                      navigate(`/captains/${id}`)
                    }
                  >
                    عرض الملف
                  </button>

                  {isActive ? (
                    <button
                      type="button"
                      className="danger"
                      disabled={isBusy}
                      onClick={() =>
                        changeStatus(captain, "suspended")
                      }
                    >
                      {isBusy
                        ? "جارٍ..."
                        : "إيقاف الحساب"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="success"
                      disabled={isBusy}
                      onClick={() =>
                        changeStatus(captain, "active")
                      }
                    >
                      {isBusy
                        ? "جارٍ..."
                        : "فك الإيقاف"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
