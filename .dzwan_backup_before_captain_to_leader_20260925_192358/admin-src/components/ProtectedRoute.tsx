
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Role =
  | "super_admin"
  | "admin"
  | "governorate_leader"
  | "area_leader"
  | "captain"
  | "shop"
  | "customer";

type User = {
  id: string;
  fullName: string;
  email?: string | null;
  phone: string;
  role: Role;
  status: string;
  avatarUrl?: string | null;
};

type Props = {
  allowedRoles?: Role[];
};

export default function ProtectedRoute({
  allowedRoles,
}: Props) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const response = await api.get<{
          success: boolean;
          user: User;
        }>("/auth/me");

        if (!mounted) return;

        const currentUser = response.data.user;

        if (currentUser.status !== "active") {
          setUser(null);
          return;
        }

        setUser(currentUser);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "Protected route auth error:",
            error,
          );
        }

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="dashboard-loading"
        dir="rtl"
      >
        <div className="loading-spinner" />
        <span>
          جارٍ التحقق من الجلسة...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <div
        className="global-error-page"
        dir="rtl"
      >
        <div className="global-error-card">
          <h2>
            لا يمكنك الوصول إلى هذه الصفحة
          </h2>

          <p>
            هذا القسم غير متاح لحسابك.
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.assign("/dashboard")
            }
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
