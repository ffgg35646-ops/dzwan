#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:4000/api}"

COOKIE="/tmp/dzwan-extended-admin.txt"
BODY="/tmp/dzwan-extended-body.json"

PASS=0
FAIL=0

cleanup() {
  rm -f "$COOKIE" "$BODY"
}

trap cleanup EXIT

pass() {
  PASS=$((PASS + 1))
  echo "PASS  $1"
}

fail() {
  FAIL=$((FAIL + 1))
  echo "FAIL  $1"
  [ -f "$BODY" ] && cat "$BODY" || true
  echo
}

request() {
  curl -sS \
    -o "$BODY" \
    -w "%{http_code}" \
    "$@"
}

expect() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    pass "$name"
  else
    fail "$name (expected $expected, got $actual)"
  fi
}

echo
echo "========================================"
echo " DZWAN EXTENDED API TEST"
echo "========================================"
echo

# Health
status=$(request "$BASE_URL/health")
expect "Health" "200" "$status"

# Login
status=$(curl -sS \
  -c "$COOKIE" \
  -o "$BODY" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"email":"admin@dzwan.local","password":"Dzwan@2026_Admin"}' \
  "$BASE_URL/auth/login")

expect "Admin login" "200" "$status"

# Me
status=$(request \
  -b "$COOKIE" \
  "$BASE_URL/auth/me")

expect "Admin me" "200" "$status"

# Refresh
status=$(request \
  -b "$COOKIE" \
  -X POST \
  "$BASE_URL/auth/refresh")

expect "Refresh" "200" "$status"

# Notifications
status=$(request \
  -b "$COOKIE" \
  "$BASE_URL/notifications?limit=100")

expect "Notifications list" "200" "$status"

# System status
status=$(request \
  -b "$COOKIE" \
  "$BASE_URL/system/status")

expect "System status" "200" "$status"

# Unknown route JSON
status=$(request \
  "$BASE_URL/route-does-not-exist")

expect "Unknown route" "404" "$status"

# Invalid ObjectId
status=$(request \
  -b "$COOKIE" \
  "$BASE_URL/orders/not-an-object-id")

expect "Invalid ObjectId" "400" "$status"

# Malformed JSON
status=$(request \
  -b "$COOKIE" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{' \
  "$BASE_URL/products")

expect "Malformed JSON" "400" "$status"

# Invalid credentials
status=$(request \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"email":"admin@dzwan.local","password":"wrong-password"}' \
  "$BASE_URL/auth/login")

expect "Invalid password" "401" "$status"

# No auth
status=$(request \
  "$BASE_URL/users")

expect "Protected endpoint without auth" "401" "$status"

# Rate limit smoke test
for i in 1 2 3 4 5 6 7 8 9 10 11; do
  request \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"email":"rate-limit-test@dzwan.local","password":"wrong"}' \
    "$BASE_URL/auth/login" >/dev/null
done

status=$(request \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"email":"rate-limit-test@dzwan.local","password":"wrong"}' \
  "$BASE_URL/auth/login")

if [ "$status" = "429" ]; then
  pass "Login rate limit"
else
  fail "Login rate limit (expected 429, got $status)"
fi

echo
echo "========================================"
echo " RESULTS"
echo "========================================"
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "========================================"
echo

if [ "$FAIL" -ne 0 ]; then
  echo "EXTENDED TEST SUITE FAILED"
  exit 1
fi

echo "EXTENDED TEST SUITE PASSED"
