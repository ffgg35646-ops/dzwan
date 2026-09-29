#!/usr/bin/env bash
set -e

ROOT="$HOME/Downloads/dzwan"
ADMIN="$ROOT/admin"
BACKEND="$ROOT/backend"

# اكتشاف IP الشبكة الحالي تلقائياً
IP=$(ip -4 -o addr show dev eth0 scope global | awk '{
  split($4, a, "/");
  print a[1];
  exit
}')

if [ -z "$IP" ]; then
  echo "لم أستطع اكتشاف IP الشبكة."
  exit 1
fi

echo
echo "======================================"
echo " DZwan Development"
echo " IP: $IP"
echo "======================================"
echo

# تحديث عنوان الـBackend للـAdmin تلقائياً
cat > "$ADMIN/.env.local" <<EOF
VITE_API_URL=http://$IP:4000/api
EOF

echo "API:   http://$IP:4000/api"
echo "ADMIN: http://$IP:5174"
echo

# إيقاف أي خدمة قديمة على نفس البورتين فقط
fuser -k 4000/tcp 2>/dev/null || true
fuser -k 5174/tcp 2>/dev/null || true

sleep 1

# تشغيل Backend
cd "$BACKEND"
npm run dev -- --host 0.0.0.0 > /tmp/dzwan-backend.log 2>&1 &
BACKEND_PID=$!

# انتظار بسيط
sleep 3

# تشغيل Admin
cd "$ADMIN"
npm run dev -- --host 0.0.0.0 --port 5174 > /tmp/dzwan-admin.log 2>&1 &
ADMIN_PID=$!

sleep 3

echo "======================================"
echo " DZwan is running"
echo "======================================"
echo "Admin:   http://$IP:5174"
echo "Backend: http://$IP:4000"
echo
echo "Backend PID: $BACKEND_PID"
echo "Admin PID:   $ADMIN_PID"
echo
echo "Logs:"
echo "  /tmp/dzwan-backend.log"
echo "  /tmp/dzwan-admin.log"
echo
echo "افتح Admin من Windows أو الهاتف:"
echo "http://$IP:5174"
echo "======================================"
echo

wait $BACKEND_PID $ADMIN_PID
