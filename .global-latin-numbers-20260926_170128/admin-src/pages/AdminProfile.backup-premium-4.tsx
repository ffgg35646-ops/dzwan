import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";
type Profile = Record<string, any>;

function unwrap(data: any) {
  return data?.data ?? data?.user ?? data;
}

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function AdminProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await api.get("/auth/me");
        if (mounted) setProfile(unwrap(response.data));
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="page-loading"><Loader2 className="spin" size={22} /> جاري تحميل الملف الشخصي...</div>;

  if (error || !profile) {
    return <div className="page-state"><p>{error || "تعذر تحميل الملف الشخصي."}</p><Link to="/dashboard">العودة إلى لوحة التحكم</Link></div>;
  }

  return (
    <div className="page">

      <HomeBackButton />
      <div className="page-header">
        <div>
          <Link to="/dashboard" className="back-link"><ArrowRight size={18} /> العودة إلى لوحة التحكم</Link>
          <h1>الملف الشخصي</h1>
        </div>
      </div>

      <section className="details-card">
        <h2>بيانات الحساب</h2>
        <div className="details-grid">
          <div><strong>الاسم</strong><span>{text(profile.fullName ?? profile.name)}</span></div>
          <div><strong>البريد الإلكتروني</strong><span>{text(profile.email)}</span></div>
          <div><strong>الهاتف</strong><span>{text(profile.phone)}</span></div>
          <div><strong>الدور</strong><span>{text(profile.role)}</span></div>
          <div><strong>الحالة</strong><span>{text(profile.status)}</span></div>
          <div><strong>متصل حاليًا</strong><span>{profile.isOnline ? "نعم" : "لا"}</span></div>
          <div><strong>آخر دخول</strong><span>{profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString("ar-EG-u-nu-latn") : "—"}</span></div>
          <div><strong>تاريخ إنشاء الحساب</strong><span>{profile.createdAt ? new Date(profile.createdAt).toLocaleString("ar-EG-u-nu-latn") : "—"}</span></div>
        </div>
      </section>
    </div>
  );
}
