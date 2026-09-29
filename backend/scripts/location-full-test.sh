#!/usr/bin/env bash
set -u

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
echo " DZWAN LOCATION FULL TEST"
echo "========================================"

rm -f \
  /tmp/dzwan-location-cookie.txt \
  /tmp/dzwan-location-status.json \
  /tmp/dzwan-location-login.json \
  /tmp/dzwan-location-list.json \
  /tmp/dzwan-location-disable-gov.json \
  /tmp/dzwan-location-restore-gov.json \
  /tmp/dzwan-location-disable-area.json \
  /tmp/dzwan-location-restore-area.json

echo
echo "[1] فحص الاتصال"

CODE=$(curl -s -o /tmp/dzwan-location-status.json -w "%{http_code}" \
  "$BASE_URL/api/system/status")

if [ "$CODE" = "200" ]; then
  pass "System status"
else
  fail "System status (expected 200, got $CODE)"
  echo "❌ الـBackend غير متاح."
  read -r -p "اضغط Enter للإغلاق..."
  exit 1
fi

echo
echo "[2] تسجيل دخول Super Admin"

CODE=$(curl -s -o /tmp/dzwan-location-login.json -w "%{http_code}" \
  -c /tmp/dzwan-location-cookie.txt \
  -H "Content-Type: application/json" \
  -X POST "$BASE_URL/api/auth/login" \
  -d '{"email":"admin@dzwan.local","password":"Dzwan@2026_Admin"}')

if [ "$CODE" = "200" ]; then
  pass "Admin login"
else
  fail "Admin login (expected 200, got $CODE)"
  cat /tmp/dzwan-location-login.json
  read -r -p "اضغط Enter للإغلاق..."
  exit 1
fi

echo
echo "[3] قراءة المحافظات والمناطق"

CODE=$(curl -s -o /tmp/dzwan-location-list.json -w "%{http_code}" \
  -b /tmp/dzwan-location-cookie.txt \
  "$BASE_URL/api/locations")

if [ "$CODE" = "200" ]; then
  pass "Locations list"
else
  fail "Locations list (expected 200, got $CODE)"
  cat /tmp/dzwan-location-list.json
  read -r -p "اضغط Enter للإغلاق..."
  exit 1
fi

GOV_ID=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-list.json", encoding="utf-8"))
for g in d.get("locations", []):
    if g.get("_id"):
        print(g["_id"])
        break
')

GOV_NAME=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-list.json", encoding="utf-8"))
for g in d.get("locations", []):
    if g.get("_id"):
        print(g.get("name", ""))
        break
')

AREA_ID=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-list.json", encoding="utf-8"))
for g in d.get("locations", []):
    for a in g.get("areas", []):
        if a.get("_id"):
            print(a["_id"])
            break
    else:
        continue
    break
')

AREA_NAME=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-list.json", encoding="utf-8"))
for g in d.get("locations", []):
    for a in g.get("areas", []):
        if a.get("_id"):
            print(a.get("name", ""))
            break
    else:
        continue
    break
')

GOV_ACTIVE=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-list.json", encoding="utf-8"))
for g in d.get("locations", []):
    if g.get("_id"):
        print("true" if g.get("isActive") is True else "false")
        break
')

AREA_ACTIVE=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-list.json", encoding="utf-8"))
for g in d.get("locations", []):
    for a in g.get("areas", []):
        if a.get("_id"):
            print("true" if a.get("isActive") is True else "false")
            raise SystemExit
print("false")
')

if [ -z "$GOV_ID" ] || [ -z "$AREA_ID" ]; then
  fail "Active test data selection"
  echo "❌ لم يتم العثور على محافظة/منطقة للاختبار."
  read -r -p "اضغط Enter للإغلاق..."
  exit 1
fi

echo
echo "المحافظة: $GOV_NAME"
echo "المنطقة: $AREA_NAME"

if [ "$GOV_ACTIVE" = "true" ]; then
  pass "Governorate is active"
else
  fail "Governorate is initially active"
fi

if [ "$AREA_ACTIVE" = "true" ]; then
  pass "Area is active"
else
  fail "Area is initially active"
fi

echo
echo "[4] تعطيل المحافظة"

CODE=$(curl -s -o /tmp/dzwan-location-disable-gov.json -w "%{http_code}" \
  -b /tmp/dzwan-location-cookie.txt \
  -H "Content-Type: application/json" \
  -X PATCH "$BASE_URL/api/locations/$GOV_ID" \
  -d '{"isActive":false}')

if [ "$CODE" = "200" ]; then
  pass "Disable governorate"
else
  fail "Disable governorate (expected 200, got $CODE)"
fi

GOV_DISABLED=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-disable-gov.json", encoding="utf-8"))
x=d.get("location") or d.get("data") or {}
print("true" if x.get("isActive") is False else "false")
')

if [ "$GOV_DISABLED" = "true" ]; then
  pass "Governorate saved inactive"
else
  fail "Governorate inactive verification"
fi

echo
echo "[5] إعادة تفعيل المحافظة"

CODE=$(curl -s -o /tmp/dzwan-location-restore-gov.json -w "%{http_code}" \
  -b /tmp/dzwan-location-cookie.txt \
  -H "Content-Type: application/json" \
  -X PATCH "$BASE_URL/api/locations/$GOV_ID" \
  -d '{"isActive":true}')

if [ "$CODE" = "200" ]; then
  pass "Restore governorate"
else
  fail "Restore governorate (expected 200, got $CODE)"
fi

echo
echo "[6] تعطيل المنطقة"

CODE=$(curl -s -o /tmp/dzwan-location-disable-area.json -w "%{http_code}" \
  -b /tmp/dzwan-location-cookie.txt \
  -H "Content-Type: application/json" \
  -X PATCH "$BASE_URL/api/locations/$GOV_ID/areas/$AREA_ID" \
  -d '{"isActive":false}')

if [ "$CODE" = "200" ]; then
  pass "Disable area"
else
  fail "Disable area (expected 200, got $CODE)"
fi

AREA_DISABLED=$(python3 -c '
import json
d=json.load(open("/tmp/dzwan-location-disable-area.json", encoding="utf-8"))
x=d.get("location") or d.get("data") or {}
target="'"$AREA_ID"'"

for a in x.get("areas", []):
    if str(a.get("_id")) == target:
        print("true" if a.get("isActive") is False else "false")
        break
else:
    print("false")
')

if [ "$AREA_DISABLED" = "true" ]; then
  pass "Area saved inactive"
else
  fail "Area inactive verification"
fi

echo
echo "[7] إعادة تفعيل المنطقة"

CODE=$(curl -s -o /tmp/dzwan-location-restore-area.json -w "%{http_code}" \
  -b /tmp/dzwan-location-cookie.txt \
  -H "Content-Type: application/json" \
  -X PATCH "$BASE_URL/api/locations/$GOV_ID/areas/$AREA_ID" \
  -d '{"isActive":true}')

if [ "$CODE" = "200" ]; then
  pass "Restore area"
else
  fail "Restore area (expected 200, got $CODE)"
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
  echo "✅ LOCATION SECTION PASSED"
  RESULT=0
else
  echo
  echo "❌ LOCATION SECTION FAILED"
  RESULT=1
fi

echo
read -r -p "اضغط Enter للإغلاق..."
exit "$RESULT"
