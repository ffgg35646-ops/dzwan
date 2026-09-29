import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
} from "lucide-react";
import { api, getApiErrorMessage } from "../lib/api";
import HomeBackButton from "../components/admin/HomeBackButton";
type Establishment = Record<string, any>;

function unwrap(data: any) {
  return data?.data ?? data?.establishment ?? data;
}

function text(value: any, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value?.fullName ?? value?.name ?? value?.title ?? value?._id ?? fallback;
  return String(value);
}

export default function EstablishmentDetails() {
  const { id } = useParams();
  const [item, setItem] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/establishments/${id}`);
        if (mounted) setItem(unwrap(response.data));
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
  }, [id]);

  if (loading) return <div className="page-loading"><Loader2 className="spin" size={22} /> جاري تحميل بيانات المنشأة...</div>;

  if (error || !item) {
    return <div className="page-state"><p>{error || "المنشأة غير موجودة."}</p><Link to="/establishments">العودة إلى المنشآت</Link></div>;
  }

  return (
    <div className="page">

      <HomeBackButton />
      <div className="page-header">
        <div>
          <Link to="/establishments" className="back-link"><ArrowRight size={18} /> العودة إلى المنشآت</Link>
          <h1>تفاصيل المنشأة</h1>
        </div>
      </div>

      <section className="details-card">
        <h2>البيانات الأساسية</h2>
        <div className="details-grid">
          <div><strong>الاسم</strong><span>{text(item.name ?? item.title)}</span></div>
          <div><strong>الحالة</strong><span>{text(item.status)}</span></div>
          <div><strong>الهاتف</strong><span>{text(item.phone)}</span></div>
          <div><strong>البريد الإلكتروني</strong><span>{text(item.email)}</span></div>
          <div><strong>المالك</strong><span>{text(item.ownerId ?? item.owner)}</span></div>
          <div><strong>المحافظة</strong><span>{text(item.governorateId ?? item.governorate)}</span></div>
          <div><strong>المنطقة</strong><span>{text(item.areaId ?? item.area)}</span></div>
          <div><strong>العنوان</strong><span>{text(item.address)}</span></div>
          <div><strong>تاريخ الإنشاء</strong><span>{item.createdAt ? new Date(item.createdAt).toLocaleString("ar-EG") : "—"}</span></div>
          <div><strong>آخر تحديث</strong><span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString("ar-EG") : "—"}</span></div>
        </div>
      </section>
    </div>
  );
}
