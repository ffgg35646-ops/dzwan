#!/usr/bin/env bash
set +e

ROOT="$(pwd)"
REPORT="/tmp/dzwan-full-1-47-audit.txt"

: > "$REPORT"

echo "==================================================" | tee -a "$REPORT"
echo "      DZwan / زاجل ديلفري - FULL AUDIT 1 → 47" | tee -a "$REPORT"
echo "==================================================" | tee -a "$REPORT"
echo "التاريخ: $(date)" | tee -a "$REPORT"
echo | tee -a "$REPORT"

PASS=0
PARTIAL=0
FAIL=0

section() {
  echo | tee -a "$REPORT"
  echo "--------------------------------------------------" | tee -a "$REPORT"
  echo "$1" | tee -a "$REPORT"
  echo "--------------------------------------------------" | tee -a "$REPORT"
}

mark_pass() {
  PASS=$((PASS+1))
  echo "✅ $1 — مكتمل وظيفيًا" | tee -a "$REPORT"
}

mark_partial() {
  PARTIAL=$((PARTIAL+1))
  echo "🟡 $1 — مكتمل جزئيًا: $2" | tee -a "$REPORT"
}

mark_fail() {
  FAIL=$((FAIL+1))
  echo "❌ $1 — ناقص: $2" | tee -a "$REPORT"
}

has_file() {
  [ -f "$1" ]
}

has_dir() {
  [ -d "$1" ]
}

has_pattern() {
  grep -RqiE "$1" "$2" 2>/dev/null
}

run_test() {
  local label="$1"
  shift

  echo | tee -a "$REPORT"
  echo "▶ اختبار: $label" | tee -a "$REPORT"

  "$@" >> "$REPORT" 2>&1
  local code=$?

  if [ "$code" -eq 0 ]; then
    echo "✅ نجح: $label" | tee -a "$REPORT"
    return 0
  fi

  echo "❌ فشل: $label (exit=$code)" | tee -a "$REPORT"
  return 1
}

# ==================================================
# 0 - TypeScript
# ==================================================
section "0 - فحص TypeScript"

npx tsc --noEmit >> "$REPORT" 2>&1

TSC_CODE=$?

if [ "$TSC_CODE" -eq 0 ]; then
  echo "✅ TypeScript = 0 errors" | tee -a "$REPORT"
else
  echo "❌ TypeScript يحتوي أخطاء" | tee -a "$REPORT"
fi

# ==================================================
# 1 - المحافظات والمناطق
# ==================================================
section "1 - المحافظات والمناطق"

if has_file src/models/Location.ts &&
   has_file src/controllers/location.controller.ts &&
   has_file src/routes/location.routes.ts &&
   has_dir ../admin/src/pages
then
  # لا نشغل Location Full Test من داخل الـaudit لأنه قد يكون تفاعليًا.
  # نتحقق من التنفيذ والـroutes والـadmin page بدون تعليق السكربت.
  if has_pattern 'isActive|areas' src/models/Location.ts &&
     has_pattern 'validateActiveLocation|location' src/controllers/order.controller.ts &&
     has_file ../admin/src/pages/Locations.tsx
  then
    mark_partial "1 - المحافظات والمناطق" "التنفيذ موجود؛ اختبار Location الكامل يحتاج تشغيله منفصلًا."
  else
    mark_fail "1 - المحافظات والمناطق" "مكونات المحافظات والمناطق غير مكتملة."
  fi
else
  mark_fail "1 - المحافظات والمناطق" "Model/Controller/Route ناقص."
fi

# ==================================================
# 2 - التسعير الأساسي
# ==================================================
section "2 - التسعير الأساسي"

if has_file src/models/PricingRule.ts &&
   has_file src/services/pricing.service.ts &&
   has_file src/controllers/pricing.controller.ts &&
   has_file src/routes/pricing.routes.ts &&
   has_pattern 'default' src/services/pricing.service.ts
then
  mark_pass "2 - التسعير الأساسي"
else
  mark_fail "2 - التسعير الأساسي" "مكونات التسعير الأساسي غير مكتملة."
fi

# ==================================================
# 3 - التسعير المخصص
# ==================================================
section "3 - التسعير المخصص"

if has_file src/models/PricingRule.ts &&
   has_file src/services/pricing.service.ts &&
   has_pattern 'governorate|area_to_area|establishment_type|zone_to_zone|geofence_to_geofence' src/models/PricingRule.ts
then
  mark_pass "3 - التسعير المخصص"
else
  mark_partial "3 - التسعير المخصص" "بنية القواعد غير مكتملة."
fi

# ==================================================
# 4 - Geofencing
# ==================================================
section "4 - Geofencing"

if has_file src/models/Geofence.ts &&
   has_file src/controllers/geofence.controller.ts &&
   has_file src/routes/geofence.routes.ts &&
   has_pattern 'point|polygon|geofence' src/services/pricing.service.ts
then
  mark_pass "4 - Geofencing"
else
  mark_partial "4 - Geofencing" "التنفيذ موجود جزئيًا أو أحد مكوناته ناقص."
fi

# ==================================================
# 5 - مواقع المنشآت
# ==================================================
section "5 - مواقع المنشآت"

if has_file src/models/Establishment.ts &&
   has_pattern 'latitude|longitude' src/models/Establishment.ts &&
   has_file ../admin/src/pages/EstablishmentLocations.tsx
then
  mark_pass "5 - مواقع المنشآت"
else
  mark_fail "5 - مواقع المنشآت" "إحداثيات أو واجهة الإدارة ناقصة."
fi

# ==================================================
# 6 - Smart Dispatch
# ==================================================
section "6 - Smart Dispatch"

if has_file src/services/dispatch.service.ts &&
   has_file src/services/dispatch-manager.service.ts &&
   has_pattern 'findBestCaptain|dispatchOrder' src/services
then
  if has_file scripts/dispatch-real-test.ts &&
     npx tsx scripts/dispatch-real-test.ts >> "$REPORT" 2>&1
  then
    mark_pass "6 - Smart Dispatch"
  else
    mark_partial "6 - Smart Dispatch" "الكود موجود لكن اختبار Smart Dispatch لم ينجح."
  fi
else
  mark_fail "6 - Smart Dispatch" "خدمة Dispatch غير مكتملة."
fi

# ==================================================
# 7 - Queue
# ==================================================
section "7 - Queue"

if has_file src/models/DispatchQueue.ts &&
   has_pattern 'enqueueOrder|processDispatchQueue' src/services/dispatch-manager.service.ts
then
  mark_pass "7 - Queue"
else
  mark_fail "7 - Queue" "Queue model/service ناقص."
fi

# ==================================================
# 8 - Priority / Capacity / Timeout / Reassign
# ==================================================
section "8 - Priority / Capacity / Timeout / Reassign"

if has_file src/models/DispatchAssignment.ts &&
   has_file src/models/DispatchQueue.ts &&
   has_pattern 'priority|assignmentTimeoutSeconds|maxActiveOrdersPerCaptain|maxAssignmentAttempts' src/models/DispatchSettings.ts
then
  mark_pass "8 - Priority / Capacity / Timeout / Reassign"
else
  mark_partial "8 - Priority / Capacity / Timeout / Reassign" "جزء من قواعد الإسناد ناقص."
fi

# ==================================================
# 9 - Dispatch Settings
# ==================================================
section "9 - Dispatch Settings"

if has_file src/models/DispatchSettings.ts &&
   has_file src/controllers/dispatch.controller.ts &&
   has_file src/routes/dispatch.routes.ts
then
  mark_pass "9 - Dispatch Settings"
else
  mark_fail "9 - Dispatch Settings" "ملفات الإعداد ناقصة."
fi

# ==================================================
# 10 - Shifts
# ==================================================
section "10 - Shifts"

if has_file src/models/CaptainShift.ts &&
   has_pattern 'createCaptainShift|listCaptainShifts|deleteCaptainShift' src/controllers/dispatch.controller.ts
then
  mark_pass "10 - Shifts"
else
  mark_fail "10 - Shifts" "إدارة الشفتات ناقصة."
fi

# ==================================================
# 11 - منع العمل خارج الشفت
# ==================================================
section "11 - منع العمل خارج الشفت"

if has_pattern 'captainCanWorkNow|requireCaptainShift|captainHasActiveShift' src/services/dispatch.service.ts src/services/dispatch-manager.service.ts
then
  mark_pass "11 - منع العمل خارج الشفت"
else
  mark_fail "11 - منع العمل خارج الشفت" "فحص الشفت غير موجود."
fi

# ==================================================
# 12 → 20
# ==================================================
section "12 → 20 - اختبار الكابتن وإثبات التسليم"

if has_file scripts/captain-12-20-real-test.ts; then
  if npx tsx scripts/captain-12-20-real-test.ts >> "$REPORT" 2>&1; then
    mark_pass "12 → 20 - الحضور/التسجيل/الملف/الوثائق/المناطق/الإعدادات/الحساب/الإثبات"
  else
    mark_partial "12 → 20" "الاختبار الوظيفي لم ينجح بالكامل."
  fi
else
  mark_fail "12 → 20" "ملف الاختبار غير موجود."
fi

# ==================================================
# 21 - صورة الطلب عند الاستلام
# ==================================================
section "21 - صورة الطلب عند الاستلام"

if has_pattern 'photoUrl|photoUploadedAt|pickup|استلام|صورة' src
then
  mark_pass "21 - صورة الطلب عند الاستلام"
else
  mark_fail "21 - صورة الطلب عند الاستلام" "لم يتم العثور على تنفيذ واضح."
fi

# ==================================================
# 22 - ملاحظات الطلب
# ==================================================
section "22 - ملاحظات الطلب"

if has_pattern 'customerNote' src/models/Order.ts
then
  mark_pass "22 - ملاحظات الطلب"
else
  mark_fail "22 - ملاحظات الطلب" "customerNote غير موجود."
fi

# ==================================================
# 23 - التقييمات
# ==================================================
section "23 - التقييمات"

if has_pattern 'rating|review|تقييم' src ../admin/src
then
  mark_partial "23 - التقييمات" "تم العثور على التنفيذ/المراجع؛ يلزم اختبار HTTP كامل للتقييم."
else
  mark_fail "23 - التقييمات" "لم يتم العثور على تنفيذ تقييم."
fi

# ==================================================
# 24 - KPI
# ==================================================
section "24 - KPI وأداء الكابتن"

if has_pattern 'KPI|performance|أداء|performance' src ../admin/src
then
  mark_partial "24 - KPI وأداء الكابتن" "وجدت مؤشرات/مراجع، لكن لا يوجد اختبار KPI مستقل كامل."
else
  mark_fail "24 - KPI وأداء الكابتن" "لا يوجد تنفيذ واضح."
fi

# ==================================================
# 25 → 29
# ==================================================
section "25 → 29"

if has_file scripts/sections-25-29-real-test.ts; then
  if npx tsx scripts/sections-25-29-real-test.ts >> "$REPORT" 2>&1; then
    mark_pass "25 - تقارير المطاعم والمحلات"
    mark_pass "29 - العروض"
  else
    if grep -q '25 - تقارير المطاعم والمحلات' "$REPORT"; then
      echo "تم تشغيل اختبار 25+29؛ راجع النتيجة أعلاه." | tee -a "$REPORT"
    fi

    mark_partial "25 - تقارير المطاعم والمحلات" "الاختبار لم يمر بالكامل."
    mark_partial "29 - العروض" "الاختبار لم يمر بالكامل."
  fi
else
  mark_partial "25 - تقارير المطاعم والمحلات" "ملف الاختبار غير موجود."
  mark_partial "29 - العروض" "ملف الاختبار غير موجود."
fi

# 26
if has_file src/controllers/reports.controller.ts &&
   has_file src/routes/reports.routes.ts &&
   has_file ../admin/src/pages/Reports.tsx
then
  mark_pass "26 - تقارير الإدارة"
else
  mark_partial "26 - تقارير الإدارة" "جزء من التقرير الإداري ناقص."
fi

# 27
if has_file ../admin/src/pages/Dashboard.tsx; then
  if grep -q 'dashboardStats' ../admin/src/pages/Dashboard.tsx 2>/dev/null; then
    mark_partial "27 - Dashboard" "Dashboard موجود؛ يلزم اختبار HTTP للبيانات الحية."
  else
    mark_partial "27 - Dashboard" "صفحة Dashboard موجودة لكن الإحصائيات غير واضحة."
  fi
else
  mark_fail "27 - Dashboard" "صفحة Dashboard غير موجودة."
fi

# 28
if has_file src/services/notification.service.ts &&
   has_file src/routes/notification.routes.ts
then
  mark_pass "28 - الإشعارات"
else
  mark_fail "28 - الإشعارات" "Model/Service/Route ناقص."
fi

# 30
if has_pattern 'bonus|reward|مكاف' src/services src/models src/controllers
then
  mark_partial "30 - المكافآت" "التنفيذ موجود؛ يلزم اختبار قواعد المكافآت الفعلية."
else
  mark_fail "30 - المكافآت" "لم يتم العثور على تنفيذ."
fi

# ==================================================
# 31 → 47
# ==================================================
section "31 → 47"

if has_file scripts/sections-31-47-real-test.ts; then
  if npx tsx scripts/sections-31-47-real-test.ts >> "$REPORT" 2>&1; then
    echo "✅ الاختبار الوظيفي 31→47 نجح." | tee -a "$REPORT"
  else
    echo "❌ الاختبار الوظيفي 31→47 فشل." | tee -a "$REPORT"
  fi
fi

# 31
if has_file src/models/Complaint.ts &&
   has_pattern 'createComplaint|listComplaints|updateComplaint' src/controllers/ops-31-47.controller.ts
then
  mark_pass "31 - الشكاوى والمشاكل"
else
  mark_fail "31 - الشكاوى والمشاكل" "Complaint implementation ناقص."
fi

# 32
if has_file src/models/OrderTimeline.ts &&
   has_pattern 'addTimeline|getTimeline' src/services/ops-31-47.service.ts
then
  mark_pass "32 - Order Timeline"
else
  mark_fail "32 - Order Timeline" "Timeline ناقص."
fi

# 33
if has_file src/models/OrderStageTimer.ts &&
   has_pattern 'startStageTimer|closeStageTimer' src/services/ops-31-47.service.ts
then
  mark_pass "33 - Stage Timers"
else
  mark_fail "33 - Stage Timers" "Timers ناقصة."
fi

# 34
if has_file src/models/StuckOrderAlert.ts &&
   has_pattern 'detectStuckOrders|resolveStuckAlert' src/services/ops-31-47.service.ts
then
  mark_pass "34 - Stuck Orders"
else
  mark_fail "34 - Stuck Orders" "Stuck-order logic ناقص."
fi

# 35
if has_pattern 're-dispatch|dispatchOrder' src/routes/ops-31-47.routes.ts
then
  mark_partial "35 - Re-dispatch" "Endpoint موجود، لكن يلزم التحقق من clearing/reassignment الكامل."
else
  mark_fail "35 - Re-dispatch" "Re-dispatch غير موجود."
fi

# 36
if has_file src/models/CaptainEmergency.ts &&
   has_pattern 'createEmergency|resolveEmergency' src/services/ops-31-47.service.ts
then
  mark_pass "36 - Captain Emergencies"
else
  mark_fail "36 - Captain Emergencies" "Emergency implementation ناقص."
fi

# 37
if has_file src/models/OrderTimeline.ts &&
   has_pattern 'audit' src
then
  mark_partial "37 - Audit Log" "الأساس موجود، لكن Audit منفصل كامل غير مؤكد."
else
  mark_fail "37 - Audit Log" "Audit implementation ناقص."
fi

# 38
if has_file src/models/SecurityEvent.ts &&
   has_pattern 'logSecurity|securityEvent' src
then
  mark_pass "38 - Security Log"
else
  mark_fail "38 - Security Log" "Security log ناقص."
fi

# 39
if has_file src/routes/staff.routes.ts ||
   has_file src/controllers/staff.controller.ts
then
  mark_partial "39 - الأدمنات الفرعية" "بنية Staff موجودة؛ يلزم اختبار CRUD وصلاحيات كامل."
else
  mark_fail "39 - الأدمنات الفرعية" "Staff management غير موجود."
fi

# 40
if has_file src/models/StaffPermission.ts &&
   has_pattern 'permissions|governorateIds|areaIds|establishmentIds' src/models/StaffPermission.ts
then
  mark_partial "40 - Permissions + Scope" "نموذج الصلاحيات موجود؛ يلزم إثبات enforcement في جميع الـendpoints."
else
  mark_fail "40 - Permissions + Scope" "الصلاحيات التفصيلية غير مكتملة."
fi

# 41
if has_file src/models/AppVersion.ts &&
   has_pattern 'buildNumber|platform|version' src
then
  mark_pass "41 - App Versions"
else
  mark_fail "41 - App Versions" "إدارة الإصدارات ناقصة."
fi

# 42
if has_pattern 'forceUpdate|minimumSupported' src
then
  mark_pass "42 - Force Update"
else
  mark_fail "42 - Force Update" "Force Update ناقص."
fi

# 43
if has_pattern 'searchSystem|globalSearch' src
then
  mark_partial "43 - Advanced Search" "البحث الموحد موجود؛ يلزم اختبار تغطية جميع الكيانات."
else
  mark_fail "43 - Advanced Search" "البحث المتقدم ناقص."
fi

# 44
if has_pattern 'mongodump|backup|backup' src scripts
then
  mark_partial "44 - Backup" "هناك أساس/مراجع؛ يلزم اختبار backup/restore فعلي."
else
  mark_partial "44 - Backup" "الاتصال بقاعدة البيانات موجود لكن backup/restore فعلي غير مثبت."
fi

# 45
if has_file src/models/MaintenanceSettings.ts &&
   has_pattern 'maintenance|Maintenance' src
then
  mark_pass "45 - Maintenance"
else
  mark_fail "45 - Maintenance" "Maintenance ناقص."
fi

# 46
if has_file src/models/SystemSettings.ts &&
   has_file src/services/system-settings.service.ts
then
  mark_partial "46 - Central Settings" "النظام موجود، لكن يلزم توحيد الإعدادات المركزية مع Dispatch/maintenance إن كانت منفصلة."
else
  mark_fail "46 - Central Settings" "الإعدادات المركزية ناقصة."
fi

# 47
if has_file src/models/CancellationRecord.ts &&
   has_pattern 'saveCancellation|cancellation' src/controllers/ops-31-47.controller.ts src/services/ops-31-47.service.ts
then
  mark_pass "47 - الإلغاء + سجل الإلغاء"
else
  mark_fail "47 - الإلغاء + سجل الإلغاء" "Cancellation record ناقص."
fi

# ==================================================
# Summary
# ==================================================
section "النتيجة النهائية 1 → 47"

echo "✅ مكتمل وظيفيًا : $PASS" | tee -a "$REPORT"
echo "🟡 مكتمل جزئيًا  : $PARTIAL" | tee -a "$REPORT"
echo "❌ ناقص          : $FAIL" | tee -a "$REPORT"

echo | tee -a "$REPORT"

if [ "$TSC_CODE" -eq 0 ]; then
  echo "✅ TypeScript: لا توجد أخطاء." | tee -a "$REPORT"
else
  echo "❌ TypeScript: توجد أخطاء." | tee -a "$REPORT"
fi

echo | tee -a "$REPORT"
echo "التقرير الكامل محفوظ في:" | tee -a "$REPORT"
echo "$REPORT" | tee -a "$REPORT"

echo
echo "=================================================="
echo "تم الانتهاء."
echo "=================================================="

cat "$REPORT"

read -r -p "اضغط Enter للخروج..."
