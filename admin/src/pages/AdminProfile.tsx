import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  UserRound,
  Mail,
  Phone,
  ShieldCheck,
  Activity,
  CalendarDays,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";

type Profile = Record<string, any>;

function unwrap(data: any) {
  return data?.data ?? data?.user ?? data;
}

function text(value: any, fallback = "—") {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}

function formatDate(value: any) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("ar-EG-u-nu-latn");
}

export default function AdminProfile() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response =
          await api.get("/auth/me");

        if (mounted) {
          setProfile(
            unwrap(response.data),
          );
        }
      } catch (err) {
        if (mounted) {
          setError(
            getApiErrorMessage(err),
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2
          className="spin"
          size={22}
        />
        جاري تحميل الملف الشخصي...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-state">
        <p>
          {error ||
            "تعذر تحميل الملف الشخصي."}
        </p>

        <Link to="/dashboard">
          العودة إلى لوحة التحكم
        </Link>
      </div>
    );
  }

  const online = Boolean(
    profile.isOnline,
  );

  return (
    <div
      className="admin-app admin-profile-page"
      dir="rtl"
    >
      <main className="admin-main">
<div className="admin-content">
          <HomeBackButton />

          <div className="dashboard">
            <section className="dashboard-intro profile-hero">
              <div>
                <Link
                  to="/dashboard"
                  className="back-link"
                >
                  <ArrowRight size={17} />
                  العودة إلى لوحة التحكم
                </Link>

                <span className="dashboard-label">
                  الحساب الإداري
                </span>

                <h1>
                  {text(
                    profile.fullName ??
                      profile.name,
                    "مدير النظام",
                  )}
                </h1>

                <p>
                  معلومات الحساب والصلاحيات والحالة
                  الحالية.
                </p>
              </div>

              <div className="profile-avatar">
                <UserRound size={30} />
              </div>
            </section>

            <section className="profile-overview">
              <div className="profile-main-card">
                <div className="profile-main-avatar">
                  <UserRound size={30} />
                </div>

                <div className="profile-main-info">
                  <strong>
                    {text(
                      profile.fullName ??
                        profile.name,
                    )}
                  </strong>

                  <span>
                    {text(profile.email)}
                  </span>

                  <div className="profile-badges">
                    <span className="profile-role-badge">
                      <ShieldCheck size={14} />
                      {text(profile.role)}
                    </span>

                    <span
                      className={
                        online
                          ? "profile-online-badge"
                          : "profile-offline-badge"
                      }
                    >
                      <Activity size={13} />
                      {online
                        ? "متصل حاليًا"
                        : "غير متصل"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-status-card">
                <span>حالة الحساب</span>

                <strong>
                  {text(profile.status)}
                </strong>

                <small>
                  حالة الحساب الحالية في النظام
                </small>
              </div>
            </section>

            <section className="details-card profile-details-card">
              <div className="profile-section-heading">
                <div className="profile-section-icon">
                  <UserRound size={18} />
                </div>

                <div>
                  <h2>بيانات الحساب</h2>
                  <p>
                    البيانات الأساسية المرتبطة
                    بالحساب الإداري.
                  </p>
                </div>
              </div>

              <div className="details-grid profile-details-grid">
                <div>
                  <strong>الاسم</strong>
                  <span>
                    {text(
                      profile.fullName ??
                        profile.name,
                    )}
                  </span>
                </div>

                <div>
                  <strong>
                    البريد الإلكتروني
                  </strong>
                  <span>
                    {text(profile.email)}
                  </span>
                </div>

                <div>
                  <strong>الهاتف</strong>
                  <span>
                    {text(profile.phone)}
                  </span>
                </div>

                <div>
                  <strong>الدور</strong>
                  <span>
                    {text(profile.role)}
                  </span>
                </div>

                <div>
                  <strong>الحالة</strong>
                  <span>
                    {text(profile.status)}
                  </span>
                </div>

                <div>
                  <strong>متصل حاليًا</strong>
                  <span>
                    {online ? "نعم" : "لا"}
                  </span>
                </div>
              </div>
            </section>

            <section className="details-card profile-details-card">
              <div className="profile-section-heading">
                <div className="profile-section-icon">
                  <CalendarDays size={18} />
                </div>

                <div>
                  <h2>النشاط والتواريخ</h2>
                  <p>
                    معلومات الدخول وإنشاء الحساب.
                  </p>
                </div>
              </div>

              <div className="profile-date-grid">
                <div>
                  <span>آخر دخول</span>
                  <strong>
                    {formatDate(
                      profile.lastLoginAt,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    تاريخ إنشاء الحساب
                  </span>
                  <strong>
                    {formatDate(
                      profile.createdAt,
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="profile-contact-grid">
              <div className="profile-contact-card">
                <Mail size={18} />
                <div>
                  <span>البريد</span>
                  <strong>
                    {text(profile.email)}
                  </strong>
                </div>
              </div>

              <div className="profile-contact-card">
                <Phone size={18} />
                <div>
                  <span>الهاتف</span>
                  <strong>
                    {text(profile.phone)}
                  </strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
