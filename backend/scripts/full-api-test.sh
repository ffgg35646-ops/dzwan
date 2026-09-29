#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:4000/api}"

ADMIN_COOKIE="/tmp/dzwan-test-admin.txt"
OWNER_COOKIE="/tmp/dzwan-test-owner.txt"
CUSTOMER_COOKIE="/tmp/dzwan-test-customer.txt"
CAPTAIN_COOKIE="/tmp/dzwan-test-captain.txt"

ADMIN_EMAIL="admin@dzwan.local"
ADMIN_PASSWORD="Dzwan@2026_Admin"

OWNER_EMAIL="owner-test@dzwan.local"
OWNER_PASSWORD="OwnerTest123!"

CUSTOMER_EMAIL="customer-test@dzwan.local"
CUSTOMER_PASSWORD="CustomerTest123!"

CAPTAIN_EMAIL="captain-test@dzwan.local"
CAPTAIN_PASSWORD="CaptainTest123!"

ESTABLISHMENT_ID="6a96e60b688a25a312eb163f"
PRODUCT_ID="6a96e91b623c2663e257c378"
CUSTOMER_ID="6a96e8e2623c2663e257c375"
ADDRESS_ID="6a96e8fa623c2663e257c377"
CAPTAIN_ID="6a96e69315fa84ffc80e7708"
EXISTING_ORDER_ID="6a96e94a623c2663e257c379"

BODY="/tmp/dzwan-test-body.json"

PASS_COUNT=0
FAIL_COUNT=0

cleanup() {
  rm -f \
    "$ADMIN_COOKIE" \
    "$OWNER_COOKIE" \
    "$CUSTOMER_COOKIE" \
    "$CAPTAIN_COOKIE" \
    "$BODY"
}

trap cleanup EXIT

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "PASS  $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "FAIL  $1"
}

expect_status() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    pass "$name"
  else
    fail "$name (expected $expected, got $actual)"
    echo "Response:"
    cat "$BODY" 2>/dev/null || true
    echo
  fi
}

json_success_check() {
  python3 - <<'PYJSON'
import json

with open("/tmp/dzwan-test-body.json", encoding="utf-8") as f:
    data = json.load(f)

raise SystemExit(0 if data.get("success") is True else 1)
PYJSON
}

request() {
  curl -sS \
    -o "$BODY" \
    -w "%{http_code}" \
    "$@"
}

echo
echo "========================================"
echo " DZWAN API TEST SUITE"
echo "========================================"
echo

# HEALTH
status=$(request "$BASE_URL/health")
expect_status "Health endpoint" "200" "$status"

# ADMIN LOGIN
status=$(curl -sS \
  -c "$ADMIN_COOKIE" \
  -o "$BODY" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE_URL/auth/login")

expect_status "Admin login" "200" "$status"

if json_success_check; then
  pass "Admin login success"
else
  fail "Admin login success"
fi

# ADMIN ME
status=$(request \
  -b "$ADMIN_COOKIE" \
  "$BASE_URL/auth/me")

expect_status "Admin /me" "200" "$status"

# ADMIN REFRESH
status=$(request \
  -b "$ADMIN_COOKIE" \
  -X POST \
  "$BASE_URL/auth/refresh")

expect_status "Admin refresh" "200" "$status"

# WRONG PASSWORD
status=$(request \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"WRONG_PASSWORD\"}" \
  "$BASE_URL/auth/login")

expect_status "Wrong password" "401" "$status"

# NO AUTH
status=$(request "$BASE_URL/leaders")
expect_status "Protected endpoint without auth" "401" "$status"

# OWNER LOGIN
status=$(curl -sS \
  -c "$OWNER_COOKIE" \
  -o "$BODY" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"email\":\"$OWNER_EMAIL\",\"password\":\"$OWNER_PASSWORD\"}" \
  "$BASE_URL/auth/login")

expect_status "Shop owner login" "200" "$status"

# CUSTOMER LOGIN
status=$(curl -sS \
  -c "$CUSTOMER_COOKIE" \
  -o "$BODY" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"email\":\"$CUSTOMER_EMAIL\",\"password\":\"$CUSTOMER_PASSWORD\"}" \
  "$BASE_URL/auth/login")

expect_status "Customer login" "200" "$status"

# CAPTAIN LOGIN
status=$(curl -sS \
  -c "$CAPTAIN_COOKIE" \
  -o "$BODY" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{\"email\":\"$CAPTAIN_EMAIL\",\"password\":\"$CAPTAIN_PASSWORD\"}" \
  "$BASE_URL/auth/login")

expect_status "Captain login" "200" "$status"

# PERMISSIONS
status=$(request \
  -b "$OWNER_COOKIE" \
  "$BASE_URL/leaders")
expect_status "Shop cannot manage leaders" "403" "$status"

status=$(request \
  -b "$CUSTOMER_COOKIE" \
  "$BASE_URL/users")
expect_status "Customer cannot manage users" "403" "$status"

status=$(request \
  -b "$CUSTOMER_COOKIE" \
  "$BASE_URL/leaders")
expect_status "Customer cannot manage leaders" "403" "$status"

# ADMIN GET APIS
for endpoint in \
  "/users" \
  "/captains" \
  "/leaders" \
  "/establishments" \
  "/customers" \
  "/orders"
do
  status=$(request \
    -b "$ADMIN_COOKIE" \
    "$BASE_URL$endpoint")

  expect_status "Admin GET $endpoint" "200" "$status"
done

# PRODUCTS
status=$(request \
  -b "$ADMIN_COOKIE" \
  "$BASE_URL/products?establishmentId=$ESTABLISHMENT_ID")

expect_status "Products list" "200" "$status"

# INVALID PRODUCT ESTABLISHMENT
status=$(request \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "establishmentId":"000000000000000000000000",
    "name":"اختبار",
    "price":10
  }' \
  "$BASE_URL/products")

expect_status "Invalid establishment rejected" "404" "$status"

# CUSTOMER ADDRESSES
status=$(request \
  -b "$ADMIN_COOKIE" \
  "$BASE_URL/customers/$CUSTOMER_ID/addresses")

expect_status "Customer addresses" "200" "$status"

# INVALID AREA
status=$(request \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{
    "governorateId":"6a9457bfaac212107823492c",
    "areaId":"000000000000000000000000",
    "label":"خطأ",
    "address":"عنوان خطأ"
  }' \
  "$BASE_URL/customers/$CUSTOMER_ID/addresses")

expect_status "Invalid area rejected" "400" "$status"

# EXISTING ORDER
status=$(request \
  -b "$ADMIN_COOKIE" \
  "$BASE_URL/orders/$EXISTING_ORDER_ID")

expect_status "Get existing order" "200" "$status"

status=$(request \
  -b "$CUSTOMER_COOKIE" \
  "$BASE_URL/orders/$EXISTING_ORDER_ID")

expect_status "Customer gets own order" "200" "$status"

# CREATE FRESH ORDER
status=$(curl -sS \
  -b "$CUSTOMER_COOKIE" \
  -o "$BODY" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d "{
    \"customerId\":\"$CUSTOMER_ID\",
    \"establishmentId\":\"$ESTABLISHMENT_ID\",
    \"addressId\":\"$ADDRESS_ID\",
    \"items\":[
      {
        \"productId\":\"$PRODUCT_ID\",
        \"quantity\":1
      }
    ],
    \"deliveryFee\":20,
    \"customerNote\":\"اختبار آلي\"
  }" \
  "$BASE_URL/orders")

expect_status "Create fresh order" "201" "$status"

TEST_ORDER_ID="$(
  python3 - <<'PYJSON'
import json

with open("/tmp/dzwan-test-body.json", encoding="utf-8") as f:
    data = json.load(f)

print(data.get("order", {}).get("_id", ""))
PYJSON
)"

if [ -n "$TEST_ORDER_ID" ]; then
  pass "Fresh order has ID"
else
  fail "Fresh order has ID"
fi

if [ -n "$TEST_ORDER_ID" ]; then

  # CUSTOMER CANNOT CONFIRM
  status=$(request \
    -b "$CUSTOMER_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"confirmed"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Customer cannot confirm order" "403" "$status"

  # SHOP CONFIRM
  status=$(request \
    -b "$OWNER_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"confirmed"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Shop confirms order" "200" "$status"

  # SHOP PREPARE
  status=$(request \
    -b "$OWNER_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"preparing"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Shop starts preparing" "200" "$status"

  # SHOP READY
  status=$(request \
    -b "$OWNER_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"ready_for_pickup"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Shop marks ready" "200" "$status"

  # SHOP CANNOT PICK UP
  status=$(request \
    -b "$OWNER_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"picked_up"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Shop cannot pick up order" "403" "$status"

  # ASSIGN CAPTAIN
  status=$(request \
    -b "$OWNER_COOKIE" \
    -H "Content-Type: application/json" \
    -X POST \
    -d "{\"captainId\":\"$CAPTAIN_ID\"}" \
    "$BASE_URL/orders/$TEST_ORDER_ID/assign-captain")

  expect_status "Assign valid captain" "200" "$status"

  # CAPTAIN PICKUP
  status=$(request \
    -b "$CAPTAIN_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"picked_up"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Captain picks up" "200" "$status"

  # CAPTAIN ON THE WAY
  status=$(request \
    -b "$CAPTAIN_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"on_the_way"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Captain on the way" "200" "$status"

  # CAPTAIN DELIVERED
  status=$(request \
    -b "$CAPTAIN_COOKIE" \
    -H "Content-Type: application/json" \
    -X PATCH \
    -d '{"status":"delivered"}' \
    "$BASE_URL/orders/$TEST_ORDER_ID/status")

  expect_status "Captain delivers" "200" "$status"

  # FINAL ORDER READ
  status=$(request \
    -b "$ADMIN_COOKIE" \
    "$BASE_URL/orders/$TEST_ORDER_ID")

  expect_status "Get completed test order" "200" "$status"
fi

# INVALID API ROUTE
status=$(request \
  -b "$ADMIN_COOKIE" \
  "$BASE_URL/route-that-does-not-exist")

expect_status "Unknown API route" "404" "$status"

# MALFORMED JSON
status=$(request \
  -b "$ADMIN_COOKIE" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{' \
  "$BASE_URL/products")

expect_status "Malformed JSON" "400" "$status"

echo
echo "========================================"
echo " TEST RESULTS"
echo "========================================"
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
echo "========================================"
echo

if [ "$FAIL_COUNT" -ne 0 ]; then
  echo "TEST SUITE FAILED"
  exit 1
fi

echo "ALL API TESTS PASSED"
