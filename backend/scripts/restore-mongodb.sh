#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f ".env.local" ]; then
  set -a
  . ".env.local"
  set +a
fi

URI="${MONGODB_URI:-${MONGO_URI:-}}"
BACKUP="${1:-}"

if [ -z "$URI" ]; then
  echo "❌ MONGODB_URI غير موجود."
  exit 1
fi

if [ -z "$BACKUP" ]; then
  echo "الاستخدام:"
  echo "./scripts/restore-mongodb.sh ./backups/YYYY-MM-DD_HH-MM-SS"
  exit 1
fi

if [ ! -d "$BACKUP" ]; then
  echo "❌ مجلد النسخة الاحتياطية غير موجود."
  exit 1
fi

mongorestore \
  --uri="$URI" \
  "$BACKUP"

echo "✅ تم تنفيذ الاسترجاع."
