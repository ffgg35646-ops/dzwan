#!/usr/bin/env bash

set -u

PASS=0
FAIL=0

run_test() {
  local title="$1"
  local command="$2"
  local output_file="$3"

  echo
  echo "============================================================"
  echo "$title"
  echo "============================================================"

  if bash -lc "$command" 2>&1 | tee "$output_file"; then
    echo "✅ COMMAND OK: $title"
    PASS=$((PASS + 1))
  else
    echo "❌ COMMAND FAILED: $title"
    FAIL=$((FAIL + 1))
  fi
}

rm -f /tmp/dzwan-r9-full-order.log
rm -f /tmp/dzwan-r9-smart.log

# ------------------------------------------------------------
# TEST 1
# Full order lifecycle:
# create → dispatch → accept → heading_to_shop
# → arrived_at_shop → picked_up → on_the_way
# → OTP → delivered → completed
# ------------------------------------------------------------

run_test \
  "TEST 1 — FULL ORDER LIFECYCLE" \
  "timeout 120s npx tsx scripts/full-order-flow-test.ts" \
  "/tmp/dzwan-r9-full-order.log"

# ------------------------------------------------------------
# TEST 2
# Smart dispatch:
# best captain → timeout → next captain
# → concurrent two-captain acceptance
# ------------------------------------------------------------

run_test \
  "TEST 2 — SMART DISPATCH + CONCURRENT ACCEPT" \
  "timeout 120s npx tsx scripts/smart-dispatch-test.ts" \
  "/tmp/dzwan-r9-smart.log"

echo
echo "============================================================"
echo "VERIFYING REQUIRED RESULTS"
echo "============================================================"

# ---------- Full lifecycle checks ----------

check_full() {
  local pattern="$1"
  local label="$2"

  if grep -Fq "$pattern" /tmp/dzwan-r9-full-order.log; then
    echo "✅ $label"
    PASS=$((PASS + 1))
  else
    echo "❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

check_full "heading_to_shop" \
  "heading_to_shop موجود"

check_full "arrived_at_shop" \
  "arrived_at_shop موجود"

check_full "picked_up" \
  "picked_up موجود"

check_full "on_the_way" \
  "on_the_way موجود"

check_full "delivered" \
  "delivered موجود"

check_full "completed" \
  "completed موجود"

# ---------- Smart dispatch checks ----------

check_smart() {
  local pattern="$1"
  local label="$2"

  if grep -Fq "$pattern" /tmp/dzwan-r9-smart.log; then
    echo "✅ $label"
    PASS=$((PASS + 1))
  else
    echo "❌ $label"
    FAIL=$((FAIL + 1))
  fi
}

check_smart "اختيار الكابتن الأقرب/الأفضل نجح" \
  "اختيار أفضل كابتن"

check_smart "انتقال الطلب للكابتن التالي بعد انتهاء المهلة نجح" \
  "إعادة التوزيع بعد انتهاء المهلة"

check_smart "منع كابتنين من قبول نفس الطلب نجح" \
  "منع الاستلام المزدوج"

check_smart "{ fulfilled: 1, rejected: 1 }" \
  "واحد فقط نجح في الاستلام المتزامن"

# ---------- Final result ----------

echo
echo "============================================================"
echo "FINAL REQUIREMENT #9 RESULT"
echo "============================================================"

echo "PASS = $PASS"
echo "FAIL = $FAIL"

if [ "$FAIL" -eq 0 ]; then
  echo
  echo "🎉 REQUIREMENT #9 BACKEND TEST = PASSED"
  echo
  echo "✅ Full order lifecycle"
  echo "✅ Restaurant → Captain flow"
  echo "✅ Captain arrival"
  echo "✅ Pickup"
  echo "✅ Customer delivery"
  echo "✅ Completed"
  echo "✅ Smart dispatch"
  echo "✅ Timeout reassignment"
  echo "✅ Concurrent accept protection"
  echo
  exit 0
else
  echo
  echo "❌ REQUIREMENT #9 BACKEND TEST = FAILED"
  echo
  exit 1
fi
