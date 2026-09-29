#!/usr/bin/env bash
set -u

ROOT="$HOME/Downloads/dzwan"
BACKEND="$ROOT/backend"
ADMIN="$ROOT/admin"
REPORT="$ROOT/final-47-test-report-$(date +%Y%m%d_%H%M%S).log"

PASS=0
FAIL=0
WARN=0

log() {
  echo "$1" | tee -a "$REPORT"
}

pass() {
  PASS=$((PASS+1))
  log "✅ $1"
}

fail() {
  FAIL=$((FAIL+1))
  log "❌ $1"
}

warn() {
  WARN=$((WARN+1))
  log "⚠️ $1"
}

run_check() {
  local title="$1"
  shift

  log ""
  log "=================================================="
  log "$title"
  log "=================================================="

  if "$@" >>"$REPORT" 2>&1; then
    pass "$title"
  else
    fail "$title"
  fi
}

: > "$REPORT"

log "=================================================="
log "دزوان — الاختبار الشامل 1 → 47"
log "=================================================="
log "التاريخ: $(date)"
log "المشروع: $ROOT"

# --------------------------------------------------
# 1. الملفات الأساسية
# --------------------------------------------------

log ""
log "========== 1) التحقق من المشروع =========="

[ -d "$BACKEND" ] && pass "Backend موجود" || fail "Backend غير موجود"
[ -d "$ADMIN" ] && pass "Admin موجود" || fail "Admin غير موجود"

# --------------------------------------------------
# 2. TypeScript
# --------------------------------------------------

cd "$BACKEND" || exit 1

run_check "2) Backend TypeScript" npx tsc --noEmit

cd "$ADMIN" || exit 1

run_check "3) Admin TypeScript" npx tsc --noEmit

cd "$ROOT" || exit 1

# --------------------------------------------------
# 3. تحقق من الملفات المهمة
# --------------------------------------------------

log ""
log "========== 4) متطلبات 1 → 47 =========="

FILES=(
"backend/src/services/strict-shift-enforcement.service.ts"
"backend/src/services/core-order-flow.service.ts"
"backend/src/services/order-intake-1-11.service.ts"
"backend/src/services/order-lifecycle-1-11.service.ts"
"backend/src/services/dispatch-policy-1-11.service.ts"
"backend/src/services/captain-shift-management.service.ts"
"backend/src/services/captain-document-compliance.service.ts"
"backend/src/services/captain-kpi.service.ts"
"backend/src/services/order-cash.service.ts"
"backend/src/services/captain-rating.service.ts"
"backend/src/services/audit-log.service.ts"
"backend/src/services/event-notification.service.ts"
"backend/src/services/order-timeline-30-46.service.ts"
"backend/src/services/requirements-30-46-runtime.service.ts"

"backend/src/models/OrderStageEvent.ts"
"backend/src/models/EmergencyAlert.ts"
"backend/src/models/SystemSecurityLog.ts"
"backend/src/models/AppVersion.ts"
"backend/src/models/CentralOperationSetting.ts"
"backend/src/models/Geofence.ts"

"backend/src/controllers/requirements-11-29.controller.ts"
"backend/src/controllers/requirements-30-46.controller.ts"

"backend/src/routes/requirements-11-29.routes.ts"
"backend/src/routes/requirements-30-46.routes.ts"
)

for f in "${FILES[@]}"; do
  if [ -f "$ROOT/$f" ]; then
    pass "$f"
  else
    fail "$f"
  fi
done

# --------------------------------------------------
# 4. Route registration
# --------------------------------------------------

log ""
log "========== 5) تسجيل Routes =========="

grep -q "requirements-11-29.routes" \
  "$BACKEND/src/server.ts" \
  && pass "Route 11→29 مسجل" \
  || fail "Route 11→29 غير مسجل"

grep -q "requirements-30-46.routes" \
  "$BACKEND/src/server.ts" \
  && pass "Route 30→46 مسجل" \
  || fail "Route 30→46 غير مسجل"

# --------------------------------------------------
# 5. الاختبارات الموجودة مسبقاً
# --------------------------------------------------

cd "$BACKEND"

log ""
log "========== 6) اختبارات المشروع الموجودة =========="

TESTS=(
"scripts/dispatch-real-test.ts"
"scripts/captain-12-20-real-test.ts"
"scripts/missing-features-real-test.ts"
)

for test in "${TESTS[@]}"; do
  if [ -f "$test" ]; then
    log ""
    log "----- تشغيل $test -----"

    if npx tsx "$test" >>"$REPORT" 2>&1; then
      pass "$test"
    else
      fail "$test"
    fi
  else
    warn "غير موجود: $test"
  fi
done

# --------------------------------------------------
# 6. اختبار خدمات 30→46 مباشرة
# --------------------------------------------------

log ""
log "========== 7) اختبار خدمات 30 → 46 =========="

cat > /tmp/dzwan-30-46-service-test.ts <<'TS'
import mongoose from "mongoose";

import {
  versionCheck,
  getCentralSettings,
  maintenanceCheck,
  resolveGeofence,
  getStuckOrders
} from process.cwd() + "/src/services/requirements-30-46-runtime.service.ts";

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!uri) {
    throw new Error("MONGODB_URI/DATABASE_URL غير موجود");
  }

  await mongoose.connect(uri);

  const version = await versionCheck("captain", "0.0.0");
  console.log("VERSION_OK", !!version);

  const settings = await getCentralSettings();
  console.log("SETTINGS_OK", Array.isArray(settings));

  const maintenance = await maintenanceCheck();
  console.log("MAINTENANCE_OK", typeof maintenance.enabled === "boolean");

  const stuck = await getStuckOrders(10);
  console.log("STUCK_OK", Array.isArray(stuck));

  const geo = await resolveGeofence(31.0, 47.0);
  console.log("GEOFENCE_OK", geo === null || typeof geo === "object");

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
TS

if npx tsx /tmp/dzwan-30-46-service-test.ts >>"$REPORT" 2>&1; then
  pass "خدمات 30→46"
else
  fail "خدمات 30→46"
fi

# --------------------------------------------------
# 7. تشغيل السيرفر
# --------------------------------------------------

log ""
log "========== 8) تشغيل Backend API =========="

SERVER_LOG="/tmp/dzwan-backend-final-test.log"

if pgrep -f "tsx.*src/server" >/dev/null 2>&1; then
  warn "Backend يعمل مسبقًا"
else
  npm run dev >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  pass "تم تشغيل Backend PID=$SERVER_PID"

  READY=0

  for i in $(seq 1 30); do
    sleep 1

    if curl -sS --max-time 2 \
      http://localhost:4000/ >/tmp/dzwan-root-response 2>/dev/null; then
      READY=1
      break
    fi

    if curl -sS --max-time 2 \
      http://localhost:4000/api >/tmp/dzwan-api-response 2>/dev/null; then
      READY=1
      break
    fi
  done

  if [ "$READY" -eq 1 ]; then
    pass "Backend API يستجيب"
  else
    warn "لم يتم العثور على endpoint عام للجذر؛ راجع $SERVER_LOG"
  fi
fi

# --------------------------------------------------
# 8. فحص Routes بالـHTTP
# --------------------------------------------------

log ""
log "========== 9) فحص HTTP =========="

HTTP_CODE=$(curl -s -o /tmp/dzwan-health \
  -w "%{http_code}" \
  --max-time 5 \
  http://localhost:4000/api/requirements/maintenance 2>/dev/null || echo "000")

case "$HTTP_CODE" in
  200|401|403)
    pass "Endpoint 30→46 متاح HTTP ($HTTP_CODE)"
    ;;
  *)
    fail "Endpoint 30→46 غير متاح HTTP ($HTTP_CODE)"
    ;;
esac

HTTP_CODE=$(curl -s -o /tmp/dzwan-version \
  -w "%{http_code}" \
  --max-time 5 \
  http://localhost:4000/api/requirements-30-46/versions/captain \
  2>/dev/null || echo "000")

case "$HTTP_CODE" in
  200|400|401|403)
    pass "Version endpoint يعمل ($HTTP_CODE)"
    ;;
  *)
    fail "Version endpoint ($HTTP_CODE)"
    ;;
esac

# --------------------------------------------------
# 9. فحص قاعدة البيانات
# --------------------------------------------------

log ""
log "========== 10) فحص قاعدة البيانات =========="

DB_TEST="$BACKEND/scripts/final-47-db-check.ts"

if [ -f "$DB_TEST" ]; then
  if npx tsx "$DB_TEST" >>"$REPORT" 2>&1; then
    pass "فحص قاعدة البيانات"
  else
    fail "فحص قاعدة البيانات"
  fi
else
  warn "scripts/final-47-db-check.ts غير موجود"
fi

# --------------------------------------------------
# 10. تقرير المتطلبات
# --------------------------------------------------

log ""
log "=================================================="
log "مصفوفة قبول 1 → 47"
log "=================================================="

for i in $(seq 1 47); do
  printf "REQ-%02d | " "$i" | tee -a "$REPORT"

  case "$i" in
    1)  echo "تسجيل الدخول والصلاحيات الأساسية" | tee -a "$REPORT" ;;
    2)  echo "إدارة المستخدمين/الأدوار" | tee -a "$REPORT" ;;
    3)  echo "المحافظات والمناطق" | tee -a "$REPORT" ;;
    4)  echo "المطاعم والمحلات" | tee -a "$REPORT" ;;
    5)  echo "المنتجات والطلبات" | tee -a "$REPORT" ;;
    6)  echo "التسعير" | tee -a "$REPORT" ;;
    7)  echo "التوزيع والكباتن" | tee -a "$REPORT" ;;
    8)  echo "الإشعارات" | tee -a "$REPORT" ;;
    9)  echo "التقارير" | tee -a "$REPORT" ;;
    10) echo "الإعدادات الأساسية" | tee -a "$REPORT" ;;
    11) echo "الـShift Enforcement" | tee -a "$REPORT" ;;
    12) echo "الحضور والانصراف" | tee -a "$REPORT" ;;
    13) echo "تسجيل الكابتن والاعتماد" | tee -a "$REPORT" ;;
    14) echo "ملف الكابتن والإدارة" | tee -a "$REPORT" ;;
    15) echo "مناطق عمل الكابتن" | tee -a "$REPORT" ;;
    16) echo "الحد الأقصى للطلبات النشطة" | tee -a "$REPORT" ;;
    17) echo "التعامل النقدي" | tee -a "$REPORT" ;;
    18) echo "كشف النقدية" | tee -a "$REPORT" ;;
    19) echo "إثبات التسليم" | tee -a "$REPORT" ;;
    20) echo "صورة الاستلام" | tee -a "$REPORT" ;;
    21) echo "ملاحظات الطلب" | tee -a "$REPORT" ;;
    22) echo "التقييم" | tee -a "$REPORT" ;;
    23) echo "KPI" | tee -a "$REPORT" ;;
    24) echo "تقارير المحلات" | tee -a "$REPORT" ;;
    25) echo "تقارير الإدارة" | tee -a "$REPORT" ;;
    26) echo "Dashboard" | tee -a "$REPORT" ;;
    27) echo "Notifications/Event system" | tee -a "$REPORT" ;;
    28) echo "Complaints" | tee -a "$REPORT" ;;
    29) echo "Order Timeline" | tee -a "$REPORT" ;;
    30) echo "Timers" | tee -a "$REPORT" ;;
    31) echo "Stuck Orders" | tee -a "$REPORT" ;;
    32) echo "Reassignment" | tee -a "$REPORT" ;;
    33) echo "Captain Emergency" | tee -a "$REPORT" ;;
    34) echo "Audit Log" | tee -a "$REPORT" ;;
    35) echo "Sub Admins" | tee -a "$REPORT" ;;
    36) echo "Detailed Permissions" | tee -a "$REPORT" ;;
    37) echo "Document Compliance" | tee -a "$REPORT" ;;
    38) echo "App Versions" | tee -a "$REPORT" ;;
    39) echo "Force Update" | tee -a "$REPORT" ;;
    40) echo "Security Logs" | tee -a "$REPORT" ;;
    41) echo "Advanced Search" | tee -a "$REPORT" ;;
    42) echo "Backup" | tee -a "$REPORT" ;;
    43) echo "Maintenance Mode" | tee -a "$REPORT" ;;
    44) echo "Central Settings" | tee -a "$REPORT" ;;
    45) echo "Geofencing" | tee -a "$REPORT" ;;
    46) echo "Cancellation" | tee -a "$REPORT" ;;
    47) echo "Notification/Event automation" | tee -a "$REPORT" ;;
  esac
done

# --------------------------------------------------
# 11. النتيجة
# --------------------------------------------------

log ""
log "=================================================="
log "النتيجة النهائية"
log "=================================================="
log "PASS = $PASS"
log "FAIL = $FAIL"
log "WARN = $WARN"
log ""
log "التقرير: $REPORT"

if [ "$FAIL" -eq 0 ]; then
  log ""
  log "🎉 الفحوصات التي تم تنفيذها نجحت."
  log ""
  log "لكن لا تبدأ بناء التطبيقات اعتمادًا على الملفات فقط:"
  log "يجب أن يكون FAIL=0، ثم نختبر دورة الطلب الحقيقية:"
  log "إنشاء → تعيين → قبول → وصول للمحل → استلام → توصيل → تسليم"
  log "مع Timeline + Timers + Cash + Proof + Rating + Notifications + Audit."
else
  log ""
  log "❌ الاختبار الشامل لم ينجح بعد."
  log "راجع التقرير:"
  log "$REPORT"
fi

log ""
read -r -p "اضغط Enter للخروج..."
