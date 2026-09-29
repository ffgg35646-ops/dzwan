#!/usr/bin/env bash
set -u

echo "========================================"
echo "فحص مكونات الأقسام 1 -> 11"
echo "========================================"

files=(
"src/services/core-1-11.service.ts"
"src/services/establishment-access.service.ts"
"src/services/order-intake-1-11.service.ts"
"src/services/order-lifecycle-1-11.service.ts"
"src/services/dispatch-policy-1-11.service.ts"
"src/services/shift-policy-1-11.service.ts"
"src/services/weekly-shift-policy.service.ts"
"src/models/CoreOperationsSettings.ts"
)

failed=0

for f in "${files[@]}"; do
  if [ -f "$f" ]; then
    echo "✅ $f"
  else
    echo "❌ مفقود: $f"
    failed=$((failed+1))
  fi
done

echo
echo "========================================"
echo "TypeScript"
echo "========================================"

npx tsc --noEmit
tsc_code=$?

echo
echo "========================================"

if [ "$failed" -eq 0 ] && [ "$tsc_code" -eq 0 ]; then
  echo "✅ طبقة 1-11 سليمة من ناحية الملفات وTypeScript"
else
  echo "❌ يوجد نقص أو أخطاء TypeScript"
fi

echo "========================================"

read -r -p "اضغط Enter للخروج..."
