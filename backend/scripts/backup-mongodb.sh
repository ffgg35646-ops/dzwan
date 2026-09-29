#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f ".env.local" ]; then
  set -a
  . ".env.local"
  set +a
fi

URI="${MONGODB_URI:-${MONGO_URI:-}}"

if [ -z "$URI" ]; then
  echo "❌ MONGODB_URI غير موجود."
  exit 1
fi

STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
DIR="${BACKUP_DIR:-./backups}/$STAMP"

mkdir -p "$DIR"

echo "========================================"
echo "MongoDB Backup"
echo "========================================"
echo "المجلد: $DIR"

mongodump \
  --uri="$URI" \
  --out="$DIR"

echo
echo "✅ تم إنشاء النسخة الاحتياطية."
