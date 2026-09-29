#!/usr/bin/env bash

BASE_URL="${BASE_URL:-http://localhost:4000}"

PASS=0
FAIL=0

pass() {
  echo "PASS  $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL  $1"
  FAIL=$((FAIL + 1))
}

echo
echo "========================================"
echo " DZWAN LOCATION TEST"
echo "========================================"

CODE=$(curl -s -o /tmp/dzwan-location-status.json -w "%{http_code}" \
  "$BASE_URL/api/system/status")

if [ "$CODE" = "200" ]; then
  pass "System status"
else
  fail "System status (expected 200, got $CODE)"
fi

rm -f /tmp/dzwan-location-cookie.txt

CODE=$(curl -s -o /tmp/dzwan-location-login.json -w "%{http_code}" \
  -c /tmp/dzwan-location-cookie.txt \
  -H "Content-Type: application/json" \
  -X POST "$BASE_URL/api/auth/login" \
  -d '{"email":"admin@dzwan.local","password":"Dzwan@2026_Admin"}')

if [ "$CODE" = "200" ]; then
  pass "Admin login"
else
  fail "Admin login (expected 200, got $CODE)"
fi

CODE=$(curl -s -o /tmp/dzwan-location-list.json -w "%{http_code}" \
  -b /tmp/dzwan-location-cookie.txt \
  "$BASE_URL/api/locations")

if [ "$CODE" = "200" ]; then
  pass "Locations list"
else
  fail "Locations list (expected 200, got $CODE)"
fi

echo
echo "========================================"
echo " RESULTS"
echo "========================================"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "========================================"

if [ "$FAIL" -eq 0 ]; then
  echo
  echo "✅ LOCATION BASE TEST PASSED"
else
  echo
  echo "❌ LOCATION TEST FAILED"
fi

exit "$FAIL"
