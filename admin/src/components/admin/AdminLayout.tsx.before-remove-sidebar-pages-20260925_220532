import { useEffect, useState, useRef } from "react";
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

  const [supportTicketCount, setSupportTicketCount] = useState(0);

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  const [adminNotifications, setAdminNotifications] =
    useState<any[]>([]);

  const [adminEmergencies, setAdminEmergencies] =
    useState<any[]>([]);

  const [adminSecurityItems, setAdminSecurityItems] =
    useState<any[]>([]);

  const [newNotificationCount, setNewNotificationCount] =
    useState(0);

  // العناصر التي شاهدها مدير الإدارة بالفعل.
  const BELL_SEEN_KEY =
    "dzwan_admin_bell_seen_v5";

  const BELL_INITIALIZED_KEY =
    "dzwan_admin_bell_initialized_v5";

  function getBellItemKey(
    type:
      | "notification"
      | "emergency"
      | "security",
    item: any,
  ) {
    const id =
      item?._id ??
      item?.id ??
      item?.notificationId ??
      item?.emergencyId;

    if (
      id != null &&
      String(id).trim() !== ""
    ) {
      return `${type}:${String(id)}`;
    }

    const fallback =
      item?.createdAt ??
      item?.updatedAt ??
      item?.title ??
      item?.message ??
      item?.reason ??
      item?.description;

    if (fallback == null) {
      return null;
    }

    return `${type}:fallback:${String(fallback)}`;
  }

  function getSeenBellKeys(): Set<string> {
    try {
      const raw =
        localStorage.getItem(
          BELL_SEEN_KEY,
        );

      const parsed =
        raw ? JSON.parse(raw) : [];

      return new Set<string>(
        Array.isArray(parsed)
          ? parsed.filter(
              (value): value is string =>
                typeof value === "string",
            )
          : [],
      );
    } catch {
      return new Set<string>();
    }
  }

  function saveSeenBellKeys(
    keys: Set<string>,
  ) {
    try {
      localStorage.setItem(
        BELL_SEEN_KEY,
        JSON.stringify(
          Array.from(keys),
        ),
      );
    } catch {
      // لا نكسر الـNavbar بسبب localStorage.
    }
  }

  async function markAllBellItemsSeen() {
    const seenKeys =
      getSeenBellKeys();

    for (
      const item of adminNotifications
    ) {
      const key =
        getBellItemKey(
          "notification",
          item,
        );

      if (key) {
        seenKeys.add(key);
      }
    }

    for (
      const item of adminEmergencies
    ) {
      const key =
        getBellItemKey(
          "emergency",
          item,
        );

      if (key) {
        seenKeys.add(key);
      }
    }

    for (
      const item of adminSecurityItems
    ) {
      const key =
        getBellItemKey(
          "security",
          item,
        );

      if (key) {
        seenKeys.add(key);
      }
    }

    saveSeenBellKeys(
      seenKeys,
    );

    // تصفير الرقم الأحمر على الجرس فور فتحه.
    setNewNotificationCount(0);

    // نحاول تعليم الإشعارات العامة كمقروءة في الباك إند.
    const unreadIds =
      adminNotifications
        .filter(
          (item: any) =>
            item?.read !== true &&
            item?.isRead !== true &&
            item?.readAt == null,
        )
        .map(
          (item: any) =>
            item?._id ||
            item?.id,
        )
        .filter(Boolean);

    await Promise.allSettled(
      unreadIds.map(
        (id) =>
          api.patch(
            `/notifications/${id}/read`,
          ),
      ),
    );

    if (unreadIds.length > 0) {
      setAdminNotifications(
        (current) =>
          current.map(
            (item: any) => ({
              ...item,
              read: true,
              isRead: true,
              readAt:
                item?.readAt ||
                new Date().toISOString(),
            }),
          ),
      );
    }
  }


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
        Array.isArray(
          captainRes.data?.captains,
        )
          ? captainRes.data.captains
          : Array.isArray(
              captainRes.data?.data,
            )
            ? captainRes.data.data
            : Array.isArray(
                captainRes.data,
              )
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
              emergenciesRes.data?.data?.emergencies,
            )
            ? emergenciesRes.data.data.emergencies
            : Array.isArray(
                emergenciesRes.data?.data?.items,
            )
              ? emergenciesRes.data.data.items
              : Array.isArray(
                  emergenciesRes.data?.data,
                )
                ? emergenciesRes.data.data
                : Array.isArray(
                    emergenciesRes.data,
                  )
                  ? emergenciesRes.data
                  : [];

      const securityList =
        Array.isArray(
          securityRes.data?.data?.items,
        )
          ? securityRes.data.data.items
          : Array.isArray(
              securityRes.data?.items,
            )
            ? securityRes.data.items
            : Array.isArray(
                securityRes.data?.data,
              )
              ? securityRes.data.data
              : Array.isArray(
                  securityRes.data,
                )
                ? securityRes.data
                : [];

      const pendingRegistrations =
        captainList.filter(
          (item: any) =>
            String(
              item?.status || "",
            ).toLowerCase() ===
            "pending",
        ).length +
        establishmentList.filter(
          (item: any) =>
            String(
              item?.status || "",
            ).toLowerCase() ===
            "pending",
        ).length;

      setAdminNotifications(
        notificationList,
      );

      setAdminEmergencies(
        emergencyList,
      );

      setAdminSecurityItems(
        securityList,
      );

      const notificationKeys =
        notificationList
          .map(
            (item: any) =>
              getBellItemKey(
                "notification",
                item,
              ),
          )
          .filter(
            (key: string): key is string =>
              Boolean(key),
          );

      const emergencyKeys =
        emergencyList
          .map(
            (item: any) =>
              getBellItemKey(
                "emergency",
                item,
              ),
          )
          .filter(
            (key: string): key is string =>
              Boolean(key),
          );

      const securityKeys =
        securityList
          .map(
            (item: any) =>
              getBellItemKey(
                "security",
                item,
              ),
          )
          .filter(
            (key: string): key is string =>
              Boolean(key),
          );

      const currentKeys = [
        ...notificationKeys,
        ...emergencyKeys,
        ...securityKeys,
      ];

      const seenKeys =
        getSeenBellKeys();

      const initialized =
        localStorage.getItem(
          BELL_INITIALIZED_KEY,
        ) === "1";

      let newNormalCount = 0;
      let newEmergencyCount = 0;
      let newSecurityCount = 0;

      if (!initialized) {
        // كل الموجود عند أول تشغيل قديم.
        for (
          const key of currentKeys
        ) {
          seenKeys.add(key);
        }

        saveSeenBellKeys(
          seenKeys,
        );

        localStorage.setItem(
          BELL_INITIALIZED_KEY,
          "1",
        );
      } else {
        newNormalCount =
          notificationKeys.filter(
            (key: string) =>
              !seenKeys.has(key),
          ).length;

        newEmergencyCount =
          emergencyKeys.filter(
            (key: string) =>
              !seenKeys.has(key),
          ).length;

        newSecurityCount =
          securityKeys.filter(
            (key: string) =>
              !seenKeys.has(key),
          ).length;
      }

      setNewNotificationCount(
        newNormalCount +
          newEmergencyCount +
          newSecurityCount,
      );

      setNotificationCounts({
        registrations:
          pendingRegistrations,

        // عدد حالات الطوارئ الموجودة فعليًا في البيانات.
        // هذا مستقل عن عدد الطوارئ الجديدة التي تدخل في
        // الرقم الأحمر فوق الجرس.
        emergencies:
          emergencyList.length,

        // عدد الإشعارات الموجودة فعليًا.
        notifications:
          notificationList.length,

        // عدد أحداث سجل الأمان الموجودة فعليًا.
        security:
          securityList.length,
      });
    } catch {
      // لا نكسر الـNavbar إذا فشل أحد المسارات.
    } finally {
      setNotificationLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadSupportTicketCount() {
      try {
        const response = await api.get(
          "/support-tickets/admin/unread-count",
        );

        const count = Number(
          response.data?.count ??
          response.data?.unreadCount ??
          response.data?.total ??
          0,
        );

        if (mounted) {
          setSupportTicketCount(
            Number.isFinite(count) && count > 0 ? count : 0,
          );
        }
      } catch {
        if (mounted) {
          setSupportTicketCount(0);
        }
      }
    }

    void loadSupportTicketCount();

    const timer = window.setInterval(
      () => void loadSupportTicketCount(),
      10000,
    );

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }
, []);

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
        <div
          style={{
            position: "relative",
            width: "100%",
            minHeight: 92,
            borderRadius: 20,
            padding: "14px 16px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(145deg,#FFF7ED 0%,#FFFFFF 52%,#FFEDD5 100%)",
            border: "1px solid #FDBA74",
            boxShadow:
              "0 12px 28px rgba(234,88,12,.16)",
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: 74,
              height: 74,
              borderRadius: "50%",
              background: "#FED7AA",
              top: -28,
              right: -22,
              opacity: 0.8,
            }}
          />

          <span
            style={{
              position: "absolute",
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "2px solid #FDBA74",
              bottom: -16,
              left: -10,
              transform: "rotate(18deg)",
              opacity: 0.8,
            }}
          />

          <span
            style={{
              position: "relative",
              zIndex: 2,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 150,
              minHeight: 52,
              padding: "0 26px",
              borderRadius: 16,
              background:
                "linear-gradient(135deg,#EA580C,#F97316)",
              color: "#FFFFFF",
              fontSize: 27,
              fontWeight: 950,
              letterSpacing: "-0.5px",
              boxShadow:
                "0 10px 22px rgba(234,88,12,.26), inset 0 1px 0 rgba(255,255,255,.24)",
              border: "1px solid rgba(194,65,12,.25)",
            }}
          >
            زاجل
          </span>
        </div>
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

// SUPPORT_BELL_COUNT_FIX
  useEffect(() => {
    let mounted = true;

    async function loadOpenSupportTickets() {
      try {
        const response = await api.get(
          "/support-tickets?status=open",
        );

        const tickets = Array.isArray(
          response.data?.tickets,
        )
          ? response.data.tickets
          : [];

        if (mounted) {
          setSupportTicketCount(tickets.length);
        }
      } catch (error) {
        console.error(
          "Support bell count error:",
          error,
        );

        if (mounted) {
          setSupportTicketCount(0);
        }
      }
    }

    void loadOpenSupportTickets();

    const timer = window.setInterval(
      () => void loadOpenSupportTickets(),
      10000,
    );

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const adminMainRef = useRef<HTMLDivElement>(null);
  const [scrollThumbTop, setScrollThumbTop] = useState(0);
  const [scrollThumbHeight, setScrollThumbHeight] = useState(220);
  const scrollbarDraggingRef = useRef(false);
  const scrollbarDragStartYRef = useRef(0);
  const scrollbarDragStartScrollTopRef = useRef(0);

  const handleScrollbarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = adminMainRef.current;
    if (!el) return;

    scrollbarDraggingRef.current = true;
    scrollbarDragStartYRef.current = e.clientY;
    scrollbarDragStartScrollTopRef.current = el.scrollTop;

    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
    e.preventDefault();
  };

  const handleScrollbarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrollbarDraggingRef.current) return;

    const el = adminMainRef.current;
    if (!el) return;

    const trackHeight = el.clientHeight;
    const thumbHeight = scrollThumbHeight;
    const movableTrack = Math.max(1, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);

    // حركة الماوس تتحول مباشرة إلى حركة الصفحة
    const mouseDelta = e.clientY - scrollbarDragStartYRef.current;
    const scrollRatio = maxScroll / movableTrack;

    el.scrollTop =
      scrollbarDragStartScrollTopRef.current +
      mouseDelta * scrollRatio;
  };

  const handleScrollbarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    scrollbarDraggingRef.current = false;

    e.currentTarget.style.cursor = "grab";

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    const el = adminMainRef.current;
    if (!el) return;

    const updateScrollbar = () => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      const trackHeight = el.clientHeight;

      if (maxScroll <= 0) {
        setScrollThumbTop(0);
        setScrollThumbHeight(trackHeight);
        return;
      }

      /* مقبض كبير وواضح */
      const height = Math.max(
        220,
        Math.min(
          trackHeight * 0.45,
          (el.clientHeight / el.scrollHeight) * trackHeight
        )
      );

      const maxTop = trackHeight - height;
      const top = (el.scrollTop / maxScroll) * maxTop;

      setScrollThumbHeight(height);
      setScrollThumbTop(top);
    };

    updateScrollbar();

    el.addEventListener("scroll", updateScrollbar, { passive: true });
    window.addEventListener("resize", updateScrollbar);

    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
      observer.disconnect();
    };
  }, []);

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

      <div className="admin-main" ref={adminMainRef}>

        <div
          className="custom-admin-scrollbar"
          aria-hidden="true"
        >
          <div
            className="custom-admin-scrollbar-thumb"
            style={{
              height: `${scrollThumbHeight}px`,
              transform: `translateY(${scrollThumbTop}px)`,
              pointerEvents: "auto",
              cursor: "grab",
              touchAction: "none",
              userSelect: "none",
            }}
            onPointerDown={handleScrollbarPointerDown}
            onPointerMove={handleScrollbarPointerMove}
            onPointerUp={handleScrollbarPointerUp}
            onPointerCancel={handleScrollbarPointerUp}
          />
        </div>
        <div className="admin-topbar">
          <div className="admin-topbar-spacer" />

          <div className="admin-notification-center">
            <button
              type="button"
              className="admin-notification-button"
              onClick={() => {
                if (!notificationOpen) {
                  void markAllBellItemsSeen();
                }

                setNotificationOpen(
                  (current) => !current,
                );
              }}
              aria-label="الإشعارات"
            >
              <Bell
                size={21}
                strokeWidth={2}
              />

              {newNotificationCount > 0 ? (
                <span className="admin-notification-total">
                  {Math.min(
                    99,
                    newNotificationCount,
                  )}
                </span>
              ) : null}
            </button>

            {notificationOpen ? (
              <div className="admin-notification-menu">
                <div className="admin-notification-menu-head">
                  <strong>
                    التنبيهات
                  </strong>

                  {notificationLoading ? (
                    <span>...</span>
                  ) : null}
                </div>

                {/* طلبات التسجيل */}
                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate(
                      "/registration-requests",
                    );
                  }}
                >
                  <span className="admin-notification-card-icon registration">
                    <FileCheck2 size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>
                      طلبات التسجيل
                    </strong>

                    <small>
                      كباتن + مطاعم ومحلات
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {
                      notificationCounts.registrations
                    }
                  </span>
                </button>

                {/* دعم سريع — مستقل */}
                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    setNotificationOpen(false);
                    navigate(
                      "/complaints",
                    );
                  }}
                >
                  <span className="admin-notification-card-icon emergency">
                    <ShieldAlert size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>
                      دعم سريع
                    </strong>

                    <small>
                      حالات تحتاج تدخل الإدارة
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {supportTicketCount}
                  </span>
                </button>

                {/* طوارئ الكباتن */}
                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    void markAllBellItemsSeen();
                    setNotificationOpen(false);
                    navigate(
                      "/operations-center?filter=emergencies",
                    );
                  }}
                >
                  <span className="admin-notification-card-icon emergency">
                    <ShieldAlert size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>
                      طوارئ الكباتن
                    </strong>

                    <small>
                      الطوارئ القادمة من تطبيق الكابتن
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {
                      notificationCounts.emergencies
                    }
                  </span>
                </button>

                {/* الإشعارات العامة */}
                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    void markAllBellItemsSeen();
                    setNotificationOpen(false);
                    navigate(
                      "/notifications",
                    );
                  }}
                >
                  <span className="admin-notification-card-icon general">
                    <Bell size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>
                      الإشعارات العامة
                    </strong>

                    <small>
                      جميع الإشعارات المرسلة للإدارة
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {
                      notificationCounts.notifications
                    }
                  </span>
                </button>

                {/* سجل الأمان */}
                <button
                  type="button"
                  className="admin-notification-card"
                  onClick={() => {
                    void markAllBellItemsSeen();
                    setNotificationOpen(false);
                    navigate(
                      "/security-log",
                    );
                  }}
                >
                  <span className="admin-notification-card-icon security">
                    <ShieldCheck size={18} />
                  </span>

                  <span className="admin-notification-card-body">
                    <strong>
                      سجل الأمان
                    </strong>

                    <small>
                      العمليات الإدارية والأحداث الأمنية
                    </small>
                  </span>

                  <span className="admin-notification-count">
                    {
                      notificationCounts.security
                    }
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
