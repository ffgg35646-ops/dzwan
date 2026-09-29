import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  Users,
  X,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { api } from "../../lib/api";

interface AdminLayoutProps {
  children: ReactNode;
  userName: string;
}

const navigation = [
  { label: "الرئيسية", path: "/dashboard", icon: LayoutDashboard },
  { label: "الطلبات", path: "/orders", icon: Package },
  { label: "الكباتن", path: "/captains", icon: Users },
  { label: "المطاعم والمحلات", path: "/establishments", icon: ShoppingBag },
  { label: "المحافظات والمناطق", path: "/locations", icon: Map },
  { label: "التسعير", path: "/products", icon: DollarSign },
  { label: "التقارير", path: "/dashboard", icon: BarChart3 },
  { label: "الإعدادات", path: "/dashboard", icon: Settings },
];

export default function AdminLayout({
  children,
  userName,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      navigate("/", { replace: true });
    }
  }

  const sidebar = (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <img src="/logo.svg" alt="دزوان" className="sidebar-logo" />
      </div>

      <div className="sidebar-section-title">
        القائمة
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.9} />
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

        <header className="admin-header">
          <div className="header-right">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div>
              <div className="header-kicker">
                منصة دزوان
              </div>

              <div className="header-title">
                لوحة التحكم
              </div>
            </div>
          </div>

          <div className="header-left">
            <button
              type="button"
              className="notification-button"
              title="الإشعارات"
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <button
              type="button"
              className="profile-button"
            >
              <span className="profile-avatar">
                {userName.slice(0, 1)}
              </span>

              <span className="profile-name">
                {userName}
              </span>

              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>

      </div>
    </div>
  );
}
