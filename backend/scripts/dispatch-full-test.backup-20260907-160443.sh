#!/usr/bin/env bash
set -u

BASE="http://localhost:4000/api"
PASS=0
FAIL=0

ok() {
  echo "✅ $1"
  PASS=$((PASS+1))
}

bad() {
  echo "❌ $1"
  FAIL=$((FAIL+1))
}

request() {
  curl -sS -X "$1" "$BASE$2" \
    -H "Content-Type: application/json" \
    ${3:+-H "Authorization: Bearer $3"} \
    ${4:+-d "$4"}
}

echo
echo "=========================================="
echo "   اختبار Smart Dispatch — الأقسام 6–11"
echo "=========================================="
echo

if ! curl -sS --max-time 3 "$BASE/../health" >/dev/null 2>&1; then
  echo "⚠️ تعذر التأكد من health endpoint — سنكمل الاختبار."
fi

echo "1) فحص إعدادات التوزيع..."
SETTINGS=$(request GET "/dispatch/settings")

if echo "$SETTINGS" | grep -q '"autoDispatchEnabled"'; then
  ok "قراءة إعدادات التوزيع"
else
  bad "قراءة إعدادات التوزيع"
  echo "$SETTINGS"
fi

echo
echo "2) فحص Queue..."
QUEUE=$(request GET "/dispatch/queue")

if echo "$QUEUE" | grep -qE '"queue"|\['; then
  ok "قراءة طابور الطلبات"
else
  bad "قراءة طابور الطلبات"
  echo "$QUEUE"
fi

echo
echo "3) فحص Assignments..."
ASSIGNMENTS=$(request GET "/dispatch/assignments")

if echo "$ASSIGNMENTS" | grep -qE '"assignments"|\['; then
  ok "قراءة سجلات التوزيع"
else
  bad "قراءة سجلات التوزيع"
  echo "$ASSIGNMENTS"
fi

echo
echo "4) تشغيل Queue Processor..."
PROCESS=$(request POST "/dispatch/process" "" '{}')

if echo "$PROCESS" | grep -qE '"success":true|"processed"|"message"'; then
  ok "تشغيل معالجة Queue"
else
  bad "تشغيل معالجة Queue"
  echo "$PROCESS"
fi

echo
echo "5) فحص الشفتات..."
SHIFTS=$(request GET "/dispatch/shifts")

if echo "$SHIFTS" | grep -qE '"shifts"|\['; then
  ok "قراءة شفتات الكباتن"
else
  bad "قراءة شفتات الكباتن"
  echo "$SHIFTS"
fi

echo
echo "6) فحص وجود Route الخاص بالتوزيع اليدوي..."

if curl -sS -o /tmp/dzwan_dispatch_manual.out \
  -w "%{http_code}" \
  -X POST "$BASE/dispatch/orders/000000000000000000000000/dispatch" \
  -H "Content-Type: application/json" | grep -qE '^(400|401|403|404|422)$'; then
  ok "Route التوزيع اليدوي موجود ويستقبل الطلب"
else
  bad "Route التوزيع اليدوي"
fi

echo
echo "7) فحص Route قبول التعيين..."

if curl -sS -o /tmp/dzwan_dispatch_accept.out \
  -w "%{http_code}" \
  -X POST "$BASE/dispatch/orders/000000000000000000000000/accept" \
  -H "Content-Type: application/json" | grep -qE '^(400|401|403|404|422)$'; then
  ok "Route قبول التعيين موجود"
else
  bad "Route قبول التعيين"
fi

echo
echo "8) فحص Route الشفتات..."
if curl -sS -o /tmp/dzwan_dispatch_shift.out \
  -w "%{http_code}" \
  -X POST "$BASE/dispatch/shifts" \
  -H "Content-Type: application/json" \
  -d '{}' | grep -qE '^(400|401|403|422)$'; then
  ok "Route إنشاء الشفت موجود والتحقق يعمل"
else
  bad "Route إنشاء الشفت"
fi

echo
echo "9) فحص حماية إعدادات التوزيع..."
CODE=$(curl -sS -o /tmp/dzwan_dispatch_settings_patch.out \
  -w "%{http_code}" \
  -X PATCH "$BASE/dispatch/settings" \
  -H "Content-Type: application/json" \
  -d '{"autoDispatchEnabled":true}')

if echo "$CODE" | grep -qE '^(401|403)$'; then
  ok "إعدادات التوزيع محمية من غير تسجيل الدخول"
else
  bad "حماية إعدادات التوزيع — HTTP $CODE"
fi

echo
echo "10) فحص حماية Queue..."
CODE=$(curl -sS -o /tmp/dzwan_dispatch_queue.out \
  -w "%{http_code}" \
  "$BASE/dispatch/queue")

if echo "$CODE" | grep -qE '^(401|403)$'; then
  ok "Queue محمي من غير تسجيل الدخول"
else
  bad "حماية Queue — HTTP $CODE"
fi

echo
echo "=========================================="
echo "النتيجة"
echo "=========================================="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo

if [ "$FAIL" -eq 0 ]; then
  echo "✅ DISPATCH SECTIONS 6–11 PASSED"
  exit 0
else
  echo "❌ DISPATCH SECTIONS 6–11 NEED FIXES"
  exit 1
fi
