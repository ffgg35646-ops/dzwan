export type AdminPageOption = {
  label: string;
  path: string;
};

export type AdminPageGroup = {
  label: string;
  items: AdminPageOption[];
};

export const ADMIN_PAGE_GROUPS: AdminPageGroup[] = [
  {
    label: "الصفحات الرئيسية",
    items: [
      { label: "الرئيسية", path: "/dashboard" },
      { label: "الطلبات", path: "/orders" },
      { label: "الكباتن", path: "/captains" },
      { label: "طلبات التسجيل", path: "/registration-requests" },
      { label: "المطاعم والمحلات", path: "/establishments" },
      { label: "القادة", path: "/leaders" },
      { label: "الإعدادات", path: "/settings" },
    ],
  },
  {
    label: "تعديل نظام الموقع",
    items: [
      { label: "الأدمنات الفرعية", path: "/sub-admins" },
      { label: "المناطق الجغرافية", path: "/geofencing" },
      { label: "التسعير", path: "/pricing" },
      { label: "المحافظات والمناطق", path: "/locations" },
      { label: "شفتات الكباتن", path: "/captain-shifts" },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { label: "سجل الأمان", path: "/security-log" },
      { label: "إصدارات التطبيق", path: "/app-versions" },
      { label: "دعم سريع", path: "/complaints" },
      { label: "التقارير", path: "/reports" },
      { label: "الإشعارات", path: "/notifications" },
      { label: "مركز الطوارئ والعمليات", path: "/operations-center" },
      { label: "سجل العمليات", path: "/audit-logs" },
      { label: "إعدادات التشغيل", path: "/operations-settings" },
    ],
  },
  {
    label: "صفحات الكباتن",
    items: [
      { label: "تقييمات الكباتن", path: "/captain-ratings" },
      { label: "كشف حساب الكباتن", path: "/cash-accounting" },
      { label: "حضور وانصراف الكباتن", path: "/captain-attendance" },
    ],
  },
];

export const ADMIN_PAGE_OPTIONS = ADMIN_PAGE_GROUPS.flatMap(
  (group) => group.items,
);

export function pagePermission(path: string): string {
  return `page:${path}`;
}
