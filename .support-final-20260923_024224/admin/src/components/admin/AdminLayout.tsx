import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  FileCheck2,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  Package,
  Settings,
  ShoppingBag,
  Users,
  X,
  DollarSign,
  BarChart3,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react";
import { setAccessToken, api } from "../../lib/api";

interface AdminLayoutProps {
  userName?: string;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const navigation: NavigationItem[] = [
  {
    label: "الرئيسية",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "الطلبات",
    path: "/orders",
    icon: Package,
  },
  {
    label: "الكباتن",
    path: "/captains",
    icon: Users,
  },
  {
    label: "طلبات التسجيل",
    path: "/registration-requests",
    icon: ClipboardList,
  },
  {
    label: "المطاعم والمحلات",
    path: "/establishments",
    icon: ShoppingBag,
  },
  {
    label: "العملاء",
    path: "/customers",
    icon: Users,
  },
  {
    label: "القادة",
    path: "/leaders",
    icon: Users,
  },
  {
    label: "مواقع المنشآت",
    path: "/establishment-locations",
    icon: MapPinned,
  },
  {
    label: "المنتجات",
    path: "/products",
    icon: Package,
  },
  {
    label: "تعديل نظام الموقع",
    path: "/site-system",
    icon: Settings,
  },
  {
    label: "الإعدادات",
    path: "/settings",
    icon: Settings,
  },
];

const siteSystemChildren: NavigationItem[] = [
  {
    label: "الأدمنات الفرعية",
    path: "/sub-admins",
    icon: Users,
  },
  {
    label: "المناطق الجغرافية",
    path: "/geofencing",
    icon: Map,
  },
  {
    label: "التسعير",
    path: "/pricing",
    icon: DollarSign,
  },
  {
    label: "المحافظات والمناطق",
    path: "/locations",
    icon: Map,
  },
  {
    label: "شفتات الكباتن",
    path: "/captain-shifts",
    icon: ClipboardList,
  },
];

const settingsChildren: NavigationItem[] = [
  {
    label: "سجل الأمان",
    path: "/security-log",
    icon: ShieldAlert,
  },
  {
    label: "إصدارات التطبيق",
    path: "/app-versions",
    icon: Smartphone,
  },
  {
    label: "دعم سريع",
    path: "/complaints",
    icon: MessageSquareWarning,
  },
  {
    label: "التقارير",
    path: "/reports",
    icon: BarChart3,
  },
  {
    label: "الإشعارات",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "مركز الطوارئ والعمليات",
    path: "/operations-center",
    icon: ShieldAlert,
  },
  {
    label: "سجل العمليات",
    path: "/audit-logs",
    icon: BarChart3,
  },
  {
    label: "إعدادات التشغيل",
    path: "/operations-settings",
    icon: Settings,
  },
  {
    label: "إشعارات الأحداث",
    path: "/notification-rules",
    icon: Bell,
  },
];

const captainsChildren: NavigationItem[] = [
  {
    label: "تقييمات الكباتن",
    path: "/captain-ratings",
    icon: Users,
  },
  {
    label: "كشف حساب الكباتن",
    path: "/cash-accounting",
    icon: DollarSign,
  },
  {
    label: "حضور وانصراف الكباتن",
    path: "/captain-attendance",
    icon: ClipboardList,
  },
];


export default function AdminLayout({
  userName = "مدير عام",
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [captainsOpen, setCaptainsOpen] = useState(false);
  const [siteSystemOpen, setSiteSystemOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notificationCounts, setNotificationCounts] =
    useState({
      registrations: 0,
      emergencies: 0,
      notifications: 0,
      security: 0,
    });

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  async function loadNotificationCounts() {
    try {
      setNotificationLoading(true);

      const [
        captainRes,
        establishmentRes,
        notificationsRes,
        emergenciesRes,
        securityRes,
      ] = await Promise.all([
        api.get("/captain-registration"),
        api.get("/establishment-registration"),
        api.get("/notifications?limit=100"),
        api.get("/ops/emergencies"),
        api.get("/audit-logs?limit=100"),
      ]);

      const captainList =
        Array.isArray(captainRes.data?.captains)
          ? captainRes.data.captains
          : Array.isArray(captainRes.data?.data)
            ? captainRes.data.data
            : Array.isArray(captainRes.data)
              ? captainRes.data
              : [];

      const establishmentList =
        Array.isArray(
          establishmentRes.data?.registrations,
        )
          ? establishmentRes.data.registrations
          : Array.isArray(
              establishmentRes.data?.establishments,
            )
            ? establishmentRes.data.establishments
            : Array.isArray(
                establishmentRes.data?.data,
              )
              ? establishmentRes.data.data
              : Array.isArray(
                  establishmentRes.data,
                )
                ? establishmentRes.data
                : [];

      const notificationList =
        Array.isArray(
          notificationsRes.data?.notifications,
        )
          ? notificationsRes.data.notifications
          : Array.isArray(
              notificationsRes.data?.items,
            )
            ? notificationsRes.data.items
            : Array.isArray(
                notificationsRes.data?.data,
              )
              ? notificationsRes.data.data
              : Array.isArray(
                  notificationsRes.data,
                )
                ? notificationsRes.data
                : [];

      const emergencyList =
        Array.isArray(
          emergenciesRes.data?.emergencies,
        )
          ? emergenciesRes.data.emergencies
          : Array.isArray(
              emergenciesRes.data?.data,
            )
            ? emergenciesRes.data.data
            : Array.isArray(
                emergenciesRes.data,
              )
              ? emergenciesRes.data
              : [];

      const pendingRegistrations =
        captainList.filter(
          (item: any) =>
            String(item?.status || "")
              .toLowerCase() === "pending",
        ).length +
        establishmentList.filter(
          (item: any) =>
            String(item?.status || "")
              .toLowerCase() === "pending",
        ).length;

      const unreadNotifications =
        notificationList.filter(
          (item: any) =>
            item?.read === false ||
            item?.isRead === false ||
            item?.readAt == null &&
            item?.read !== true &&
            item?.isRead !== true,
        ).length;

      const securityList =
        Array.isArray(securityRes.data?.data?.items)
          ? securityRes.data.data.items
          : Array.isArray(securityRes.data?.items)
            ? securityRes.data.items
            : Array.isArray(securityRes.data?.data)
              ? securityRes.data.data
              : Array.isArray(securityRes.data)
                ? securityRes.data
                : [];

      const openEmergencies =
        emergencyList.filter(
          (item: any) =>
            !item?.resolvedAt &&
            String(
              item?.status || "",
            ).toLowerCase() !== "resolved" &&
            String(
              item?.state || "",
            ).toLowerCase() !== "resolved",
        ).length;

      setNotificationCounts({
        registrations: pendingRegistrations,
        emergencies: openEmergencies,
        notifications: unreadNotifications,
        security: securityList.length,
      });
    } catch {
      // لا نكسر الـNavbar إذا فشل أحد المسارات.
    } finally {
      setNotificationLoading(false);
    }
  }

  useEffect(() => {
    void loadNotificationCounts();

    const timer = window.setInterval(
      () => {
        void loadNotificationCounts();
      },
      10000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function logout() {
    try {
      await api.post("/auth/logout");
      setAccessToken(null);
    } finally {
      navigate("/", { replace: true });
    }
  }

  const sidebar = (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <img
          src="/logo.svg"
          alt="زاجل ديلفري"
          className="sidebar-logo"
        />
      </div>

      <div className="sidebar-section-title">
        القائمة
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;

          if (item.path === "/site-system") {
            return (
              <div
                key={item.path}
                className="sidebar-settings-group"
              >
                <div className="sidebar-settings-row">
                  <div
                    className="sidebar-link sidebar-settings-link"
                    style={{ cursor: "default" }}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.9}
                    />
                    <span>{item.label}</span>
                  </div>

                  <button
                    type="button"
                    className={`sidebar-submenu-toggle${
                      siteSystemOpen ? " open" : ""
                    }`}
                    onClick={() =>
                      setSiteSystemOpen((current) => !current)
                    }
                    aria-label={
                      siteSystemOpen
                        ? "إخفاء تعديل نظام الموقع"
                        : "إظهار تعديل نظام الموقع"
                    }
                  >
                    <ChevronDown
                      size={17}
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {siteSystemOpen ? (
                  <div className="sidebar-submenu">
                    {siteSystemChildren.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `sidebar-submenu-link${
                              isActive ? " active" : ""
                            }`
                          }
                        >
                          <ChildIcon
                            size={16}
                            strokeWidth={1.9}
                          />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          if (item.path === "/captains") {
            return (
              <div
                key={item.path}
                className="sidebar-settings-group"
              >
                <div className="sidebar-settings-row">
                  <NavLink
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `sidebar-link sidebar-settings-link${
                        isActive ? " active" : ""
                      }`
                    }
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.9}
                    />
                    <span>{item.label}</span>
                  </NavLink>

                  <button
                    type="button"
                    className={`sidebar-submenu-toggle${
                      captainsOpen ? " open" : ""
                    }`}
                    onClick={() =>
                      setCaptainsOpen((current) => !current)
                    }
                    aria-label={
                      captainsOpen
                        ? "إخفاء قائمة الكباتن"
                        : "إظهار قائمة الكباتن"
                    }
                  >
                    <ChevronDown
                      size={17}
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {captainsOpen ? (
                  <div className="sidebar-submenu">
                    {captainsChildren.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `sidebar-submenu-link${
                              isActive ? " active" : ""
                            }`
                          }
                        >
                          <ChildIcon
                            size={16}
                            strokeWidth={1.9}
                          />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          if (item.path === "/settings") {
            return (
              <div
                key={item.path}
                className="sidebar-settings-group"
              >
                <div className="sidebar-settings-row">
                  <NavLink
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `sidebar-link sidebar-settings-link${
                        isActive ? " active" : ""
                      }`
                    }
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.9}
                    />
                    <span>{item.label}</span>
                  </NavLink>

                  <button
                    type="button"
                    className={`sidebar-submenu-toggle${
                      settingsOpen ? " open" : ""
                    }`}
                    onClick={() =>
                      setSettingsOpen((current) => !current)
                    }
                    aria-label={
                      settingsOpen
                        ? "إخفاء قائمة الإعدادات"
                        : "إظهار قائمة الإعدادات"
                    }
                  >
                    <ChevronDown
                      size={17}
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {settingsOpen ? (
                  <div className="sidebar-submenu">
                    {settingsChildren.map((child) => {
                      const ChildIcon = child.icon;

                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `sidebar-submenu-link${
                              isActive ? " active" : ""
                            }`
                          }
                        >
                          <ChildIcon
                            size={16}
                            strokeWidth={1.9}
                          />
                          <span>{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <Icon
                size={19}
                strokeWidth={1.9}
              />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {userName.slice(0, 1)}
          </div>

          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {userName}
            </div>

            <div className="sidebar-user-role">
              مدير عام
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="sidebar-logout"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );

  return (
    <div className="admin-app" dir="rtl">
      <div className="desktop-sidebar">
        {sidebar}
      </div>

      {mobileOpen && (
        <div className="mobile-sidebar-layer">
          <button
            type="button"
            className="mobile-sidebar-overlay"
            aria-label="إغلاق القائمة"
            onClick={() => setMobileOpen(false)}
          />

          <div className="mobile-sidebar-panel">
            <button
              type="button"
              className="mobile-close"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>

            {sidebar}
          </div>
        </div>
      )}

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-topbar-spacer" />

          <div className="admin-notification-center">
            <button
              type="button"
              className="admin-notification-button"
              onClick={() =>
                setNotificationOpen(
                  (current) => !current,
                )
              }
              aria-label="الإشعارات"
            >
              <Bell size={21} strokeWidth={2} />

              {notificationCounts.registrations +
                notificationCounts.emergencies +
                notificationCounts.notifications +
                notificationCounts.security >
              0 ? (
                <span className="admin-notification-total">
                  {Math.min(
                    99,
                    notificationCounts.registrations +
                      notificationCounts.emergencies +
                      notificationCounts.notifications +
                      notificationCounts.security,
                  )}
                </span>
              ) : null}
            </button>

            {notificationOpen ? (
              <div className="admin-notification-menu">
                <div className="admin-notification-menu-head">
                  <strong>التنبيهات</strong>

                  {notificationLoading ? (
                    <span>...</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate("/registration-requests");
                  }}
                >
                  <span className="admin-notification-card-icon registration">
                    <FileCheck2 size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>طلبات التسجيل</strong>
                    <small>
                      كباتن + مطاعم ومحلات
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {notificationCounts.registrations}
                  </span>
                </button>

                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate("/operations-center");
                  }}
                >
                  <span className="admin-notification-card-icon emergency">
                    <ShieldAlert size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>الطوارئ</strong>
                    <small>
                      حالات تحتاج تدخل الإدارة
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {notificationCounts.emergencies}
                  </span>
                </button>

                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate("/notifications");
                  }}
                >
                  <span className="admin-notification-card-icon general">
                    <Bell size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>الإشعارات العامة</strong>
                    <small>
                      التنبيهات غير المقروءة
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {notificationCounts.notifications}
                  </span>
                </button>

                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate("/security-log");
                  }}
                >
                  <span className="admin-notification-card-icon security">
                    <ShieldCheck size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>سجل الأمان</strong>
                    <small>
                      العمليات الإدارية والأحداث الأمنية
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {notificationCounts.security}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
