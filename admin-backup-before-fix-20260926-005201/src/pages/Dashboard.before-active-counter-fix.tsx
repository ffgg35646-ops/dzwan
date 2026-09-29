import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ClipboardList,
  Database,
  DollarSign,
  MapPin,
  Package,
  RefreshCw,
  Server,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { api } from "../lib/api";
import type { AdminUser } from "../types/auth";

type DashboardActivityItem = {
  id: string;
  name: string;
  orders: number;
};

type DashboardStats = {
  todayOrders: number;
  activeOrders: number;
  onlineCaptains: number;
  activeEstablishments: number;
  topRestaurants: DashboardActivityItem[];
  topShops: DashboardActivityItem[];
  topAreas: DashboardActivityItem[];
  todayOrderStatistics: {
    total: number;
    pending: number;
    active: number;
    delivered: number;
    cancelled: number;
  };
};

type DashboardOrder = {
  _id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

const ACTIVE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "picked_up",
  "on_the_way",
];

const orderStatusLabels: Record<string, string> = {
  pending: "جديد",
  confirmed: "مؤكد",
  preparing: "جاري التجهيز",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تم إسناده",
  picked_up: "تم الاستلام",
  on_the_way: "في الطريق",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

function money(value: number) {
  return `${Number(value || 0).toFixed(2)} ج.م`;
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function statusClass(status: string) {
  if (status === "delivered") return "dashboard-status success";
  if (status === "cancelled" || status === "rejected") {
    return "dashboard-status danger";
  }
  if (
    status === "pending" ||
    status === "preparing" ||
    status === "ready_for_pickup"
  ) {
    return "dashboard-status warning";
  }
  return "dashboard-status info";
}

function statusLabel(status: string) {
  return orderStatusLabels[status] || status;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [registrationPendingCount, setRegistrationPendingCount] =
    useState(0);

  const [, setNotificationCount] = useState(0);
  const [, setNotifications] = useState<
    Array<{
      _id: string;
      title: string;
      message: string;
      isRead: boolean;
      createdAt: string;
    }>
  >([]);

  const [systemStatus, setSystemStatus] = useState<{
    api: "online" | "offline" | "unknown";
    database: "online" | "offline" | "unknown";
  }>({
    api: "unknown",
    database: "unknown",
  });

  const [stuckOrdersCount, setStuckOrdersCount] = useState(0);

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStats>({
      todayOrders: 0,
      activeOrders: 0,
      onlineCaptains: 0,
      activeEstablishments: 0,
      topRestaurants: [],
      topShops: [],
      topAreas: [],
      todayOrderStatistics: {
        total: 0,
        pending: 0,
        active: 0,
        delivered: 0,
        cancelled: 0,
      },
    });

  const [latestOrders, setLatestOrders] = useState<DashboardOrder[]>(
    [],
  );

  useEffect(() => {
    let mounted = true;

    async function loadRegistrationPendingCount() {
      try {
        const [captainsResponse, establishmentsResponse] =
          await Promise.all([
            api.get("/captain-registration"),
            api.get("/establishment-registration"),
          ]);

        const captains = Array.isArray(
          captainsResponse.data?.registrations,
        )
          ? captainsResponse.data.registrations
          : [];

        const establishments = Array.isArray(
          establishmentsResponse.data?.registrations,
        )
          ? establishmentsResponse.data.registrations
          : [];

        const count =
          captains.filter(
            (row: { status?: string }) => row.status === "pending",
          ).length +
          establishments.filter(
            (row: { status?: string }) => row.status === "pending",
          ).length;

        if (mounted) {
          setRegistrationPendingCount(count);
        }
      } catch {
        if (mounted) {
          setRegistrationPendingCount(0);
        }
      }
    }

    void loadRegistrationPendingCount();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const response = await api.get("/notifications");

        setNotificationCount(
          Number(response.data?.unreadCount ?? 0),
        );

        setNotifications(
          Array.isArray(response.data?.notifications)
            ? response.data.notifications
            : [],
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(
            "Notification polling error:",
            error,
          );
        }
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await api.get<{
          success: boolean;
          user: AdminUser;
        }>("/auth/me");

        const currentUser = response.data.user;

        if (
          currentUser.role !== "admin" &&
          currentUser.role !== "super_admin"
        ) {
          navigate("/", { replace: true });
          return;
        }

        setUser(currentUser);

        try {
          const [
            ordersResponse,
            captainsResponse,
            establishmentsResponse,
            notificationsResponse,
            systemStatusResponse,
            operationsDashboardResponse,
            stuckResponse,
          ] = await Promise.all([
            api.get("/orders"),
            api.get("/captains"),
            api.get("/establishments"),
            api.get("/notifications"),
            api.get("/system/status"),
            api.get("/requirements/dashboard/operations"),
            api.get("/ops/stuck"),
          ]);

          const orders = Array.isArray(
            ordersResponse.data?.orders,
          )
            ? ordersResponse.data.orders
            : [];

          const captains = Array.isArray(
            captainsResponse.data?.captains,
          )
            ? captainsResponse.data.captains
            : [];

          const establishments = Array.isArray(
            establishmentsResponse.data?.establishments,
          )
            ? establishmentsResponse.data.establishments
            : [];

          const operationsDashboard =
            operationsDashboardResponse.data?.dashboard ??
            operationsDashboardResponse.data?.data ??
            operationsDashboardResponse.data ??
            null;

          const stuckAlerts = Array.isArray(
            stuckResponse.data?.alerts,
          )
            ? stuckResponse.data.alerts
            : [];

          setStuckOrdersCount(
            stuckAlerts.filter(
              (item: { status?: string }) =>
                item.status === "open" ||
                item.status === "acknowledged",
            ).length,
          );

          setNotificationCount(
            Number(
              notificationsResponse.data?.unreadCount ?? 0,
            ),
          );

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayOrders = orders.filter(
            (order: { createdAt: string }) =>
              new Date(order.createdAt) >= today,
          ).length;

          const activeOrders = orders.filter(
            (order: { status: string }) =>
              ACTIVE_ORDER_STATUSES.includes(order.status),
          ).length;

          const onlineCaptains = captains.filter(
            (captain: { isOnline?: boolean }) =>
              captain.isOnline === true,
          ).length;

          const activeEstablishments = establishments.filter(
            (item: { status?: string }) =>
              item.status === "active",
          ).length;

          setSystemStatus({
            api:
              systemStatusResponse.data?.services?.api?.status ===
              "online"
                ? "online"
                : systemStatusResponse.data?.services?.api?.status ===
                    "offline"
                  ? "offline"
                  : "unknown",
            database:
              systemStatusResponse.data?.services?.database?.status ===
              "online"
                ? "online"
                : systemStatusResponse.data?.services?.database?.status ===
                    "offline"
                  ? "offline"
                  : "unknown",
          });

          setDashboardStats({
            todayOrders: Number(
              operationsDashboard?.todayOrders ?? todayOrders,
            ),
            activeOrders: Number(
              operationsDashboard?.activeOrders ?? activeOrders,
            ),
            onlineCaptains: Number(
              operationsDashboard?.onlineCaptains ?? onlineCaptains,
            ),
            activeEstablishments: Number(
              operationsDashboard?.activeEstablishments ??
                activeEstablishments,
            ),
            topRestaurants: Array.isArray(
              operationsDashboard?.topRestaurants,
            )
              ? operationsDashboard.topRestaurants
              : [],
            topShops: Array.isArray(
              operationsDashboard?.topShops,
            )
              ? operationsDashboard.topShops
              : [],
            topAreas: Array.isArray(
              operationsDashboard?.topAreas,
            )
              ? operationsDashboard.topAreas
              : [],
            todayOrderStatistics:
              operationsDashboard?.todayOrderStatistics ?? {
                total: todayOrders,
                pending: 0,
                active: activeOrders,
                delivered: 0,
                cancelled: 0,
              },
          });

          setLatestOrders(
            orders
              .slice()
              .sort(
                (
                  a: { createdAt: string },
                  b: { createdAt: string },
                ) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice(0, 5),
          );
        } catch (dashboardError) {
          console.error(
            "Dashboard statistics error:",
            dashboardError,
          );
        }
      } catch {
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [navigate]);


  if (loading) {
    return (
      <>
        <style>{`
          .dashboard-loading-new {
            min-height: 60vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: #6b7280;
            direction: rtl;
          }

          .dashboard-loading-spinner {
            width: 34px;
            height: 34px;
            border: 3px solid #e5e7eb;
            border-top-color: #f28c28;
            border-radius: 50%;
            animation: dashboard-spin .8s linear infinite;
          }

          @keyframes dashboard-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>

        <div className="dashboard-loading-new">
          <div className="dashboard-loading-spinner" />
          <span>جارٍ تحميل لوحة التحكم...</span>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  const stats = dashboardStats.todayOrderStatistics;

  const statsTotal = Math.max(Number(stats.total || 0), 1);

  const deliveredPercent = Math.round(
    (Number(stats.delivered || 0) / statsTotal) * 100,
  );

  const pendingPercent = Math.round(
    (Number(stats.pending || 0) / statsTotal) * 100,
  );

  const activePercent = Math.round(
    (Number(stats.active || 0) / statsTotal) * 100,
  );

  return (
    <>
      <style>{`
        .dashboard-new {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 10px 0 30px;
          direction: rtl;
          color: #172033;
        }

        .dashboard-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 28px 30px;
          margin-bottom: 22px;
          border-radius: 24px;
          background:
            radial-gradient(circle at 92% 10%, rgba(242,140,40,.17), transparent 28%),
            radial-gradient(circle at 6% 90%, rgba(37,99,235,.08), transparent 32%),
            #fff;
          border: 1px solid #edf0f5;
          box-shadow: 0 14px 36px rgba(20, 34, 56, .06);
        }

        .dashboard-hero::after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          left: -80px;
          bottom: -110px;
          border-radius: 50%;
          background: rgba(242,140,40,.06);
        }

        .dashboard-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          color: #f28c28;
          background: #fff5eb;
          border: 1px solid #ffe3ca;
          padding: 7px 11px;
          border-radius: 999px;
          margin-bottom: 12px;
        }

        .dashboard-eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f28c28;
          box-shadow: 0 0 0 5px rgba(242,140,40,.10);
        }

        .dashboard-hero h1 {
          margin: 0;
          font-size: 31px;
          line-height: 1.15;
          letter-spacing: -.6px;
          color: #111827;
        }

        .dashboard-hero p {
          margin: 9px 0 0;
          max-width: 740px;
          color: #667085;
          font-size: 14px;
          line-height: 1.8;
        }

        .dashboard-hero-side {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .dashboard-user-chip {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 10px 12px;
          border: 1px solid #edf0f5;
          background: #fafbfc;
          border-radius: 15px;
        }

        .dashboard-user-avatar {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(145deg, #fff0df, #fff7ef);
          color: #d96f0a;
          font-size: 16px;
          font-weight: 900;
        }

        .dashboard-user-name {
          font-size: 13px;
          font-weight: 800;
          color: #1f2937;
        }

        .dashboard-user-role {
          margin-top: 2px;
          color: #98a2b3;
          font-size: 11px;
        }

        .dashboard-system-live {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 14px;
          background: #f2fbf5;
          color: #147a3b;
          border: 1px solid #d8f0df;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .dashboard-system-live span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22a45d;
          box-shadow: 0 0 0 5px rgba(34,164,93,.10);
        }

        .dashboard-kpi-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }

        .dashboard-kpi {
          position: relative;
          overflow: hidden;
          min-height: 145px;
          padding: 18px;
          border-radius: 20px;
          border: 1px solid #edf0f5;
          background: #fff;
          box-shadow: 0 9px 24px rgba(20, 34, 56, .045);
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .dashboard-kpi.clickable {
          cursor: pointer;
        }

        .dashboard-kpi.clickable:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(20, 34, 56, .09);
        }

        .dashboard-kpi::after {
          content: "";
          position: absolute;
          width: 110px;
          height: 110px;
          left: -44px;
          bottom: -65px;
          border-radius: 50%;
          background: rgba(242,140,40,.05);
        }

        .dashboard-kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .dashboard-kpi-title {
          font-size: 12px;
          font-weight: 800;
          color: #667085;
        }

        .dashboard-kpi-value {
          margin-top: 7px;
          font-size: 30px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.7px;
          color: #151b28;
        }

        .dashboard-kpi-note {
          margin-top: 14px;
          font-size: 11px;
          color: #98a2b3;
        }

        .dashboard-kpi-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #fff5eb;
          color: #ee7f18;
          flex-shrink: 0;
        }

        .dashboard-kpi.warning .dashboard-kpi-icon {
          background: #fff7e8;
          color: #c98605;
        }

        .dashboard-kpi.blue .dashboard-kpi-icon {
          background: #eef5ff;
          color: #3478db;
        }

        .dashboard-kpi.green .dashboard-kpi-icon {
          background: #edf9f2;
          color: #179452;
        }

        .dashboard-kpi.red .dashboard-kpi-icon {
          background: #fff0ef;
          color: #d6493f;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .dashboard-panel {
          min-width: 0;
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 22px;
          box-shadow: 0 9px 24px rgba(20, 34, 56, .045);
          overflow: hidden;
        }

        .dashboard-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 20px 22px;
          border-bottom: 1px solid #f0f2f5;
        }

        .dashboard-panel-heading {
          min-width: 0;
        }

        .dashboard-panel-title {
          margin: 0;
          color: #172033;
          font-size: 17px;
          font-weight: 900;
        }

        .dashboard-panel-subtitle {
          margin: 5px 0 0;
          color: #98a2b3;
          font-size: 12px;
        }

        .dashboard-panel-icon {
          color: #b2b8c3;
          flex-shrink: 0;
        }

        .dashboard-panel-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 0;
          background: transparent;
          color: #e97611;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          padding: 6px 0;
        }

        .dashboard-panel-action:hover {
          color: #b75a05;
        }

        .dashboard-order-list {
          display: flex;
          flex-direction: column;
        }

        .dashboard-order {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px 22px;
          border: 0;
          border-bottom: 1px solid #f3f4f6;
          background: transparent;
          text-align: right;
          cursor: pointer;
          transition: background .16s ease;
        }

        .dashboard-order:last-child {
          border-bottom: 0;
        }

        .dashboard-order:hover {
          background: #fffaf5;
        }

        .dashboard-order-main {
          min-width: 0;
        }

        .dashboard-order-number {
          font-size: 14px;
          font-weight: 900;
          color: #1f2937;
        }

        .dashboard-order-time {
          margin-top: 5px;
          font-size: 11px;
          color: #98a2b3;
        }

        .dashboard-order-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .dashboard-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .dashboard-status.info {
          color: #275ea8;
          background: #eef5ff;
        }

        .dashboard-status.warning {
          color: #ad6c00;
          background: #fff6df;
        }

        .dashboard-status.success {
          color: #167744;
          background: #eaf8ef;
        }

        .dashboard-status.danger {
          color: #b63631;
          background: #fff0ef;
        }

        .dashboard-order-total {
          font-size: 12px;
          font-weight: 900;
          color: #4b5563;
        }

        .dashboard-list {
          padding: 6px 22px 10px;
        }

        .dashboard-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 15px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .dashboard-row:last-child {
          border-bottom: 0;
        }

        .dashboard-row-main {
          min-width: 0;
        }

        .dashboard-row-name {
          display: block;
          color: #1f2937;
          font-size: 13px;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dashboard-row-caption {
          display: block;
          margin-top: 4px;
          color: #98a2b3;
          font-size: 10px;
        }

        .dashboard-row-value {
          min-width: 68px;
          text-align: center;
          padding: 7px 10px;
          border-radius: 10px;
          background: #f7f8fa;
          color: #475467;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .dashboard-number-badge {
          min-width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: #fff5eb;
          color: #e87913;
          font-size: 11px;
          font-weight: 900;
        }

        .dashboard-empty {
          padding: 35px 22px;
          text-align: center;
          color: #98a2b3;
          font-size: 12px;
        }

        .dashboard-empty-icon {
          width: 46px;
          height: 46px;
          margin: 0 auto 10px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #f8fafc;
          color: #b0b8c4;
        }

        .dashboard-split {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(0, .75fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .dashboard-stat-breakdown {
          padding: 8px 22px 22px;
        }

        .dashboard-breakdown-row {
          display: grid;
          grid-template-columns: 120px minmax(0,1fr) 48px;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
        }

        .dashboard-breakdown-label {
          font-size: 12px;
          font-weight: 800;
          color: #475467;
        }

        .dashboard-breakdown-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #f0f2f5;
        }

        .dashboard-breakdown-fill {
          height: 100%;
          border-radius: inherit;
          background: #f28c28;
        }

        .dashboard-breakdown-fill.green {
          background: #28a866;
        }

        .dashboard-breakdown-fill.blue {
          background: #4b86e8;
        }

        .dashboard-breakdown-fill.red {
          background: #df6258;
        }

        .dashboard-breakdown-number {
          text-align: left;
          color: #344054;
          font-size: 12px;
          font-weight: 900;
        }

        .dashboard-system-list {
          padding: 6px 22px 12px;
        }

        .dashboard-system-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 15px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .dashboard-system-row:last-child {
          border-bottom: 0;
        }

        .dashboard-system-main {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .dashboard-system-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #f6f8fa;
          color: #667085;
          flex-shrink: 0;
        }

        .dashboard-system-name {
          color: #344054;
          font-size: 12px;
          font-weight: 850;
        }

        .dashboard-system-caption {
          margin-top: 3px;
          color: #98a2b3;
          font-size: 10px;
        }

        .dashboard-system-state {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        .dashboard-system-state.online {
          background: #eaf8ef;
          color: #187645;
        }

        .dashboard-system-state.offline {
          background: #fff0ef;
          color: #ba3b34;
        }

        .dashboard-system-state.unknown {
          background: #f3f4f6;
          color: #667085;
        }

        .dashboard-system-state i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: block;
          background: currentColor;
        }

        .dashboard-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          padding: 17px 20px;
          border: 1px solid #ffe2be;
          border-radius: 19px;
          background: linear-gradient(135deg, #fff9f1, #fff);
        }

        .dashboard-alert-main {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .dashboard-alert-icon {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #c77a00;
          background: #fff2d7;
          flex-shrink: 0;
        }

        .dashboard-alert-title {
          margin: 0;
          color: #4b3a20;
          font-size: 13px;
          font-weight: 900;
        }

        .dashboard-alert-text {
          margin: 4px 0 0;
          color: #8b7b65;
          font-size: 11px;
        }

        .dashboard-alert-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 0;
          border-radius: 11px;
          padding: 9px 12px;
          background: #fff;
          color: #b96805;
          box-shadow: 0 4px 12px rgba(86, 56, 12, .06);
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .dashboard-quick-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 12px;
          padding: 8px 22px 22px;
        }

        .dashboard-quick {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          padding: 14px;
          border: 1px solid #edf0f5;
          border-radius: 16px;
          background: #fbfcfd;
          cursor: pointer;
          text-align: right;
          transition: all .16s ease;
        }

        .dashboard-quick:hover {
          transform: translateY(-2px);
          background: #fffaf5;
          border-color: #ffe2c7;
        }

        .dashboard-quick-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background: #fff1e4;
          color: #e87816;
          flex-shrink: 0;
        }

        .dashboard-quick-text {
          min-width: 0;
          flex: 1;
        }

        .dashboard-quick-title {
          display: block;
          color: #344054;
          font-size: 12px;
          font-weight: 900;
        }

        .dashboard-quick-caption {
          display: block;
          margin-top: 3px;
          color: #98a2b3;
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dashboard-quick-arrow {
          color: #b0b7c2;
          flex-shrink: 0;
        }

        .dashboard-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 5px 2px 0;
          color: #98a2b3;
          font-size: 10px;
        }

        .dashboard-footer-user {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        @media (max-width: 1200px) {
          .dashboard-kpi-grid {
            grid-template-columns: repeat(3, minmax(0,1fr));
          }

          .dashboard-grid,
          .dashboard-split {
            grid-template-columns: 1fr;
          }

          .dashboard-quick-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
          }
        }

        @media (max-width: 760px) {
          .dashboard-new {
            padding: 0 0 24px;
          }

          .dashboard-hero {
            flex-direction: column;
            align-items: stretch;
            padding: 22px 18px;
            border-radius: 19px;
          }

          .dashboard-hero h1 {
            font-size: 25px;
          }

          .dashboard-hero-side {
            flex-direction: column;
            align-items: stretch;
          }

          .dashboard-system-live,
          .dashboard-user-chip {
            width: 100%;
          }

          .dashboard-kpi-grid {
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 10px;
          }

          .dashboard-kpi {
            min-height: 132px;
            padding: 15px;
          }

          .dashboard-kpi-value {
            font-size: 26px;
          }

          .dashboard-panel-header {
            padding: 17px 16px;
          }

          .dashboard-list,
          .dashboard-system-list {
            padding-left: 16px;
            padding-right: 16px;
          }

          .dashboard-order {
            padding: 15px 16px;
          }

          .dashboard-breakdown-row {
            grid-template-columns: 90px minmax(0,1fr) 40px;
            gap: 8px;
          }

          .dashboard-alert {
            align-items: stretch;
            flex-direction: column;
          }

          .dashboard-alert-button {
            justify-content: center;
          }

          .dashboard-quick-grid {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
          }

          .dashboard-footer {
            padding-right: 3px;
            padding-left: 3px;
          }
        }

        @media (max-width: 480px) {
          .dashboard-kpi-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-order {
            align-items: flex-start;
          }

          .dashboard-order-side {
            align-items: flex-end;
          }
        }
      `}</style>

      <div className="dashboard-new">
        <section className="dashboard-hero">
          <div>
            <div className="dashboard-eyebrow">
              <span className="dashboard-eyebrow-dot" />
              لوحة الإدارة
            </div>

            <h1>الرئيسية</h1>

            <p>
              تابع تشغيل زاجل ديلفري، الطلبات، الكباتن،
              المحلات، والمناطق من مكان واحد.
            </p>
          </div>

          <div className="dashboard-hero-side">
            <div className="dashboard-system-live">
              <span />
              النظام يعمل بشكل طبيعي
            </div>

            <div className="dashboard-user-chip">
              <div className="dashboard-user-avatar">
                {user.fullName?.slice(0, 1) || "م"}
              </div>

              <div>
                <div className="dashboard-user-name">
                  {user.fullName}
                </div>

                <div className="dashboard-user-role">
                  {user.role === "super_admin"
                    ? "المدير العام"
                    : "مدير"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {registrationPendingCount > 0 && (
          <section className="dashboard-alert">
            <div className="dashboard-alert-main">
              <div className="dashboard-alert-icon">
                <ClipboardList size={19} />
              </div>

              <div>
                <h3 className="dashboard-alert-title">
                  توجد طلبات تسجيل معلقة
                </h3>

                <p className="dashboard-alert-text">
                  يوجد {registrationPendingCount} طلب يحتاج
                  إلى مراجعة الإدارة.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="dashboard-alert-button"
              onClick={() => navigate("/registration-requests")}
            >
              مراجعة الطلبات
              <ArrowLeft size={14} />
            </button>
          </section>
        )}

        <section className="dashboard-kpi-grid">
          <article className="dashboard-kpi">
            <div className="dashboard-kpi-top">
              <div>
                <div className="dashboard-kpi-title">
                  طلبات اليوم
                </div>

                <div className="dashboard-kpi-value">
                  {dashboardStats.todayOrders}
                </div>
              </div>

              <div className="dashboard-kpi-icon">
                <Package size={21} />
              </div>
            </div>

            <div className="dashboard-kpi-note">
              إجمالي الطلبات المسجلة اليوم
            </div>
          </article>

          <article className="dashboard-kpi blue">
            <div className="dashboard-kpi-top">
              <div>
                <div className="dashboard-kpi-title">
                  الطلبات النشطة
                </div>

                <div className="dashboard-kpi-value">
                  {dashboardStats.activeOrders}
                </div>
              </div>

              <div className="dashboard-kpi-icon">
                <Clock3 size={21} />
              </div>
            </div>

            <div className="dashboard-kpi-note">
              طلبات قيد التنفيذ حاليًا
            </div>
          </article>

          <article
            className="dashboard-kpi warning clickable"
            onClick={() =>
              navigate("/operations-center?filter=stuck")
            }
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                navigate("/operations-center?filter=stuck");
              }
            }}
          >
            <div className="dashboard-kpi-top">
              <div>
                <div className="dashboard-kpi-title">
                  الطلبات العالقة
                </div>

                <div className="dashboard-kpi-value">
                  {stuckOrdersCount}
                </div>
              </div>

              <div className="dashboard-kpi-icon">
                <AlertTriangle size={21} />
              </div>
            </div>

            <div className="dashboard-kpi-note">
              تحتاج متابعة من مركز العمليات
            </div>
          </article>

          <article className="dashboard-kpi green">
            <div className="dashboard-kpi-top">
              <div>
                <div className="dashboard-kpi-title">
                  الكباتن المتصلون
                </div>

                <div className="dashboard-kpi-value">
                  {dashboardStats.onlineCaptains}
                </div>
              </div>

              <div className="dashboard-kpi-icon">
                <Truck size={21} />
              </div>
            </div>

            <div className="dashboard-kpi-note">
              جاهزون لاستلام الطلبات
            </div>
          </article>

          <article className="dashboard-kpi">
            <div className="dashboard-kpi-top">
              <div>
                <div className="dashboard-kpi-title">
                  المحلات النشطة
                </div>

                <div className="dashboard-kpi-value">
                  {dashboardStats.activeEstablishments}
                </div>
              </div>

              <div className="dashboard-kpi-icon">
                <ShoppingBag size={21} />
              </div>
            </div>

            <div className="dashboard-kpi-note">
              المحلات والمطاعم العاملة
            </div>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div className="dashboard-panel-heading">
                <h2 className="dashboard-panel-title">
                  آخر الطلبات
                </h2>

                <p className="dashboard-panel-subtitle">
                  أحدث الطلبات المسجلة في المنصة
                </p>
              </div>

              <button
                type="button"
                className="dashboard-panel-action"
                onClick={() => navigate("/orders")}
              >
                عرض الكل
                <ChevronLeft size={14} />
              </button>
            </div>

            {latestOrders.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">
                  <Package size={22} />
                </div>

                لا توجد طلبات حتى الآن
              </div>
            ) : (
              <div className="dashboard-order-list">
                {latestOrders.map((order) => (
                  <button
                    key={order._id}
                    type="button"
                    className="dashboard-order"
                    onClick={() => navigate("/orders")}
                  >
                    <div className="dashboard-order-main">
                      <div className="dashboard-order-number">
                        {order.orderNumber}
                      </div>

                      <div className="dashboard-order-time">
                        {formatDateTime(order.createdAt)}
                      </div>
                    </div>

                    <div className="dashboard-order-side">
                      <span className="dashboard-order-total">
                        {money(order.total)}
                      </span>

                      <span className={statusClass(order.status)}>
                        {statusLabel(order.status)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div className="dashboard-panel-heading">
                <h2 className="dashboard-panel-title">
                  حالة التشغيل
                </h2>

                <p className="dashboard-panel-subtitle">
                  الخدمات الأساسية في زاجل ديلفري
                </p>
              </div>

              <Activity
                size={19}
                className="dashboard-panel-icon"
              />
            </div>

            <div className="dashboard-system-list">
              <div className="dashboard-system-row">
                <div className="dashboard-system-main">
                  <div className="dashboard-system-icon">
                    <Server size={17} />
                  </div>

                  <div>
                    <div className="dashboard-system-name">
                      الخادم
                    </div>

                    <div className="dashboard-system-caption">
                      واجهة برمجة التطبيقات
                    </div>
                  </div>
                </div>

                <span
                  className={`dashboard-system-state ${
                    systemStatus.api
                  }`}
                >
                  <i />
                  {systemStatus.api === "online"
                    ? "متصل"
                    : systemStatus.api === "offline"
                      ? "غير متصل"
                      : "غير معروف"}
                </span>
              </div>

              <div className="dashboard-system-row">
                <div className="dashboard-system-main">
                  <div className="dashboard-system-icon">
                    <Database size={17} />
                  </div>

                  <div>
                    <div className="dashboard-system-name">
                      قاعدة البيانات
                    </div>

                    <div className="dashboard-system-caption">
                      MongoDB
                    </div>
                  </div>
                </div>

                <span
                  className={`dashboard-system-state ${
                    systemStatus.database
                  }`}
                >
                  <i />
                  {systemStatus.database === "online"
                    ? "متصلة"
                    : systemStatus.database === "offline"
                      ? "غير متصلة"
                      : "غير معروفة"}
                </span>
              </div>

              <div className="dashboard-system-row">
                <div className="dashboard-system-main">
                  <div className="dashboard-system-icon">
                    <Package size={17} />
                  </div>

                  <div>
                    <div className="dashboard-system-name">
                      نظام الطلبات
                    </div>

                    <div className="dashboard-system-caption">
                      استقبال الطلبات
                    </div>
                  </div>
                </div>

                <span className="dashboard-system-state online">
                  <i />
                  جاهز
                </span>
              </div>

              <div className="dashboard-system-row">
                <div className="dashboard-system-main">
                  <div className="dashboard-system-icon">
                    <Truck size={17} />
                  </div>

                  <div>
                    <div className="dashboard-system-name">
                      الكباتن
                    </div>

                    <div className="dashboard-system-caption">
                      المتاحون الآن
                    </div>
                  </div>
                </div>

                <span className="dashboard-system-state unknown">
                  <i />
                  {dashboardStats.onlineCaptains} متصل
                </span>
              </div>
            </div>
          </article>
        </section>

        <section className="dashboard-split">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div className="dashboard-panel-heading">
                <h2 className="dashboard-panel-title">
                  إحصائيات الطلبات اليوم
                </h2>

                <p className="dashboard-panel-subtitle">
                  توزيع الطلبات حسب حالتها الحالية
                </p>
              </div>

              <BarChartIconPlaceholder />
            </div>

            <div className="dashboard-stat-breakdown">
              <div className="dashboard-breakdown-row">
                <span className="dashboard-breakdown-label">
                  كل الطلبات
                </span>

                <div className="dashboard-breakdown-track">
                  <div
                    className="dashboard-breakdown-fill"
                    style={{ width: "100%" }}
                  />
                </div>

                <span className="dashboard-breakdown-number">
                  {stats.total}
                </span>
              </div>

              <div className="dashboard-breakdown-row">
                <span className="dashboard-breakdown-label">
                  قيد الانتظار
                </span>

                <div className="dashboard-breakdown-track">
                  <div
                    className="dashboard-breakdown-fill"
                    style={{
                      width: `${pendingPercent}%`,
                    }}
                  />
                </div>

                <span className="dashboard-breakdown-number">
                  {stats.pending}
                </span>
              </div>

              <div className="dashboard-breakdown-row">
                <span className="dashboard-breakdown-label">
                  نشطة
                </span>

                <div className="dashboard-breakdown-track">
                  <div
                    className="dashboard-breakdown-fill blue"
                    style={{
                      width: `${activePercent}%`,
                    }}
                  />
                </div>

                <span className="dashboard-breakdown-number">
                  {stats.active}
                </span>
              </div>

              <div className="dashboard-breakdown-row">
                <span className="dashboard-breakdown-label">
                  تم التسليم
                </span>

                <div className="dashboard-breakdown-track">
                  <div
                    className="dashboard-breakdown-fill green"
                    style={{
                      width: `${deliveredPercent}%`,
                    }}
                  />
                </div>

                <span className="dashboard-breakdown-number">
                  {stats.delivered}
                </span>
              </div>

              <div className="dashboard-breakdown-row">
                <span className="dashboard-breakdown-label">
                  ملغاة
                </span>

                <div className="dashboard-breakdown-track">
                  <div
                    className="dashboard-breakdown-fill red"
                    style={{
                      width: `${
                        Math.round(
                          (Number(stats.cancelled || 0) /
                            statsTotal) *
                            100,
                        )
                      }%`,
                    }}
                  />
                </div>

                <span className="dashboard-breakdown-number">
                  {stats.cancelled}
                </span>
              </div>
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div className="dashboard-panel-heading">
                <h2 className="dashboard-panel-title">
                  أكثر المناطق نشاطًا
                </h2>

                <p className="dashboard-panel-subtitle">
                  حسب وجهات الطلبات اليوم
                </p>
              </div>

              <MapPin
                size={18}
                className="dashboard-panel-icon"
              />
            </div>

            <div className="dashboard-list">
              {dashboardStats.topAreas.length === 0 ? (
                <div className="dashboard-empty">
                  لا توجد بيانات اليوم.
                </div>
              ) : (
                dashboardStats.topAreas.map((item, index) => (
                  <div
                    className="dashboard-row"
                    key={item.id}
                  >
                    <div className="dashboard-row-main">
                      <span className="dashboard-row-name">
                        {item.name}
                      </span>

                      <span className="dashboard-row-caption">
                        طلبات اليوم
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span className="dashboard-number-badge">
                        {index + 1}
                      </span>

                      <span className="dashboard-row-value">
                        {item.orders} طلب
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div className="dashboard-panel-heading">
                <h2 className="dashboard-panel-title">
                  أكثر المطاعم نشاطًا اليوم
                </h2>

                <p className="dashboard-panel-subtitle">
                  حسب عدد الطلبات المسجلة اليوم
                </p>
              </div>

              <ShoppingBag
                size={18}
                className="dashboard-panel-icon"
              />
            </div>

            <div className="dashboard-list">
              {dashboardStats.topRestaurants.length === 0 ? (
                <div className="dashboard-empty">
                  لا توجد بيانات اليوم.
                </div>
              ) : (
                dashboardStats.topRestaurants.map(
                  (item, index) => (
                    <div
                      className="dashboard-row"
                      key={item.id}
                    >
                      <div className="dashboard-row-main">
                        <span className="dashboard-row-name">
                          {item.name}
                        </span>

                        <span className="dashboard-row-caption">
                          المركز {index + 1}
                        </span>
                      </div>

                      <span className="dashboard-row-value">
                        {item.orders} طلب
                      </span>
                    </div>
                  ),
                )
              )}
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div className="dashboard-panel-heading">
                <h2 className="dashboard-panel-title">
                  أكثر المحلات نشاطًا اليوم
                </h2>

                <p className="dashboard-panel-subtitle">
                  حسب عدد الطلبات المسجلة اليوم
                </p>
              </div>

              <ShoppingBag
                size={18}
                className="dashboard-panel-icon"
              />
            </div>

            <div className="dashboard-list">
              {dashboardStats.topShops.length === 0 ? (
                <div className="dashboard-empty">
                  لا توجد بيانات اليوم.
                </div>
              ) : (
                dashboardStats.topShops.map((item, index) => (
                  <div
                    className="dashboard-row"
                    key={item.id}
                  >
                    <div className="dashboard-row-main">
                      <span className="dashboard-row-name">
                        {item.name}
                      </span>

                      <span className="dashboard-row-caption">
                        المركز {index + 1}
                      </span>
                    </div>

                    <span className="dashboard-row-value">
                      {item.orders} طلب
                    </span>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="dashboard-panel" style={{ marginBottom: 18 }}>
          <div className="dashboard-panel-header">
            <div className="dashboard-panel-heading">
              <h2 className="dashboard-panel-title">
                الوصول السريع
              </h2>

              <p className="dashboard-panel-subtitle">
                أهم العمليات الإدارية من مكان واحد
              </p>
            </div>

            <RefreshCw
              size={18}
              className="dashboard-panel-icon"
            />
          </div>

          <div className="dashboard-quick-grid">
            <button
              type="button"
              className="dashboard-quick"
              onClick={() => navigate("/captains")}
            >
              <span className="dashboard-quick-icon">
                <Users size={18} />
              </span>

              <span className="dashboard-quick-text">
                <span className="dashboard-quick-title">
                  إدارة الكباتن
                </span>

                <span className="dashboard-quick-caption">
                  إضافة ومتابعة الكباتن
                </span>
              </span>

              <ChevronLeft
                size={16}
                className="dashboard-quick-arrow"
              />
            </button>

            <button
              type="button"
              className="dashboard-quick"
              onClick={() => navigate("/establishments")}
            >
              <span className="dashboard-quick-icon">
                <ShoppingBag size={18} />
              </span>

              <span className="dashboard-quick-text">
                <span className="dashboard-quick-title">
                  إدارة المحلات
                </span>

                <span className="dashboard-quick-caption">
                  المحلات والمطاعم
                </span>
              </span>

              <ChevronLeft
                size={16}
                className="dashboard-quick-arrow"
              />
            </button>

            <button
              type="button"
              className="dashboard-quick"
              onClick={() => navigate("/locations")}
            >
              <span className="dashboard-quick-icon">
                <MapPin size={18} />
              </span>

              <span className="dashboard-quick-text">
                <span className="dashboard-quick-title">
                  المحافظات والمناطق
                </span>

                <span className="dashboard-quick-caption">
                  إدارة المناطق
                </span>
              </span>

              <ChevronLeft
                size={16}
                className="dashboard-quick-arrow"
              />
            </button>

            <button
              type="button"
              className="dashboard-quick"
              onClick={() => navigate("/products")}
            >
              <span className="dashboard-quick-icon">
                <DollarSign size={18} />
              </span>

              <span className="dashboard-quick-text">
                <span className="dashboard-quick-title">
                  إدارة التسعير
                </span>

                <span className="dashboard-quick-caption">
                  الأسعار وقواعد التوصيل
                </span>
              </span>

              <ChevronLeft
                size={16}
                className="dashboard-quick-arrow"
              />
            </button>
          </div>
        </section>

        <div className="dashboard-footer">
          <span className="dashboard-footer-user">
            <CheckCircle2 size={12} />
            لوحة الإدارة تعمل بشكل طبيعي
          </span>

          <span>
            زاجل ديلفري
          </span>
        </div>
      </div>
    </>
  );
}

function BarChartIconPlaceholder() {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        display: "grid",
        placeItems: "center",
        borderRadius: 11,
        background: "#f6f8fa",
        color: "#667085",
      }}
    >
      <Activity size={17} />
    </div>
  );
}
