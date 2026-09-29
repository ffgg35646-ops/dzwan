import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Users as UsersIcon,
  UserCheck,
  UserX,
  ShieldCheck,
  Loader2,
  Power,
  Trash2,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import { canManageUsers } from "../lib/permissions";
import HomeBackButton from "../components/admin/HomeBackButton";
interface User {
  _id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: "super_admin" | "admin" | "captain" | "shop";
  status: "pending" | "active" | "rejected" | "suspended" | "inactive";
  isOnline: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

const roleLabels: Record<User["role"], string> = {
  super_admin: "المدير الرئيسي",
  admin: "مشرف",
  captain: "كابتن",
  shop: "متجر",
};

const statusLabels: Record<User["status"], string> = {
  pending: "قيد المراجعة",
  active: "نشط",
  rejected: "مرفوض",
  suspended: "موقوف",
  inactive: "غير نشط",
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [currentRole, setCurrentRole] =
    useState<string | undefined>(undefined);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/users");

      setUsers(
        Array.isArray(response.data?.users)
          ? response.data.users
          : [],
      );
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحميل المستخدمين."),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadCurrentRole() {
      try {
        const response = await api.get("/auth/me");
        setCurrentRole(
          response.data?.user?.role,
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "Role loading error:",
            error,
          );
        }
      }
    }

    void loadCurrentRole();
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  async function changeStatus(
    user: User,
    status: User["status"],
  ) {
    if (!canManageUsers(currentRole)) {
      setError(
        "ليس لديك صلاحية لتغيير حالات المستخدمين.",
      );
      return;
    }

    if (user.role === "super_admin") {
      setError(
        "لا يمكن تغيير حالة المدير الرئيسي.",
      );
      return;
    }

    try {
      setError("");

      await api.patch(`/users/${user._id}/status`, {
        status,
      });

      await loadUsers();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر تحديث حالة المستخدم."),
      );
    }
  }

  async function deleteUser(user: User) {
    if (!canManageUsers(currentRole)) {
      setError(
        "ليس لديك صلاحية لحذف المستخدمين.",
      );
      return;
    }

    if (user.role === "super_admin") return;

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المستخدم "${user.fullName}"؟`,
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/users/${user._id}`);

      await loadUsers();
    } catch (err: any) {
      setError(
        getApiErrorMessage(err, "تعذر حذف المستخدم."),
      );
    }
  }

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return users;

    return users.filter((user) =>
      [
        user.fullName,
        user.phone,
        user.email || "",
        roleLabels[user.role],
        statusLabels[user.status],
      ]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [users, search]);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    pending: users.filter((u) => u.status === "pending").length,
    online: users.filter((u) => u.isOnline).length,
  };

  return (
    <div className="admin-app" dir="rtl">
      <main className="admin-main">
<div className="admin-content">

          <HomeBackButton />
          <div className="dashboard">
            <section className="dashboard-intro">
              <div>
                <span className="dashboard-label">
                  إدارة الحسابات
                </span>

                <h1>المستخدمون</h1>

                <p>
                  إدارة حسابات المستخدمين وحالاتهم وصلاحياتهم.
                </p>
              </div>
            </section>

            {error && (
              <div className="location-error">
                {error}
              </div>
            )}

            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <div>
                    <div className="stat-title">
                      إجمالي المستخدمين
                    </div>
                    <div className="stat-value">
                      {stats.total}
                    </div>
                  </div>

                  <div className="stat-icon users-stat-icon">
                    <UsersIcon size={21} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <div>
                    <div className="stat-title">
                      المستخدمون النشطون
                    </div>
                    <div className="stat-value">
                      {stats.active}
                    </div>
                  </div>

                  <div className="stat-icon users-stat-icon">
                    <UserCheck size={21} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <div>
                    <div className="stat-title">
                      قيد المراجعة
                    </div>
                    <div className="stat-value">
                      {stats.pending}
                    </div>
                  </div>

                  <div className="stat-icon users-stat-icon">
                    <ShieldCheck size={21} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <div>
                    <div className="stat-title">
                      متصل الآن
                    </div>
                    <div className="stat-value">
                      {stats.online}
                    </div>
                  </div>

                  <div className="stat-icon users-stat-icon">
                    <Power size={21} />
                  </div>
                </div>
              </div>
            </section>

            <section className="panel users-panel">
              <div className="panel-header">
                <div>
                  <h2>قائمة المستخدمين</h2>
                  <p>
                    جميع الحسابات المسجلة في منصة زاجل ديلفري.
                  </p>
                </div>

                <div className="users-search">
                  <Search size={16} />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="بحث بالاسم أو الهاتف أو البريد..."
                  />
                </div>
              </div>

              {loading ? (
                <div className="locations-loading">
                  <Loader2
                    size={27}
                    className="location-spin"
                  />
                  <span>
                    جارٍ تحميل المستخدمين...
                  </span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="locations-empty">
                  <div className="locations-empty-icon">
                    <UsersIcon size={25} />
                  </div>

                  <h3>
                    لا يوجد مستخدمون
                  </h3>

                  <p>
                    لم يتم العثور على حسابات مطابقة.
                  </p>
                </div>
              ) : (
                <div className="users-table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>المستخدم</th>
                        <th>الهاتف</th>
                        <th>الصلاحية</th>
                        <th>الحالة</th>
                        <th>آخر دخول</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user._id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-avatar">
                                {user.fullName
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>
                                  {user.fullName}
                                </strong>

                                <small>
                                  {user.email || "بدون بريد إلكتروني"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>{user.phone}</td>

                          <td>
                            <span className="user-role">
                              {roleLabels[user.role]}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`location-status ${
                                user.status === "active"
                                  ? "active"
                                  : "inactive"
                              }`}
                            >
                              {statusLabels[user.status]}
                            </span>
                          </td>

                          <td>
                            {user.lastLoginAt
                              ? new Date(
                                  user.lastLoginAt,
                                ).toLocaleDateString(
                                  "ar-EG-u-nu-latn",
                                )
                              : "لم يسجل دخول"}
                          </td>

                          <td>
                            <div className="user-actions">
                              {user.status === "active" ? (
                                <button
                                  type="button"
                                  className="location-icon-button"
                                  title="إيقاف"
                                  disabled={
                                    user.role === "super_admin" ||
                                    !canManageUsers(currentRole)
                                  }
                                  onClick={() =>
                                    changeStatus(
                                      user,
                                      "suspended",
                                    )
                                  }
                                >
                                  <UserX size={15} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="location-icon-button"
                                  title="تفعيل"
                                  disabled={
                                    user.role === "super_admin" ||
                                    !canManageUsers(currentRole)
                                  }
                                  onClick={() =>
                                    changeStatus(
                                      user,
                                      "active",
                                    )
                                  }
                                >
                                  <UserCheck size={15} />
                                </button>
                              )}

                              {user.role !== "super_admin" && (
                                <button
                                  type="button"
                                  className="location-icon-button danger"
                                  title="حذف"
                                  onClick={() =>
                                    deleteUser(user)
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
