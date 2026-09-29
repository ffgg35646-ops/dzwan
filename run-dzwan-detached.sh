#!/bin/bash

ROOT="$HOME/Downloads/dzwan"
LOGS="$ROOT/.logs"

mkdir -p "$LOGS"

echo "Starting DZWAN services..."

# Backend
cd "$ROOT/backend"
nohup npm run dev > "$LOGS/backend.log" 2>&1 &
echo $! > "$LOGS/backend.pid"

# Admin
cd "$ROOT/admin"
nohup npm run dev -- --host 0.0.0.0 > "$LOGS/admin.log" 2>&1 &
echo $! > "$LOGS/admin.pid"

# Zajel Web
cd "$ROOT/zajel-app"
nohup npx expo start --web > "$LOGS/zajel-web.log" 2>&1 &
echo $! > "$LOGS/zajel-web.pid"

echo
echo "DZWAN services started in background."
echo
echo "Backend log:    $LOGS/backend.log"
echo "Admin log:      $LOGS/admin.log"
echo "Zajel Web log:  $LOGS/zajel-web.log"
echo
echo "You can close this terminal."
